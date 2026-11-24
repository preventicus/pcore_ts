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

import { Color } from "@/ProtobufDefinitions"
import { Converter, DataBuilder, DataCompressor, DataForm, DataPb, InvalidDataException, SensorBuilder, WrongValueException } from "@/index"
import { buildNormalData } from "@tests/helpers/normalData"

describe("ConverterTest", () => {
  test("NormalDataTest", () => {
    const data = buildNormalData()

    const dataPb = DataCompressor.compress(data)

    const decompressedJson = Converter.convertToJson(dataPb, DataForm.Decompressed)
    const compressedJson = Converter.convertToJson(dataPb, DataForm.Compressed)

    const dataPbConvertedFromDecompressedJson = Converter.convertFromJson(decompressedJson)
    const dataPbConvertedFromCompressedJson = Converter.convertFromJson(compressedJson)

    expect(dataPbConvertedFromDecompressedJson).toEqual(dataPbConvertedFromCompressedJson)
    expect(dataPbConvertedFromDecompressedJson).toEqual(dataPb)

    const sensorsJson = JSON.parse(decompressedJson).sensors
    expect(sensorsJson[1].photoplethysmograph).toEqual({ color: "BLUE", channel: 1 })
    expect(sensorsJson[2].photoplethysmograph).toEqual({ wavelengthNm: 700, channel: 0 })
    expect(sensorsJson[3].accelerometer).toEqual({ type: "Z_COORDINATE", channel: 2 })
  })

  function compressedEcgData(): DataPb {
    const sensor = new SensorBuilder()
      .withIntValues([1, 2, 3])
      .withElectrocardiogramChannel(1)
      .build()
    return DataCompressor.compress(new DataBuilder().withSensor(sensor).withTimestamps([10, 20, 30]).build())
  }

  function compressedEcgJson(): string {
    return Converter.convertToJson(compressedEcgData(), DataForm.Compressed)
  }

  function compressedPpgData(): DataPb {
    const sensor = new SensorBuilder()
      .withIntValues([1, 2, 3])
      .withPhotoplethysmographColor(Color.BLUE)
      .build()
    return DataCompressor.compress(new DataBuilder().withSensor(sensor).withTimestamps([10, 20, 30]).build())
  }

  test("CompressedJsonIsProtobufJsonTest", () => {
    // the compressed form is the protobuf JSON format, so every protobuf implementation can read it with the Pcore proto file
    const dataPb = DataCompressor.compress(buildNormalData())

    const json = Converter.convertToJson(dataPb, DataForm.Compressed)

    // read back by the standard JSON reader of the protobuf library instead of the Converter
    expect(DataPb.fromJsonString(json)).toEqual(dataPb)
    const parsedJson = JSON.parse(json)
    // no key of the in-memory representation of protobuf-ts
    expect(json).not.toContain("oneofKind")
    // a sensor holds its values container and its sensor type directly
    expect(parsedJson.sensors[1]).toEqual({ intValuesContainer: { values: ["1", "1", "1"] }, photoplethysmograph: { color: "COLOR_BLUE", channel: 1 } })
    expect(parsedJson.sensors[3].accelerometer).toEqual({ type: "TYPE_Z_COORDINATE", channel: 2 })
    // 64-bit integers are strings, fields with their default value (channel 0) are omitted
    expect(parsedJson.compressedTimestampsContainer.firstUnixTimestampMs).toBe("10")
    expect(parsedJson.sensors[2].photoplethysmograph).toEqual({ wavelengthNm: 700 })
  })

  test("CompressedJsonIndentTest", () => {
    const dataPb = compressedEcgData()
    const minifiedJson = Converter.convertToJson(dataPb, DataForm.Compressed)
    const indentedJson = Converter.convertToJson(dataPb, DataForm.Compressed, 2)

    expect(minifiedJson).not.toContain("\n")
    expect(indentedJson).toContain("\n  \"sensors\": [")
    expect(Converter.convertFromJson(indentedJson)).toEqual(dataPb)
  })

  test("ConvertFromCompressedJsonOfOtherImplementationTest", () => {
    // protobuf JSON written by another implementation may use the field names of the proto file,
    // numbers for 64-bit integers and numbers for enum values
    const json = JSON.stringify({
      metadata: { timezone_offset_min: 60, pcore_version: { major: 2, minor: 1 } },
      compressed_timestamps_container: { first_unix_timestamp_ms: 10, outer_sections_durations_ms: [0], inner_sections_durations_ms: [10], sections_sizes: [3] },
      sensors: [{ int_values_container: { values: [1, 1, 1] }, photoplethysmograph: { color: 3, channel: 4 } }]
    })

    const dataPb = Converter.convertFromJson(json)

    expect(dataPb.metadata!.timezoneOffsetMin).toBe(60)
    expect(dataPb.compressedTimestampsContainer).toEqual({ firstUnixTimestampMs: 10, outerSectionsDurationsMs: [0], innerSectionsDurationsMs: [10], sectionsSizes: [3] })
    expect(dataPb.sensors[0].values).toEqual({ oneofKind: "intValuesContainer", intValuesContainer: { values: [1, 1, 1] } })
    expect(dataPb.sensors[0].type).toEqual({ oneofKind: "photoplethysmograph", photoplethysmograph: { light: { oneofKind: "color", color: Color.BLUE }, channel: 4 } })
  })

  test("ConvertFromFormerCompressedJsonTest", () => {
    // before the protobuf JSON format, the compressed form was the in-memory object of protobuf-ts; it is not read anymore
    const formerJson = JSON.stringify(compressedEcgData())
    expect(formerJson).toContain("oneofKind")
    expect(() => Converter.convertFromJson(formerJson)).toThrow(InvalidDataException)
  })

  test("ConvertToJsonDecompressedWithoutSensorTypeTest", () => {
    // sensor types are not checked when decompressing, so that legacy files can be read
    const dataPb = compressedEcgData()
    dataPb.sensors[0].type = { oneofKind: undefined }

    const json = Converter.convertToJson(dataPb, DataForm.Decompressed)
    expect(JSON.parse(json).sensors[0]).toEqual({ valuesType: "intValuesContainer", values: [1, 2, 3] })

    // compressing requires a sensor type
    expect(() => Converter.convertFromJson(json)).toThrow(InvalidDataException)
  })

  test("ConvertToJsonDecompressedErrorInSensorValuesTest", () => {
    const dataPb = compressedEcgData()
    dataPb.sensors[0].values = { oneofKind: undefined }
    expect(() => Converter.convertToJson(dataPb, DataForm.Decompressed)).toThrow(InvalidDataException)
  })

  test("ConvertToJsonDecompressedErrorInPPGLightTest", () => {
    const dataPb = compressedPpgData()
    if (dataPb.sensors[0].type.oneofKind === "photoplethysmograph") {
      dataPb.sensors[0].type.photoplethysmograph.light = { oneofKind: undefined }
    }

    expect(() => Converter.convertToJson(dataPb, DataForm.Decompressed)).toThrow(InvalidDataException)
  })

  test("ConvertToJsonCompressedWithoutSensorTypeTest", () => {
    const dataPb = compressedEcgData()
    dataPb.sensors[0].type = { oneofKind: undefined }
    expect(Converter.convertFromJson(Converter.convertToJson(dataPb, DataForm.Compressed))).toEqual(dataPb)
  })

  test("ConvertToJsonCompressedErrorInSensorValuesTest", () => {
    const dataPb = compressedEcgData()
    dataPb.sensors[0].values = { oneofKind: undefined }
    expect(() => Converter.convertToJson(dataPb, DataForm.Compressed)).toThrow(InvalidDataException)
  })

  test("ConvertToJsonCompressedErrorInPPGLightTest", () => {
    const dataPb = compressedPpgData()
    if (dataPb.sensors[0].type.oneofKind === "photoplethysmograph") {
      dataPb.sensors[0].type.photoplethysmograph.light = { oneofKind: undefined }
    }
    expect(() => Converter.convertToJson(dataPb, DataForm.Compressed)).toThrow(InvalidDataException)
  })

  test("ConvertFromJsonErrorInSensorValuesTest", () => {
    // the unknown key is ignored, which leaves a sensor without values
    const dataJson = compressedEcgJson().replace("intValuesContainer", "itValuesContainer")
    expect(dataJson).toContain("itValuesContainer")
    expect(() => Converter.convertFromJson(dataJson)).toThrow(InvalidDataException)
  })

  test("ConvertFromJsonUnknownColorTest", () => {
    // unknown color names are read as COLOR_UNSPECIFIED, which is not an allowed color
    const json = JSON.stringify({
      timestamps: [10, 20, 30],
      sensors: [{ valuesType: "intValuesContainer", values: [1, 2, 3], photoplethysmograph: { color: "YELLOW" } }]
    })
    expect(() => Converter.convertFromJson(json)).toThrow(WrongValueException)
  })

  test("ConvertFromJsonUnknownValuesTypeTest", () => {
    const json = JSON.stringify({
      timestamps: [10, 20, 30],
      sensors: [{ valuesType: "stringValuesContainer", values: [1, 2, 3], electrocardiogram: { channel: 1 } }]
    })
    expect(() => Converter.convertFromJson(json)).toThrow(InvalidDataException)
  })

  test("ConvertFromJsonMalformedJsonTest", () => {
    // malformed input is reported as InvalidDataException instead of a SyntaxError or TypeError
    const malformedJsons = [
      "{nope",
      "null",
      "5",
      "[]",
      "{\"timestamps\": [1]}",
      "{\"sensors\": []}",
      "{\"timestamps\": [\"1\"], \"sensors\": []}",
      "{\"timestamps\": [1], \"sensors\": [5]}",
      "{\"timestamps\": [1], \"sensors\": [{\"valuesType\": \"intValuesContainer\"}]}",
      "{\"timestamps\": [1], \"sensors\": [{\"valuesType\": \"intValuesContainer\", \"values\": [1], \"electrocardiogram\": {\"channel\": \"1\"}}]}",
      "{\"timestamps\": [1], \"sensors\": [{\"valuesType\": \"intValuesContainer\", \"values\": [1], \"accelerometer\": 5}]}",
      "{\"timestamps\": [1], \"sensors\": [{\"valuesType\": \"intValuesContainer\", \"values\": [1], \"photoplethysmograph\": {\"wavelengthNm\": \"530\"}}]}",
      "{\"timestamps\": [1], \"sensors\": [], \"metadata\": 5}",
      "{\"compressedTimestampsContainer\": 5, \"sensors\": []}",
      "{\"compressedTimestampsContainer\": {\"firstUnixTimestampMs\": 1, \"sectionsSizes\": [1], \"innerSectionsDurationsMs\": [0]}, \"sensors\": []}"
    ]
    malformedJsons.forEach(json => {
      expect(() => Converter.convertFromJson(json)).toThrow(InvalidDataException)
    })
  })

  test("ConvertFromCompressedJsonMalformedSensorTest", () => {
    const dataPb = compressedEcgData()
    const json = compressedEcgJson()
    const parsedJson = JSON.parse(json)
    const sensorsNoArray = JSON.stringify({ ...parsedJson, sensors: 5 })
    const withoutValuesContainer = json.replace("\"intValuesContainer\":{", "\"otherContainer\":{")
    const typeMessageNoObject = json.replace("\"electrocardiogram\":{\"channel\":1}", "\"electrocardiogram\":5")
    const metadataNoObject = JSON.stringify({ ...parsedJson, metadata: 5 })
    const sensorNoObject = JSON.stringify({ ...parsedJson, sensors: [5] })
    expect(typeMessageNoObject).toContain("\"electrocardiogram\":5")

    expect(Converter.convertFromJson(json)).toEqual(dataPb)
    expect(() => Converter.convertFromJson(sensorsNoArray)).toThrow(InvalidDataException)
    expect(() => Converter.convertFromJson(withoutValuesContainer)).toThrow(InvalidDataException)
    expect(() => Converter.convertFromJson(typeMessageNoObject)).toThrow(InvalidDataException)
    expect(() => Converter.convertFromJson(metadataNoObject)).toThrow(InvalidDataException)
    expect(() => Converter.convertFromJson(sensorNoObject)).toThrow(InvalidDataException)
  })

  test("ConvertFromJsonUnknownAccelerometerTypeTest", () => {
    // unknown type names are read as TYPE_UNSPECIFIED, which is not an allowed accelerometer type
    const json = JSON.stringify({
      timestamps: [10, 20, 30],
      sensors: [{ valuesType: "intValuesContainer", values: [1, 2, 3], accelerometer: { type: "W_COORDINATE" } }]
    })
    expect(() => Converter.convertFromJson(json)).toThrow(WrongValueException)
  })

  test("ConvertFromDecompressedJsonWithoutEcgChannelTest", () => {
    const json = JSON.stringify({
      timestamps: [10, 20, 30],
      sensors: [{ valuesType: "intValuesContainer", values: [1, 2, 3], electrocardiogram: {} }]
    })
    const dataPb = Converter.convertFromJson(json)
    expect(dataPb.sensors[0].type).toEqual({ oneofKind: "electrocardiogram", electrocardiogram: { channel: 0 } })
  })

  test("ConvertFromDecompressedJsonWithoutChannelTest", () => {
    // decompressed JSON written before the channel fields existed
    const json = JSON.stringify({
      timestamps: [10, 20, 30],
      sensors: [
        { valuesType: "intValuesContainer", values: [1, 2, 3], photoplethysmograph: { color: "GREEN" } },
        { valuesType: "intValuesContainer", values: [4, 5, 6], accelerometer: { type: "X_COORDINATE" } }
      ]
    })
    const dataPb = Converter.convertFromJson(json)
    expect(dataPb.sensors[0].type.oneofKind === "photoplethysmograph" && dataPb.sensors[0].type.photoplethysmograph.channel).toBe(0)
    expect(dataPb.sensors[1].type.oneofKind === "accelerometer" && dataPb.sensors[1].type.accelerometer.channel).toBe(0)
  })

  test("ConvertFromCompressedJsonWithoutChannelTest", () => {
    // a missing field has its default value in protobuf JSON, which also covers JSON written before the channel fields existed
    const json = compressedEcgJson().replace("\"electrocardiogram\":{\"channel\":1}", "\"electrocardiogram\":{}")
    expect(json).toContain("\"electrocardiogram\":{}")

    const dataPb = Converter.convertFromJson(json)

    expect(dataPb.sensors[0].type).toEqual({ oneofKind: "electrocardiogram", electrocardiogram: { channel: 0 } })
    expect(() => DataPb.toBinary(dataPb)).not.toThrow()
  })

  test("ConvertFromJsonEmptyMetadataTest", () => {
    // missing metadata fields get their default value, so the data can be written as binary afterwards
    const sensor = { valuesType: "intValuesContainer", values: [1, 2, 3], electrocardiogram: { channel: 1 } }
    const decompressedJson = JSON.stringify({ metadata: {}, timestamps: [10, 20, 30], sensors: [sensor] })
    const compressedJson = JSON.stringify({ ...JSON.parse(compressedEcgJson()), metadata: {} })

    for (const json of [decompressedJson, compressedJson]) {
      const dataPb = Converter.convertFromJson(json)
      expect(dataPb.metadata!.timezoneOffsetMin).toBe(0)
      expect(dataPb.metadata!.device).toBeUndefined()
      expect(() => DataPb.toBinary(dataPb)).not.toThrow()
    }
  })

  test("ConvertFromJsonMalformedMetadataTest", () => {
    // metadata fields of the wrong type are rejected when reading and not only when writing the binary
    const malformedMetadata = [
      { timezoneOffsetMin: "abc" },
      { timezoneOffsetMin: 1.5 },
      { device: 5 },
      { device: { name: 5 } },
      { device: { firmwareVersion: "1.0" } },
      { pcoreVersion: { major: -1 } }
    ]
    const sensor = { valuesType: "intValuesContainer", values: [1, 2, 3], electrocardiogram: { channel: 1 } }
    malformedMetadata.forEach(metadata => {
      const decompressedJson = JSON.stringify({ metadata, timestamps: [10, 20, 30], sensors: [sensor] })
      const compressedJson = JSON.stringify({ ...JSON.parse(compressedEcgJson()), metadata })
      expect(() => Converter.convertFromJson(decompressedJson)).toThrow(InvalidDataException)
      expect(() => Converter.convertFromJson(compressedJson)).toThrow(InvalidDataException)
    })
  })

  test("ConvertFromCompressedJsonWrongFieldTypeTest", () => {
    const json = compressedEcgJson()
    const parsedJson = JSON.parse(json)
    const channelNoNumber = json.replace("\"channel\":1", "\"channel\":\"x\"")
    const channelNegative = json.replace("\"channel\":1", "\"channel\":-1")
    const twoSensorTypes = json.replace("\"electrocardiogram\":{", "\"accelerometer\":{\"type\":\"TYPE_X_COORDINATE\"},\"electrocardiogram\":{")
    const intValueNoInteger = json.replace("[\"1\",\"1\",\"1\"]", "[1.5,1,1]")
    // every sensor is checked, also the last of many
    const sensors = Array.from({ length: 20 }, () => parsedJson.sensors[0])
    const manySensors = JSON.stringify({ ...parsedJson, sensors })
    const lastSensorWrong = JSON.stringify({ ...parsedJson, sensors: [...sensors.slice(0, 19), { ...sensors[19], electrocardiogram: { channel: "x" } }] })
    for (const changedJson of [channelNoNumber, channelNegative, twoSensorTypes, intValueNoInteger]) {
      expect(changedJson).not.toBe(json)
    }

    expect(Converter.convertFromJson(manySensors).sensors.length).toBe(20)
    expect(() => Converter.convertFromJson(channelNoNumber)).toThrow(InvalidDataException)
    expect(() => Converter.convertFromJson(channelNegative)).toThrow(InvalidDataException)
    expect(() => Converter.convertFromJson(twoSensorTypes)).toThrow(InvalidDataException)
    expect(() => Converter.convertFromJson(intValueNoInteger)).toThrow(InvalidDataException)
    expect(() => Converter.convertFromJson(lastSensorWrong)).toThrow(InvalidDataException)
  })

  test("ConvertFromDecompressedJsonTwoSensorTypesTest", () => {
    // a sensor has exactly one sensor type and a photoplethysmograph exactly one light
    const twoSensorTypes = JSON.stringify({
      timestamps: [10, 20, 30],
      sensors: [{ valuesType: "intValuesContainer", values: [1, 2, 3], accelerometer: { type: "X_COORDINATE" }, electrocardiogram: { channel: 1 } }]
    })
    const twoLights = JSON.stringify({
      timestamps: [10, 20, 30],
      sensors: [{ valuesType: "intValuesContainer", values: [1, 2, 3], photoplethysmograph: { color: "GREEN", wavelengthNm: 530 } }]
    })
    expect(() => Converter.convertFromJson(twoSensorTypes)).toThrow(InvalidDataException)
    expect(() => Converter.convertFromJson(twoLights)).toThrow(InvalidDataException)
  })

  test("ConvertFromJsonUnsafeIntegerTest", () => {
    // JSON.parse reads integers as number; integers outside of the safe range are rejected
    const decompressedJson = "{\"timestamps\": [10, 20], \"sensors\": [{\"valuesType\": \"intValuesContainer\", \"values\": [9223372036854775807, 0], \"electrocardiogram\": {\"channel\": 1}}]}"
    expect(() => Converter.convertFromJson(decompressedJson)).toThrow(WrongValueException)

    // protobuf JSON writes 64-bit integers as strings
    const compressedJson = compressedEcgJson().replace("[\"1\",\"1\",\"1\"]", "[\"9223372036854775807\",\"1\",\"1\"]")
    expect(compressedJson).toContain("9223372036854775807")
    expect(() => Converter.convertFromJson(compressedJson)).toThrow(WrongValueException)
  })
})
