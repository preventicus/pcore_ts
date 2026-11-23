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
  AccelerometerType,
  Color,
  DataPb,
  Metadata,
  Photoplethysmograph,
  Sensor
} from "../../ProtobufDefinitions"
import { DataCompressor } from "../../compress/DataCompressor"
import { Data } from "@/models/Data"
import { DataDecompressor } from "../../decompress/DataDecompressor"
import { DataForm } from "./DataForm"
import { UnixTimestamps } from "../../models/UnixTimestamp"
import { Inspector } from "@tools/inspector/Inspector"
import { InvalidDataException } from "@/Exception"

interface DecompressedSensorWithoutTypeJson {
    valuesType: string,
    values: number[]
}

interface DecompressedPhotoplethysmographSensorJson extends DecompressedSensorWithoutTypeJson {
    photoplethysmograph: {
        wavelengthNm?: number,
        color?: string,
        channel?: number
    }
}

interface DecompressedAccelerometerSensorJson extends DecompressedSensorWithoutTypeJson {
    accelerometer: {
        type: string,
        channel?: number
    }
}

interface DecompressedElectrocardiogramSensorJson extends DecompressedSensorWithoutTypeJson {
    electrocardiogram: {
        channel?: number
    }
}

type DecompressedSensor =
      DecompressedPhotoplethysmographSensorJson
    | DecompressedAccelerometerSensorJson
    | DecompressedElectrocardiogramSensorJson
    | DecompressedSensorWithoutTypeJson

interface DecompressedPcoreJson {
    metadata?: Metadata,
    timestamps: UnixTimestamps,
    sensors: DecompressedSensor[]
}

/**
 * The Converter class provides static methods to convert between
 * compressed Protobuf data (DataPb) and a human-readable JSON format.
 */
export class Converter {
  /**
   * Converts a protobuf data object to a JSON string representation.
   *
   * Depending on the data form, this either returns the raw protobuf object
   * as JSON (compressed), or a human-readable decompressed format.
   *
   * @param dataPb - The protobuf data object to be converted.
   * @param dataForm - Indicates the format of the input data (compressed or decompressed).
   * @param indent - Optional. Number of spaces to use for pretty-printing the output JSON.
   *                 If set to 0 (default), the output will be minified.
   * @returns A JSON string representing the protobuf data.
   * @throws {Error} Throws if decompression or conversion fails, or if unsupported sensor types are encountered.
   */
  static convertToJson(dataPb: DataPb, dataForm: DataForm, indent: number = 0): string {
    switch (dataForm) {
      case DataForm.Compressed: {
        Inspector.validateCompressed(dataPb)
        return JSON.stringify(dataPb, null, indent)
      }
      case DataForm.Decompressed: {
        const data = DataDecompressor.decompress(dataPb) // validation is done in decompress method
        const decompressedPcoreJson: DecompressedPcoreJson = {
          metadata: data.metadata,
          timestamps: data.timestamps,
          sensors: data.sensors.map(Converter.parseToDecompressedSensor)
        }
        return JSON.stringify(decompressedPcoreJson, null, indent)
      }
    }
  }

  /**
     * Converts a JSON string back into a DataPb object.
     * Accepts both compressed and decompressed JSON structures.
     *
     * @param json - The JSON string to convert.
     * @returns A DataPb object reconstructed from the JSON.
     * @throws {Error} Throws if internal parsing fails or unsupported sensor types are encountered.
     */
  static convertFromJson(json: string): DataPb {
    let parsedJson: unknown
    try {
      parsedJson = JSON.parse(json)
    } catch {
      throw new InvalidDataException("Converter.convertFromJson", "json is not valid JSON")
    }
    if (!Converter.isObject(parsedJson)) {
      throw new InvalidDataException("Converter.convertFromJson", "json must be an object")
    }
    if ("compressedTimestampsContainer" in parsedJson) {
      Converter.checkCompressedJsonStructure(parsedJson)
      const dataPb = parsedJson as unknown as DataPb
      Inspector.validateCompressed(dataPb)
      return dataPb
    }
    Converter.checkDecompressedJsonStructure(parsedJson)
    const decompressedPcoreJson = parsedJson as unknown as DecompressedPcoreJson
    const data: Data = {
      metadata: decompressedPcoreJson.metadata,
      timestamps: decompressedPcoreJson.timestamps,
      sensors: decompressedPcoreJson.sensors.map(Converter.parseFromDecompressedSensor)
    }
    return DataCompressor.compress(data) // validation is done in compress method
  }

  /**
     * Converts a Sensor protobuf object into a decompressed JSON representation.
     *
     * Sensors without a sensor type or photoplethysmographs without light can occur in
     * decompressed legacy files; they are written without the missing parts.
     *
     * @param sensor - The Sensor protobuf object.
     * @returns A DecompressedSensor JSON object.
     * @throws {Error} If the value type is unsupported.
     */
  private static parseToDecompressedSensor(sensor: Sensor): DecompressedSensor {
    let values: number[] = []
    switch (sensor.values.oneofKind) {
      case "intValuesContainer": {
        values = sensor.values.intValuesContainer.values
        break
      }
      case "doubleValuesContainer": {
        values = sensor.values.doubleValuesContainer.values
        break
      }
      default: {
        /* istanbul ignore next */
        // currently unreachable code since the validator captures this error before
        throw new Error(`Unsupported sensor value type: ${sensor.values.oneofKind}`)
      }
    }
    const valuesType = sensor.values.oneofKind

    switch (sensor.type.oneofKind) {
      case "accelerometer": {
        return {
          valuesType,
          values,
          accelerometer: {
            type: AccelerometerType[sensor.type.accelerometer.type],
            channel: sensor.type.accelerometer.channel
          }
        } satisfies DecompressedAccelerometerSensorJson
      }
      case "photoplethysmograph": {
        const photoplethysmograph = sensor.type.photoplethysmograph
        const light = photoplethysmograph.light
        return {
          valuesType,
          values,
          photoplethysmograph: {
            ...(light.oneofKind === "wavelengthNm" ? { wavelengthNm: light.wavelengthNm } : {}),
            ...(light.oneofKind === "color" ? { color: Color[light.color] } : {}),
            channel: photoplethysmograph.channel
          }
        } satisfies DecompressedPhotoplethysmographSensorJson
      }
      case "electrocardiogram": {
        return {
          valuesType,
          values,
          electrocardiogram: {
            channel: sensor.type.electrocardiogram.channel
          }
        } satisfies DecompressedElectrocardiogramSensorJson
      }
      default: {
        return { valuesType, values } satisfies DecompressedSensorWithoutTypeJson
      }
    }
  }

  /**
     * Converts a decompressed JSON representation of a sensor back into a Sensor protobuf object.
     *
     * Missing `channel` fields (e.g. in JSON written before they existed) default to 0.
     * A sensor without sensor type is converted as such and rejected by the validation in `DataCompressor.compress`.
     *
     * @param sensor - The decompressed sensor JSON object.
     * @returns A Sensor protobuf object.
     * @throws {Error} If the value type is unsupported.
     */
  private static parseFromDecompressedSensor(sensor: DecompressedSensor): Sensor {
    const values: Sensor["values"] = (() => {
      switch (sensor.valuesType) {
        case "intValuesContainer": {
          return { oneofKind: "intValuesContainer", intValuesContainer: { values: sensor.values } }
        }
        case "doubleValuesContainer": {
          return { oneofKind: "doubleValuesContainer", doubleValuesContainer: { values: sensor.values } }
        }
        default: {
          throw new InvalidDataException("Converter.parseFromDecompressedSensor", `Unsupported sensor value type: ${sensor.valuesType}`)
        }
      }
    })()

    let type: Sensor["type"] = { oneofKind: undefined }
    if ("accelerometer" in sensor) {
      type = {
        oneofKind: "accelerometer",
        accelerometer: {
          type: Converter.parseEnum(AccelerometerType, sensor.accelerometer.type, AccelerometerType.UNSPECIFIED),
          channel: sensor.accelerometer.channel ?? 0
        }
      }
    } else if ("electrocardiogram" in sensor) {
      type = {
        oneofKind: "electrocardiogram",
        electrocardiogram: { channel: sensor.electrocardiogram.channel ?? 0 }
      }
    } else if ("photoplethysmograph" in sensor) {
      const photoplethysmograph = sensor.photoplethysmograph
      let light: Photoplethysmograph["light"] = { oneofKind: undefined }
      if (photoplethysmograph.color !== undefined) {
        light = { oneofKind: "color", color: Converter.parseEnum(Color, photoplethysmograph.color, Color.UNSPECIFIED) }
      } else if (photoplethysmograph.wavelengthNm !== undefined) {
        light = { oneofKind: "wavelengthNm", wavelengthNm: photoplethysmograph.wavelengthNm }
      }
      type = {
        oneofKind: "photoplethysmograph",
        photoplethysmograph: { light, channel: photoplethysmograph.channel ?? 0 }
      }
    }
    return { values, type }
  }

  /**
   * Returns the enum value with the given name, or `unknownValue` if the name is not a member of the enum.
   * Unknown names are therefore rejected by the validation of the allowed sensor values.
   */
  private static parseEnum<T extends number>(enumObject: Record<string, string | number>, name: string, unknownValue: T): T {
    const value = enumObject[name]
    return typeof value === "number" ? value as T : unknownValue
  }

  private static isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
  }

  private static isNumberArray(value: unknown): value is number[] {
    return Array.isArray(value) && value.every(element => typeof element === "number")
  }

  private static isOptional(value: unknown, type: "number" | "string"): boolean {
    return value === undefined || typeof value === type
  }

  /**
   * Checks that compressed JSON has the shape of a `DataPb` object, so that the validation
   * does not fail with a TypeError on malformed input.
   * @throws {InvalidDataException} If the structure does not match.
   */
  private static checkCompressedJsonStructure(json: Record<string, unknown>) {
    const functionName = "Converter.checkCompressedJsonStructure"
    if (json.metadata !== undefined && !Converter.isObject(json.metadata)) {
      throw new InvalidDataException(functionName, "metadata must be an object")
    }
    const container = json.compressedTimestampsContainer
    if (!Converter.isObject(container) ||
      typeof container.firstUnixTimestampMs !== "number" ||
      !Converter.isNumberArray(container.sectionsSizes) ||
      !Converter.isNumberArray(container.innerSectionsDurationsMs) ||
      !Converter.isNumberArray(container.outerSectionsDurationsMs)) {
      throw new InvalidDataException(functionName, "compressedTimestampsContainer must hold firstUnixTimestampMs and three arrays of numbers")
    }
    if (!Array.isArray(json.sensors)) {
      throw new InvalidDataException(functionName, "sensors must be an array")
    }
    json.sensors.forEach(sensor => {
      if (!Converter.isObject(sensor) || !Converter.isObject(sensor.values) || !Converter.isObject(sensor.type)) {
        throw new InvalidDataException(functionName, "every sensor must hold the objects values and type")
      }
      const valuesKind = sensor.values.oneofKind
      if (valuesKind === "intValuesContainer" || valuesKind === "doubleValuesContainer") {
        const valuesContainer = sensor.values[valuesKind]
        if (!Converter.isObject(valuesContainer) || !Converter.isNumberArray(valuesContainer.values)) {
          throw new InvalidDataException(functionName, `${valuesKind} must hold an array of numbers`)
        }
      }
      const typeKind = sensor.type.oneofKind
      if (typeKind === "photoplethysmograph" || typeKind === "accelerometer" || typeKind === "electrocardiogram") {
        const typeMessage = sensor.type[typeKind]
        if (!Converter.isObject(typeMessage) || (typeKind === "photoplethysmograph" && !Converter.isObject(typeMessage.light))) {
          throw new InvalidDataException(functionName, `${typeKind} is malformed`)
        }
      }
    })
  }

  /**
   * Checks that decompressed JSON has the shape written by `convertToJson`, so that the conversion
   * does not fail with a TypeError on malformed input.
   * @throws {InvalidDataException} If the structure does not match.
   */
  private static checkDecompressedJsonStructure(json: Record<string, unknown>) {
    const functionName = "Converter.checkDecompressedJsonStructure"
    if (json.metadata !== undefined && !Converter.isObject(json.metadata)) {
      throw new InvalidDataException(functionName, "metadata must be an object")
    }
    if (!Converter.isNumberArray(json.timestamps)) {
      throw new InvalidDataException(functionName, "timestamps must be an array of numbers")
    }
    if (!Array.isArray(json.sensors)) {
      throw new InvalidDataException(functionName, "sensors must be an array")
    }
    json.sensors.forEach(sensor => {
      if (!Converter.isObject(sensor) || typeof sensor.valuesType !== "string" || !Converter.isNumberArray(sensor.values)) {
        throw new InvalidDataException(functionName, "every sensor must hold valuesType and an array of numbers as values")
      }
      const { photoplethysmograph, accelerometer, electrocardiogram } = sensor
      if (photoplethysmograph !== undefined && (!Converter.isObject(photoplethysmograph) ||
        !Converter.isOptional(photoplethysmograph.color, "string") ||
        !Converter.isOptional(photoplethysmograph.wavelengthNm, "number") ||
        !Converter.isOptional(photoplethysmograph.channel, "number"))) {
        throw new InvalidDataException(functionName, "photoplethysmograph is malformed")
      }
      if (accelerometer !== undefined && (!Converter.isObject(accelerometer) ||
        !Converter.isOptional(accelerometer.type, "string") ||
        !Converter.isOptional(accelerometer.channel, "number"))) {
        throw new InvalidDataException(functionName, "accelerometer is malformed")
      }
      if (electrocardiogram !== undefined && (!Converter.isObject(electrocardiogram) ||
        !Converter.isOptional(electrocardiogram.channel, "number"))) {
        throw new InvalidDataException(functionName, "electrocardiogram is malformed")
      }
    })
  }
}
