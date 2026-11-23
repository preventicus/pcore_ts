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
        channel: number
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
    const parsedJson = JSON.parse(json)
    if ("compressedTimestampsContainer" in parsedJson) {
      const dataPb = parsedJson as DataPb
      Inspector.validateCompressed(dataPb)
      return dataPb
    }
    const decompressedPcoreJson = parsedJson as DecompressedPcoreJson
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
        // currently unreachable code since validator capture this error before
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
          /* istanbul ignore next */
          // currently unreachable code since validator capture this error before
          throw new Error(`Unsupported sensor value type: ${sensor.valuesType}`)
        }
      }
    })()

    let type: Sensor["type"] = { oneofKind: undefined }
    if ("accelerometer" in sensor) {
      type = {
        oneofKind: "accelerometer",
        accelerometer: {
          type: AccelerometerType[sensor.accelerometer.type as keyof typeof AccelerometerType],
          channel: sensor.accelerometer.channel ?? 0
        }
      }
    } else if ("electrocardiogram" in sensor) {
      type = {
        oneofKind: "electrocardiogram",
        electrocardiogram: { channel: sensor.electrocardiogram.channel }
      }
    } else if ("photoplethysmograph" in sensor) {
      const photoplethysmograph = sensor.photoplethysmograph
      let light: Photoplethysmograph["light"] = { oneofKind: undefined }
      if (photoplethysmograph.color !== undefined) {
        const color = photoplethysmograph.color in Color ? Color[photoplethysmograph.color as keyof typeof Color] : Color.UNSPECIFIED
        light = { oneofKind: "color", color }
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
}
