/*

Created by Steve Merschel 2025

Copyright © 2025 PREVENTICUS GmbH

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice,
   this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its contributors
   may be used to endorse or promote products derived from this software without
   specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

*/

import {
  Accelerometer,
  AccelerometerType,
  Color,
  DataPb,
  Electrocardiogram,
  Photoplethysmograph,
  Sensor
} from "@/ProtobufDefinitions"
import { UnixTimestamp } from "@/models/UnixTimestamp"
import { Data } from "@/models/Data"
import { InvalidDataException, WrongValueException } from "@/Exception"
import { TimestampsCompressor } from "@/compress/TimestampsCompressor"

const UINT32_MAX = 4294967295
const MIN_TIMEZONE_OFFSET_MIN = -720
const MAX_TIMEZONE_OFFSET_MIN = 840
const MIN_PHOTOPLETHYSMOGRAPH_WAVELENGTH_NM = 350
const MAX_PHOTOPLETHYSMOGRAPH_WAVELENGTH_NM = 1000
const MAX_ELECTROCARDIOGRAM_CHANNEL = 22

export type SensorType = {
  oneofKind: "photoplethysmograph";
  photoplethysmograph: Photoplethysmograph;
} | {
  oneofKind: "accelerometer";
  accelerometer: Accelerometer;
} | {
  oneofKind: "electrocardiogram";
  electrocardiogram: Electrocardiogram;
} | {
  oneofKind: undefined;
}

/**
 * Utility class for inspecting compressed data without full decompression.
 */
export class Inspector {
  /**
   * Returns the first Unix timestamp in the compressed data.
   * @param dataPb Compressed data protobuf object
   * @returns First Unix timestamp in milliseconds, or 0 if not present
   */
  static getFirstUnixTimestamp(dataPb: DataPb): UnixTimestamp {
    if (dataPb.compressedTimestampsContainer === undefined) {
      return 0
    }
    return dataPb.compressedTimestampsContainer.firstUnixTimestampMs
  }

  /**
   * Returns the last Unix timestamp in the compressed data.
   * @param dataPb Compressed data protobuf object
   * @returns Last Unix timestamp in milliseconds, or 0 if not present
   */
  static getLastUnixTimestamp(dataPb: DataPb): UnixTimestamp {
    if (dataPb.compressedTimestampsContainer === undefined) {
      return 0
    }

    const compressedTimestampsContainer = dataPb.compressedTimestampsContainer
    let lastUnixTimestamp = compressedTimestampsContainer.firstUnixTimestampMs
    for (let i = 1; i < compressedTimestampsContainer.outerSectionsDurationsMs.length; i++) {
      lastUnixTimestamp += compressedTimestampsContainer.outerSectionsDurationsMs[i]
    }

    const size = compressedTimestampsContainer.innerSectionsDurationsMs.length
    lastUnixTimestamp += compressedTimestampsContainer.innerSectionsDurationsMs[size - 1] * (compressedTimestampsContainer.sectionsSizes[size - 1] - 1)
    return lastUnixTimestamp
  }

  /**
   * Returns the number of compressed timestamp sections.
   * @param dataPb Compressed data protobuf object
   * @returns Number of timestamp sections
   */
  static getNumberOfSections(dataPb: DataPb): number {
    if (dataPb.compressedTimestampsContainer === undefined) {
      return 0
    }
    return dataPb.compressedTimestampsContainer.sectionsSizes.length
  }

  /**
   * Returns the number of sensor values (elements) in the compressed data.
   * Uses the first sensor for inspection.
   * @param dataPb Compressed data protobuf object
   * @returns Number of sensor data elements
   */
  static getNumberOfElements(dataPb: DataPb) : number {
    if (dataPb.sensors.length === 0) {
      return 0
    }
    switch (dataPb.sensors[0].values.oneofKind) {
      case "intValuesContainer": {
        return dataPb.sensors[0].values.intValuesContainer.values.length
      }
      case "doubleValuesContainer": {
        return dataPb.sensors[0].values.doubleValuesContainer.values.length
      }
      default: {
        return 0
      }
    }
  }

  /**
   * Returns a list of all containing sensors types in the compressed data.
   * @param dataPb Compressed data protobuf object
   * @returns List of SensorType
   */
  static getSensorTypes(dataPb: DataPb) : SensorType[] {
    return (dataPb.sensors ?? []).map(sensor => sensor.type)
  }

  /**
   * Validates decompressed data before compression.
   *
   * The rules are the compression validation rules of the Pcore specification and are checked
   * in the order given there. In addition, every integer (timestamps, integer values and their
   * differences) must be a safe JavaScript integer (`Number.isSafeInteger`), because this
   * library stores 64-bit integers as `number`.
   *
   * @param data - The `Data` object to validate.
   * @throws {InvalidDataException} If the data is structurally inconsistent.
   * @throws {WrongValueException} If a single value is outside of its allowed range.
   */
  static validateDecompressed(data: Data) {
    const timestamps = data.timestamps
    const numberOfUnixTimestamps = timestamps.length

    // Rule 1: at least one unix timestamp and at least one sensor
    if (numberOfUnixTimestamps === 0 || data.sensors.length === 0) {
      throw new InvalidDataException("Inspector.validateDecompressed", "Data must hold at least one unix timestamp and at least one sensor")
    }

    // Rule 2: every sensor has as many values as there are unix timestamps
    data.sensors.forEach(sensor => {
      if (Inspector.getNumberOfValues(sensor) !== numberOfUnixTimestamps) {
        throw new InvalidDataException("Inspector.validateDecompressed", "Number of unix timestamps should be equal to the number of data points")
      }
    })

    // Rule 3: unix timestamps are strictly increasing
    for (let i = 1; i < numberOfUnixTimestamps; i++) {
      if (!(timestamps[i] > timestamps[i - 1])) {
        throw new InvalidDataException("Inspector.validateDecompressed", "Unix timestamps must be strictly increasing")
      }
    }

    // Rule 4: no unix timestamp is negative (and, JavaScript-specific, every timestamp is a safe integer)
    timestamps.forEach(timestamp => {
      if (timestamp < 0) {
        throw new WrongValueException("Inspector.validateDecompressed", "Unix timestamps must not be negative")
      }
      if (!Number.isSafeInteger(timestamp)) {
        throw new WrongValueException("Inspector.validateDecompressed", "Unix timestamps must be safe integers")
      }
    })

    // Rule 5: every resulting inner and outer section duration fits into uint32
    const sectionIdxs = TimestampsCompressor.findSectionIdxs(timestamps)
    for (let k = 0; k < sectionIdxs.length; k++) {
      const startIdx = sectionIdxs[k]
      const endIdx = k + 1 < sectionIdxs.length ? sectionIdxs[k + 1] : numberOfUnixTimestamps
      const outerSectionDuration = k === 0 ? 0 : timestamps[startIdx] - timestamps[sectionIdxs[k - 1]]
      const innerSectionDuration = endIdx - startIdx > 1 ? timestamps[startIdx + 1] - timestamps[startIdx] : 0
      if (outerSectionDuration > UINT32_MAX || innerSectionDuration > UINT32_MAX) {
        throw new WrongValueException("Inspector.validateDecompressed", "Section durations must fit into uint32")
      }
    }

    // Rule 6: every integer value difference (and the first value) fits into int64.
    // JavaScript-specific: values and differences must be safe integers, which is the stricter limit.
    data.sensors.forEach(sensor => {
      if (sensor.values.oneofKind === "intValuesContainer") {
        const values = sensor.values.intValuesContainer.values
        for (let i = 0; i < values.length; i++) {
          const difference = i === 0 ? values[0] : values[i] - values[i - 1]
          if (!Number.isSafeInteger(values[i]) || !Number.isSafeInteger(difference)) {
            throw new WrongValueException("Inspector.validateDecompressed", "Integer values and their differences must be safe integers")
          }
        }
      }
    })

    // Rule 7: every double value is finite
    data.sensors.forEach(Inspector.checkDoubleValuesFinite)

    // Rule 8: timezone offset is between -720 and 840
    Inspector.checkTimezoneOffset(data.metadata?.timezoneOffsetMin)

    // Rule 9: every sensor has a sensor type set
    data.sensors.forEach(sensor => {
      if (sensor.type.oneofKind === undefined) {
        throw new InvalidDataException("Inspector.validateDecompressed", "Every sensor must be a photoplethysmograph, accelerometer or electrocardiogram")
      }
    })

    // Rule 10: no two sensors have the same identification
    const sensorIdentifications = new Set<string>()
    data.sensors.forEach(sensor => {
      const sensorIdentification = Inspector.getSensorIdentification(sensor)
      if (sensorIdentifications.has(sensorIdentification)) {
        throw new InvalidDataException("Inspector.validateDecompressed", `Sensor identification must be unique: ${sensorIdentification}`)
      }
      sensorIdentifications.add(sensorIdentification)
    })

    // Rule 11: every photoplethysmograph has a light set
    data.sensors.forEach(Inspector.checkPhotoplethysmographLight)

    // Rule 12: every sensor type has allowed values
    data.sensors.forEach(Inspector.checkSensorTypeValues)
  }

  /**
   * Validates compressed data before decompression.
   *
   * The rules are the decompression validation rules of the Pcore specification and are checked
   * in the order given there. Sensor types and the uniqueness of sensor identifications are
   * intentionally not checked, so that files written before the `channel` fields existed can be read.
   * In addition, every decompressed integer (timestamps and integer values) must be a safe
   * JavaScript integer (`Number.isSafeInteger`), because this library stores 64-bit integers as `number`.
   *
   * @param dataPb - The `DataPb` object to validate.
   * @throws {InvalidDataException} If the compressed structure is inconsistent.
   * @throws {WrongValueException} If a single value is outside of its allowed range.
   */
  static validateCompressed(dataPb: DataPb) {
    const compressedTimestampsContainer = dataPb.compressedTimestampsContainer

    // Rule 1: compressed timestamps with at least one section and at least one sensor
    if (compressedTimestampsContainer === undefined || compressedTimestampsContainer.sectionsSizes.length === 0 || dataPb.sensors.length === 0) {
      throw new InvalidDataException("Inspector.validateCompressed", "Data must hold compressed timestamps with at least one section and at least one sensor")
    }

    const outerSectionsDurations = compressedTimestampsContainer.outerSectionsDurationsMs
    const innerSectionsDurations = compressedTimestampsContainer.innerSectionsDurationsMs
    const sectionsSizes = compressedTimestampsContainer.sectionsSizes
    const numberOfSections = sectionsSizes.length

    // Rule 2: the three vectors of the timestamps container have the same length
    if (outerSectionsDurations.length !== numberOfSections || innerSectionsDurations.length !== numberOfSections) {
      throw new InvalidDataException("Inspector.validateCompressed", "Vectors in compressed_timestamps_container must have the same length")
    }

    // Rule 3: every sensor has as many values as the sum of sections_sizes
    let numberOfUnixTimestamps = 0
    sectionsSizes.forEach(sectionSize => {
      numberOfUnixTimestamps += sectionSize
    })
    dataPb.sensors.forEach(sensor => {
      if (Inspector.getNumberOfValues(sensor) !== numberOfUnixTimestamps) {
        throw new InvalidDataException("Inspector.validateCompressed", "Number of unix timestamps should be equal to the number of data points")
      }
    })

    // Rule 4: all sections sizes are greater than 0
    sectionsSizes.forEach(sectionSize => {
      if (!(sectionSize > 0)) {
        throw new InvalidDataException("Inspector.validateCompressed", "Any value in sections_sizes must be greater than 0")
      }
    })

    // Rule 5: the first outer section duration is 0
    if (outerSectionsDurations[0] !== 0) {
      throw new InvalidDataException("Inspector.validateCompressed", "First value in outer_sections_durations_ms must always be 0")
    }

    // Rule 6: sections do not overlap, i.e. every other outer section duration is greater than
    // the duration covered by the previous section
    for (let i = 1; i < numberOfSections; i++) {
      if (!(outerSectionsDurations[i] > (sectionsSizes[i - 1] - 1) * innerSectionsDurations[i - 1])) {
        throw new InvalidDataException("Inspector.validateCompressed", "Sections in compressed_timestamps_container must not overlap")
      }
    }

    // Rule 7: an inner section duration is 0 if and only if its section consists of a single timestamp
    for (let i = 0; i < numberOfSections; i++) {
      if ((innerSectionsDurations[i] === 0) !== (sectionsSizes[i] === 1)) {
        throw new InvalidDataException("Inspector.validateCompressed", "inner_sections_durations_ms must be 0 exactly for sections with a single timestamp")
      }
    }

    // JavaScript-specific: every decompressed unix timestamp is a safe integer.
    // The timestamps are strictly increasing (rules 5 to 7), so checking the first and the last one is sufficient.
    const firstUnixTimestamp = compressedTimestampsContainer.firstUnixTimestampMs
    if (!Number.isSafeInteger(firstUnixTimestamp) || !Number.isSafeInteger(Inspector.getLastUnixTimestamp(dataPb))) {
      throw new WrongValueException("Inspector.validateCompressed", "Decompressed unix timestamps must be safe integers")
    }

    // Rule 8: every decompressed integer value fits into int64.
    // JavaScript-specific: differences and decompressed values must be safe integers, which is the stricter limit.
    dataPb.sensors.forEach(sensor => {
      if (sensor.values.oneofKind === "intValuesContainer") {
        let value = 0
        sensor.values.intValuesContainer.values.forEach(difference => {
          value += difference
          if (!Number.isSafeInteger(difference) || !Number.isSafeInteger(value)) {
            throw new WrongValueException("Inspector.validateCompressed", "Decompressed integer values must be safe integers")
          }
        })
      }
    })

    // Rule 9: every double value is finite
    dataPb.sensors.forEach(Inspector.checkDoubleValuesFinite)

    // Rule 10: timezone offset is between -720 and 840
    Inspector.checkTimezoneOffset(dataPb.metadata?.timezoneOffsetMin)

    // Rule 11: every photoplethysmograph has a light set
    dataPb.sensors.forEach(Inspector.checkPhotoplethysmographLight)

    // Rule 12: every sensor type that is set has allowed values
    dataPb.sensors.forEach(Inspector.checkSensorTypeValues)
  }

  private static getNumberOfValues(sensor: Sensor): number {
    switch (sensor.values.oneofKind) {
      case "intValuesContainer": {
        return sensor.values.intValuesContainer.values.length
      }
      case "doubleValuesContainer": {
        return sensor.values.doubleValuesContainer.values.length
      }
      default: {
        return 0
      }
    }
  }

  private static checkDoubleValuesFinite(sensor: Sensor) {
    if (sensor.values.oneofKind === "doubleValuesContainer") {
      sensor.values.doubleValuesContainer.values.forEach(value => {
        if (!Number.isFinite(value)) {
          throw new WrongValueException("Inspector.checkDoubleValuesFinite", "Double values must be finite")
        }
      })
    }
  }

  private static checkPhotoplethysmographLight(sensor: Sensor) {
    if (sensor.type.oneofKind === "photoplethysmograph" && sensor.type.photoplethysmograph.light.oneofKind === undefined) {
      throw new InvalidDataException("Inspector.checkPhotoplethysmographLight", "Photoplethysmograph light must be color or wavelengthNm")
    }
  }

  /**
   * Checks the allowed values of a sensor type as defined in the section "Allowed sensor values"
   * of the Pcore specification. Sensors without sensor type are not checked.
   */
  private static checkSensorTypeValues(sensor: Sensor) {
    switch (sensor.type.oneofKind) {
      case "photoplethysmograph": {
        const light = sensor.type.photoplethysmograph.light
        if (light.oneofKind === "color" && ![Color.RED, Color.GREEN, Color.BLUE].includes(light.color)) {
          throw new WrongValueException("Inspector.checkSensorTypeValues", "Photoplethysmograph color should be RED, GREEN or BLUE")
        }
        if (light.oneofKind === "wavelengthNm" && (light.wavelengthNm < MIN_PHOTOPLETHYSMOGRAPH_WAVELENGTH_NM || light.wavelengthNm > MAX_PHOTOPLETHYSMOGRAPH_WAVELENGTH_NM)) {
          throw new WrongValueException("Inspector.checkSensorTypeValues", "Photoplethysmograph wavelength should be between 350 and 1000")
        }
        break
      }
      case "accelerometer": {
        if (sensor.type.accelerometer.type === AccelerometerType.UNSPECIFIED) {
          throw new WrongValueException("Inspector.checkSensorTypeValues", "Accelerometer type must not be UNSPECIFIED")
        }
        break
      }
      case "electrocardiogram": {
        if (sensor.type.electrocardiogram.channel > MAX_ELECTROCARDIOGRAM_CHANNEL) {
          throw new WrongValueException("Inspector.checkSensorTypeValues", "Electrocardiogram channel should be smaller or equal to 22")
        }
        break
      }
    }
  }

  private static checkTimezoneOffset(timezoneOffsetMin: number | undefined) {
    if (timezoneOffsetMin === undefined) {
      return
    }
    if (timezoneOffsetMin < MIN_TIMEZONE_OFFSET_MIN || timezoneOffsetMin > MAX_TIMEZONE_OFFSET_MIN) {
      throw new WrongValueException("Inspector.checkTimezoneOffset", "TimezoneOffset must be between -720 and 840")
    }
  }

  /**
   * Returns a key that identifies a sensor by its type message including all of its fields,
   * as defined in the section "Sensor identification" of the Pcore specification.
   */
  private static getSensorIdentification(sensor: Sensor): string {
    switch (sensor.type.oneofKind) {
      case "photoplethysmograph": {
        const photoplethysmograph = sensor.type.photoplethysmograph
        const light = photoplethysmograph.light
        switch (light.oneofKind) {
          case "color": {
            return `photoplethysmograph(color=${light.color}, channel=${photoplethysmograph.channel})`
          }
          case "wavelengthNm": {
            return `photoplethysmograph(wavelengthNm=${light.wavelengthNm}, channel=${photoplethysmograph.channel})`
          }
          default: {
            return `photoplethysmograph(channel=${photoplethysmograph.channel})`
          }
        }
      }
      case "accelerometer": {
        const accelerometer = sensor.type.accelerometer
        return `accelerometer(type=${accelerometer.type}, channel=${accelerometer.channel})`
      }
      case "electrocardiogram": {
        return `electrocardiogram(channel=${sensor.type.electrocardiogram.channel})`
      }
      default: {
        /* istanbul ignore next */
        // unreachable since rule 9 rejects sensors without type before
        return "undefined"
      }
    }
  }
}
