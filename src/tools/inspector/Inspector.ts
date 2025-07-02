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

import { DataPb } from "@/ProtobufDefinitions"
import { UnixTimestamp } from "@/models/UnixTimestamp"
import { Data } from "@/models/Data"
import { InvalidDataException } from "@/Exception"

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
   * Validates the consistency of the given `Data` object.
   * Ensures that sensor data and timestamps are aligned and both are present or absent together.
   *
   * @param data - The `Data` object to validate.
   * @throws {InvalidDataException} If the data violates required structural constraints.
   */
  static validateDecompressed(data: Data) {
    // case  data.timestamps.length === 0 && data.sensors.length === 0
    // means data are empty, every thing is fine.

    if (data.timestamps.length === 0 && data.sensors.length !== 0) {
      throw new InvalidDataException("Inspector.validate", "Data must hold unix timestamps if it has sensor data")
    }

    if (data.timestamps.length !== 0 && data.sensors.length === 0) {
      throw new InvalidDataException("Inspector.validate", "Data must have sensor data if it holds unix timestamps")
    }

    if (data.timestamps.length !== 0 && data.sensors.length !== 0) {
      const timestamps = data.timestamps
      const numberOfUnixTimestamps = timestamps.length

      for (let i = 1; i < numberOfUnixTimestamps; i++) {
        if (timestamps[i] - timestamps[i - 1] <= 0) {
          throw new InvalidDataException("Inspector.validate", "Timestamp should be strictly monotonically increasing")
        }
      }

      data.sensors.forEach(sensor => {
        switch (sensor.values.oneofKind) {
          case "intValuesContainer": {
            const values = sensor.values.intValuesContainer.values
            if (values.length !== numberOfUnixTimestamps) {
              throw new InvalidDataException("Inspector.validate", "Number of unix timestamps should be equal to the number of data points")
            }
            break
          }
          case "doubleValuesContainer": {
            const values = sensor.values.doubleValuesContainer.values
            if (values.length !== numberOfUnixTimestamps) {
              throw new InvalidDataException("Inspector::validate", "Number of unix timestamps should be equal to the number of data points")
            }
            break
          }
        }
      })
    }
  }

  /**
   * Validates the internal consistency of the given compressed data object.
   * Ensures that section sizes and durations are structurally valid and match sensor lengths.
   *
   * @param dataPb - The `DataPb` object to validate.
   * @throws {InvalidDataException} If the compressed structure or metadata violates integrity rules.
   */
  static validateCompressed(dataPb: DataPb) {
    if (dataPb.compressedTimestampsContainer !== undefined && dataPb.sensors.length === 0) {
      throw new InvalidDataException("Inspector.validate", "Data must have sensor data if it holds compressed timestamps")
    }

    if (dataPb.compressedTimestampsContainer === undefined && dataPb.sensors.length !== 0) {
      throw new InvalidDataException("Inspector.validate", "Data must hold compressed timestamps if it has sensor data")
    }

    if (dataPb.compressedTimestampsContainer !== undefined && dataPb.sensors.length !== 0) {
      const outerSectionsDurations = dataPb.compressedTimestampsContainer.outerSectionsDurationsMs
      const innerSectionsDurations = dataPb.compressedTimestampsContainer.innerSectionsDurationsMs
      const sectionsSizes = dataPb.compressedTimestampsContainer.sectionsSizes

      const sizeOuter = outerSectionsDurations.length
      const sizeInner = innerSectionsDurations.length
      const sizeSizes = sectionsSizes.length

      if (sizeOuter !== sizeInner || sizeInner !== sizeSizes) {
        throw new InvalidDataException("Inspector.validate", "Vectors in compressed_timestamps_container must have the same length")
      }

      if (sizeSizes === 0) {
        return
      }

      if (outerSectionsDurations[0] !== 0) {
        throw new InvalidDataException("Inspector.validate", "First value in outer_sections_durations_ms must always be 0")
      }
      for (let i = 1; i < sizeSizes; i++) {
        if (outerSectionsDurations[i] === 0) {
          throw new InvalidDataException("Inspector.validate", "Any value in outer_sections_durations_ms in pos >= 1 can not be 0")
        }
      }

      for (let i = 0; i < sizeSizes - 1; i++) {
        if (innerSectionsDurations[i] === 0) {
          throw new InvalidDataException("Inspector.validate", "Any except the last value in inner_sections_durations_ms can not be 0")
        }
      }

      for (let i = 0; i < sizeSizes; i++) {
        if (sectionsSizes[i] === 0) {
          throw new InvalidDataException("Inspector.validate", "Any value in sections_sizes can not be 0")
        }
      }

      let numberOfUnixTimestamps = 0
      for (let i = 0; i < sectionsSizes.length; i++) {
        numberOfUnixTimestamps += sectionsSizes[i]
      }

      if (numberOfUnixTimestamps === 1) {
        if (innerSectionsDurations[0] !== 0) {
          throw new InvalidDataException("Inspector.validate", "inner_sections_durations_ms must equal to 0 if only one unix timestamp is set")
        }
      }

      dataPb.sensors.forEach(sensorPb => {
        if (sensorPb.values.oneofKind === "doubleValuesContainer") {
          if (sensorPb.values.doubleValuesContainer.values.length !== numberOfUnixTimestamps) {
            throw new InvalidDataException("Inspector.validate", "Sensor data must have the same length as unix timestamps")
          }
        }
        if (sensorPb.values.oneofKind === "intValuesContainer") {
          if (sensorPb.values.intValuesContainer.values.length !== numberOfUnixTimestamps) {
            throw new InvalidDataException("Inspector.validate", "Sensor data must have the same length as unix timestamps")
          }
        }
      })
    }
  }
}
