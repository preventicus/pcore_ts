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

import { DataPb, Metadata } from "@/ProtobufDefinitions"
import { InvalidDataException } from "@/Exception"
import { JsonValue } from "@protobuf-ts/runtime"

/**
 * Checks that JSON read by `Converter.convertFromJson` has the shape of the compressed or
 * decompressed Pcore JSON form, before it is used as typed data.
 *
 * This is part of reading the JSON forms of this library, not of the Pcore validation rules,
 * which are checked by `Inspector` on the typed data afterwards.
 */
export class JsonStructure {
  /**
   * Parses a JSON string that must contain an object.
   * @param json - The JSON string.
   * @returns The parsed object.
   * @throws {InvalidDataException} If the string is not valid JSON or not an object.
   */
  static parseObject(json: string): Record<string, unknown> {
    let parsedJson: unknown
    try {
      parsedJson = JSON.parse(json)
    } catch {
      throw new InvalidDataException("JsonStructure.parseObject", "json is not valid JSON")
    }
    if (!JsonStructure.isObject(parsedJson)) {
      throw new InvalidDataException("JsonStructure.parseObject", "json must be an object")
    }
    return parsedJson
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
   * Reads the metadata of compressed or decompressed JSON, which is written the same way in both forms.
   * Missing fields get their default value, e.g. a missing timezone offset becomes 0, and unknown keys are ignored.
   * @param metadata - The value of the `metadata` key.
   * @returns The metadata, or `undefined` if the JSON holds no metadata.
   * @throws {InvalidDataException} If the metadata is not an object or a field has the wrong type.
   */
  static parseMetadata(metadata: unknown): Metadata | undefined {
    if (metadata === undefined) {
      return undefined
    }
    if (!JsonStructure.isObject(metadata)) {
      throw new InvalidDataException("JsonStructure.parseMetadata", "metadata must be an object")
    }
    try {
      return Metadata.fromJson(metadata as JsonValue, { ignoreUnknownFields: true })
    } catch (error) {
      throw new InvalidDataException("JsonStructure.parseMetadata", `metadata is malformed (${String(error)})`)
    }
  }

  /**
   * Converts compressed JSON into a `DataPb` object. Missing fields get their default value,
   * e.g. a `channel` missing in JSON written before the field existed becomes 0, and unknown keys are dropped.
   * @param json - The parsed compressed JSON.
   * @returns The typed data, which still has to be validated by `Inspector.validateCompressed`.
   * @throws {InvalidDataException} If the structure does not match or a field has the wrong type.
   */
  static parseCompressed(json: Record<string, unknown>): DataPb {
    JsonStructure.checkCompressed(json)
    const dataPb = DataPb.create({ ...json, metadata: JsonStructure.parseMetadata(json.metadata) } as unknown as DataPb)
    // the depth is also the number of checked array elements, so the default of 16 would skip the rest of the arrays
    if (!DataPb.is(dataPb, Number.MAX_SAFE_INTEGER)) {
      throw new InvalidDataException("JsonStructure.parseCompressed", "a field of the compressed data has the wrong type")
    }
    return dataPb
  }

  /**
   * Checks that compressed JSON has the containers of a `DataPb` object, so that neither the conversion in
   * `parseCompressed` nor the validation in `Inspector` fails with a TypeError on malformed input.
   * @throws {InvalidDataException} If the structure does not match.
   */
  private static checkCompressed(json: Record<string, unknown>) {
    const functionName = "JsonStructure.checkCompressed"
    const container = json.compressedTimestampsContainer
    if (!JsonStructure.isObject(container) ||
      typeof container.firstUnixTimestampMs !== "number" ||
      !JsonStructure.isNumberArray(container.sectionsSizes) ||
      !JsonStructure.isNumberArray(container.innerSectionsDurationsMs) ||
      !JsonStructure.isNumberArray(container.outerSectionsDurationsMs)) {
      throw new InvalidDataException(functionName, "compressedTimestampsContainer must hold firstUnixTimestampMs and three arrays of numbers")
    }
    if (!Array.isArray(json.sensors)) {
      throw new InvalidDataException(functionName, "sensors must be an array")
    }
    json.sensors.forEach(sensor => {
      if (!JsonStructure.isObject(sensor) || !JsonStructure.isObject(sensor.values) || !JsonStructure.isObject(sensor.type)) {
        throw new InvalidDataException(functionName, "every sensor must hold the objects values and type")
      }
      const valuesKind = sensor.values.oneofKind
      if (valuesKind === "intValuesContainer" || valuesKind === "doubleValuesContainer") {
        const valuesContainer = sensor.values[valuesKind]
        if (!JsonStructure.isObject(valuesContainer) || !JsonStructure.isNumberArray(valuesContainer.values)) {
          throw new InvalidDataException(functionName, `${valuesKind} must hold an array of numbers`)
        }
      }
      const typeKind = sensor.type.oneofKind
      if (typeKind === "photoplethysmograph" || typeKind === "accelerometer" || typeKind === "electrocardiogram") {
        const typeMessage = sensor.type[typeKind]
        if (!JsonStructure.isObject(typeMessage) || (typeKind === "photoplethysmograph" && !JsonStructure.isObject(typeMessage.light))) {
          throw new InvalidDataException(functionName, `${typeKind} is malformed`)
        }
      }
    })
  }

  /**
   * Checks that the timestamps and sensors of decompressed JSON have the shape written by `convertToJson`,
   * so that the conversion does not fail with a TypeError on malformed input. The metadata is read by `parseMetadata`.
   * @throws {InvalidDataException} If the structure does not match.
   */
  static checkDecompressed(json: Record<string, unknown>) {
    const functionName = "JsonStructure.checkDecompressed"
    if (!JsonStructure.isNumberArray(json.timestamps)) {
      throw new InvalidDataException(functionName, "timestamps must be an array of numbers")
    }
    if (!Array.isArray(json.sensors)) {
      throw new InvalidDataException(functionName, "sensors must be an array")
    }
    json.sensors.forEach(sensor => {
      if (!JsonStructure.isObject(sensor) || typeof sensor.valuesType !== "string" || !JsonStructure.isNumberArray(sensor.values)) {
        throw new InvalidDataException(functionName, "every sensor must hold valuesType and an array of numbers as values")
      }
      const { photoplethysmograph, accelerometer, electrocardiogram } = sensor
      if ([photoplethysmograph, accelerometer, electrocardiogram].filter(type => type !== undefined).length > 1) {
        throw new InvalidDataException(functionName, "a sensor must not hold more than one sensor type")
      }
      if (photoplethysmograph !== undefined && (!JsonStructure.isObject(photoplethysmograph) ||
        !JsonStructure.isOptional(photoplethysmograph.color, "string") ||
        !JsonStructure.isOptional(photoplethysmograph.wavelengthNm, "number") ||
        !JsonStructure.isOptional(photoplethysmograph.channel, "number"))) {
        throw new InvalidDataException(functionName, "photoplethysmograph is malformed")
      }
      if (photoplethysmograph?.color !== undefined && photoplethysmograph.wavelengthNm !== undefined) {
        throw new InvalidDataException(functionName, "photoplethysmograph must not hold both color and wavelengthNm")
      }
      if (accelerometer !== undefined && (!JsonStructure.isObject(accelerometer) ||
        !JsonStructure.isOptional(accelerometer.type, "string") ||
        !JsonStructure.isOptional(accelerometer.channel, "number"))) {
        throw new InvalidDataException(functionName, "accelerometer is malformed")
      }
      if (electrocardiogram !== undefined && (!JsonStructure.isObject(electrocardiogram) ||
        !JsonStructure.isOptional(electrocardiogram.channel, "number"))) {
        throw new InvalidDataException(functionName, "electrocardiogram is malformed")
      }
    })
  }
}
