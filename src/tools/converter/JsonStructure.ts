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
import { InvalidDataException, WrongValueException } from "@/Exception"
import { IMessageType, JsonValue, ScalarType } from "@protobuf-ts/runtime"

const MAX_SAFE_INTEGER = BigInt(Number.MAX_SAFE_INTEGER)
const SCALAR_TYPES_WITH_64_BIT = [ScalarType.INT64, ScalarType.UINT64, ScalarType.SINT64, ScalarType.FIXED64, ScalarType.SFIXED64]

/**
 * Reads the two JSON forms of `Converter.convertFromJson` into typed data: the compressed form, which is
 * the protobuf JSON format of the Pcore message, and the decompressed form of this library.
 *
 * This is part of reading JSON, not of the Pcore validation rules, which are checked by `Inspector`
 * on the typed data afterwards.
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
   * Reads the metadata of decompressed JSON, whose structure is that of the protobuf JSON format.
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
   * Tells whether parsed JSON is the compressed form. It is recognized by the timestamps container,
   * under its JSON name or under its name in the proto file, since protobuf JSON allows both.
   */
  static isCompressed(json: Record<string, unknown>): boolean {
    return "compressedTimestampsContainer" in json || "compressed_timestamps_container" in json
  }

  /**
   * Converts compressed JSON, i.e. the protobuf JSON format of the Pcore message, into a `DataPb` object.
   * As defined for protobuf JSON, missing fields get their default value, 64-bit integers may be numbers
   * or strings, enum values names or numbers, and field names may be those of the proto file.
   * Unknown keys are ignored.
   * @param json - The parsed compressed JSON.
   * @returns The typed data, which still has to be validated by `Inspector.validateCompressed`.
   * @throws {InvalidDataException} If the JSON does not have the structure of the Pcore message or a field has the wrong type.
   * @throws {WrongValueException} If a 64-bit integer is not a safe JavaScript integer.
   */
  static parseCompressed(json: Record<string, unknown>): DataPb {
    // checked before reading: protobuf-ts would reject such a value with an error that can only be recognized by its message text
    JsonStructure.checkSafeIntegers(DataPb, json)
    try {
      return DataPb.fromJson(json as JsonValue, { ignoreUnknownFields: true })
    } catch (error) {
      throw new InvalidDataException("JsonStructure.parseCompressed", `json is not compressed Pcore data in the protobuf JSON format (${String(error)})`)
    }
  }

  /**
   * Checks every 64-bit integer field of protobuf JSON, since this library reads 64-bit integers as `number`.
   * The fields are found with the reflection information of the generated message type, so the check
   * follows the proto file. Everything else that is wrong with the JSON is left to the reader.
   * @throws {WrongValueException} If a 64-bit integer is outside of the safe integer range ±(2^53 - 1).
   */
  private static checkSafeIntegers(messageType: Pick<IMessageType<object>, "fields">, json: unknown) {
    if (!JsonStructure.isObject(json)) {
      return
    }
    for (const field of messageType.fields) {
      // protobuf JSON allows the JSON name and the name of the proto file
      const fieldValue = json[field.jsonName] ?? json[field.name]
      const values: unknown[] = Array.isArray(fieldValue) ? fieldValue : [fieldValue]
      if (field.kind === "message") {
        values.forEach(value => JsonStructure.checkSafeIntegers(field.T(), value))
      } else if (field.kind === "scalar" && SCALAR_TYPES_WITH_64_BIT.includes(field.T) && values.some(JsonStructure.isUnsafeInteger)) {
        throw new WrongValueException("JsonStructure.checkSafeIntegers", `64-bit integers must be safe integers: ${field.name}`)
      }
    }
  }

  /**
   * Tells whether a JSON value is an integer outside of the safe integer range, given as number or as string.
   */
  private static isUnsafeInteger(value: unknown): boolean {
    if (typeof value === "number") {
      return Number.isInteger(value) && !Number.isSafeInteger(value)
    }
    if (typeof value === "string" && /^-?[0-9]+$/.test(value)) {
      const integer = BigInt(value)
      return !(-MAX_SAFE_INTEGER <= integer && integer <= MAX_SAFE_INTEGER)
    }
    return false
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
