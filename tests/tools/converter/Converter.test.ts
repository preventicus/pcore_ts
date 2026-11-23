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
  Color
} from "@/ProtobufDefinitions"
import { Converter, DataBuilder, DataCompressor, DataForm, DataPb, InvalidDataException, MetadataBuilder, SensorBuilder, WrongValueException } from "@/index"

describe("ConverterTest", () => {
  test("NormalDataTest", () => {
    const metadata = new MetadataBuilder()
      .withTimezoneOffset(400)
      .withDeviceFirmwareVersion(3, 2, 1)
      .withDeviceManufacturer("ABC")
      .withDeviceName("xyz")
      .withDeviceId("123")
      .build()

    const timestamps = [10, 20, 30]

    const sensorECG = new SensorBuilder()
      .withIntValues([1, 2, 3])
      .withElectrocardiogramChannel(1)
      .build()

    const sensorPPGBlue = new SensorBuilder()
      .withIntValues([1, 2, 3])
      .withPhotoplethysmographColor(Color.BLUE, 1)
      .build()

    const sensorPPG700 = new SensorBuilder()
      .withDoubleValues([1.0, 2.0, 3.0])
      .withPhotoplethysmographWavelength(700)
      .build()

    const sensorACC = new SensorBuilder()
      .withIntValues([1, 2, 3])
      .withAccelerometerType(AccelerometerType.Z_COORDINATE, 2)
      .build()

    const data = new DataBuilder()
      .withMetadata(metadata)
      .withSensor(sensorECG)
      .withSensor(sensorPPGBlue)
      .withSensor(sensorPPG700)
      .withSensor(sensorACC)
      .withTimestamps(timestamps)
      .build()

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

  function compressedPpgData(): DataPb {
    const sensor = new SensorBuilder()
      .withIntValues([1, 2, 3])
      .withPhotoplethysmographColor(Color.BLUE)
      .build()
    return DataCompressor.compress(new DataBuilder().withSensor(sensor).withTimestamps([10, 20, 30]).build())
  }

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
    let dataJson = JSON.stringify(compressedEcgData())
    dataJson = dataJson.replace("intValue", "itValue")
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
    const json = JSON.stringify(dataPb)
    const withoutSensors = JSON.stringify({ ...dataPb, sensors: 5 })
    const withoutValuesContainer = json.replace("\"intValuesContainer\":{", "\"otherContainer\":{")
    const withoutTypeMessage = json.replace("\"electrocardiogram\":{", "\"other\":{")
    const metadataNoObject = JSON.stringify({ ...dataPb, metadata: 5 })
    const sensorNoObject = JSON.stringify({ ...dataPb, sensors: [5] })

    expect(Converter.convertFromJson(json)).toEqual(dataPb)
    expect(() => Converter.convertFromJson(withoutSensors)).toThrow(InvalidDataException)
    expect(() => Converter.convertFromJson(withoutValuesContainer)).toThrow(InvalidDataException)
    expect(() => Converter.convertFromJson(withoutTypeMessage)).toThrow(InvalidDataException)
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

  test("ConvertFromJsonUnsafeIntegerTest", () => {
    // JSON.parse reads integers as number; integers outside of the safe range are rejected
    const decompressedJson = "{\"timestamps\": [10, 20], \"sensors\": [{\"valuesType\": \"intValuesContainer\", \"values\": [9223372036854775807, 0], \"electrocardiogram\": {\"channel\": 1}}]}"
    expect(() => Converter.convertFromJson(decompressedJson)).toThrow(WrongValueException)

    const compressedJson = JSON.stringify(compressedEcgData()).replace("[1,1,1]", "[9223372036854775807,1,1]")
    expect(compressedJson).toContain("9223372036854775807")
    expect(() => Converter.convertFromJson(compressedJson)).toThrow(WrongValueException)
  })
})
