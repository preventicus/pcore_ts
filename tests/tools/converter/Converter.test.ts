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
} from "../../../src/ProtobufDefinitions"
import { SensorBuilder } from "../../../src"
import { Converter, DataBuilder, DataCompressor, DataForm, MetadataBuilder } from "../../../src"

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
      .withPhotoplethysmographColor(Color.BLUE)
      .build()

    const sensorPPG700 = new SensorBuilder()
      .withDoubleValues([1.0, 2.0, 3.0])
      .withPhotoplethysmographWavelength(700)
      .build()

    const sensorACC = new SensorBuilder()
      .withIntValues([1, 2, 3])
      .withAccelerometerType(AccelerometerType.Z_COORDINATE)
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
  })

  test("ConvertToJsonDecompressedErrorInSensorTypeTest", () => {
    const timestamps = [10, 20, 30]

    const sensorECG = new SensorBuilder()
      .withIntValues([1, 2, 3])
      .withElectrocardiogramChannel(1)
      .build()

    const data = new DataBuilder()
      .withSensor(sensorECG)
      .withTimestamps(timestamps)
      .build()

    const dataPb = DataCompressor.compress(data)

    dataPb.sensors[0].type.oneofKind = undefined

    expect(() => Converter.convertToJson(dataPb, DataForm.Decompressed)).toThrow("Inspector::validate: Invalid value in variable 'Sensor values must be photoplethysmograph, electrocardiogram or accelerometer'.")
  })

  test("ConvertToJsonDecompressedErrorInSensorValuesTest", () => {
    const timestamps = [10, 20, 30]

    const sensorECG = new SensorBuilder()
      .withIntValues([1, 2, 3])
      .withElectrocardiogramChannel(1)
      .build()

    const data = new DataBuilder()
      .withSensor(sensorECG)
      .withTimestamps(timestamps)
      .build()

    const dataPb = DataCompressor.compress(data)

    dataPb.sensors[0].values.oneofKind = undefined

    expect(() => Converter.convertToJson(dataPb, DataForm.Decompressed)).toThrow("Inspector::validate: Invalid value in variable 'Sensor values must be intValuesContainer or doubleValuesContainer'.")
  })

  test("ConvertToJsonDecompressedErrorInPPGTypeTest", () => {
    const timestamps = [10, 20, 30]

    const sensorPPG = new SensorBuilder()
      .withIntValues([1, 2, 3])
      .withPhotoplethysmographColor(Color.BLUE)
      .build()

    const data = new DataBuilder()
      .withSensor(sensorPPG)
      .withTimestamps(timestamps)
      .build()

    const dataPb = DataCompressor.compress(data)

    if (dataPb.sensors[0].type.oneofKind === "photoplethysmograph") {
      dataPb.sensors[0].type.photoplethysmograph.light.oneofKind = undefined
      expect(() => Converter.convertToJson(dataPb, DataForm.Decompressed)).toThrow("Inspector::validate: Invalid value in variable 'Photoplethysmograph light must be color or wavelengthNm'.")
    }
  })

  test("ConvertToJsonCompressedErrorInSensorTypeTest", () => {
    const timestamps = [10, 20, 30]

    const sensorECG = new SensorBuilder()
      .withIntValues([1, 2, 3])
      .withElectrocardiogramChannel(1)
      .build()

    const data = new DataBuilder()
      .withSensor(sensorECG)
      .withTimestamps(timestamps)
      .build()

    const dataPb = DataCompressor.compress(data)

    dataPb.sensors[0].type.oneofKind = undefined

    expect(() => Converter.convertToJson(dataPb, DataForm.Compressed)).toThrow("Inspector::validate: Invalid value in variable 'Sensor values must be photoplethysmograph, electrocardiogram or accelerometer'.")
  })

  test("ConvertToJsonCompressedErrorInSensorValuesTest", () => {
    const timestamps = [10, 20, 30]

    const sensorECG = new SensorBuilder()
      .withIntValues([1, 2, 3])
      .withElectrocardiogramChannel(1)
      .build()

    const data = new DataBuilder()
      .withSensor(sensorECG)
      .withTimestamps(timestamps)
      .build()

    const dataPb = DataCompressor.compress(data)

    dataPb.sensors[0].values.oneofKind = undefined

    expect(() => Converter.convertToJson(dataPb, DataForm.Compressed)).toThrow("Inspector::validate: Invalid value in variable 'Sensor values must be intValuesContainer or doubleValuesContainer'.")
  })

  test("ConvertToJsonCompressedErrorInPPGTypeTest", () => {
    const timestamps = [10, 20, 30]

    const sensorPPG = new SensorBuilder()
      .withIntValues([1, 2, 3])
      .withPhotoplethysmographColor(Color.BLUE)
      .build()

    const data = new DataBuilder()
      .withSensor(sensorPPG)
      .withTimestamps(timestamps)
      .build()

    const dataPb = DataCompressor.compress(data)

    if (dataPb.sensors[0].type.oneofKind === "photoplethysmograph") {
      dataPb.sensors[0].type.photoplethysmograph.light.oneofKind = undefined
      expect(() => Converter.convertToJson(dataPb, DataForm.Compressed)).toThrow("Inspector::validate: Invalid value in variable 'Photoplethysmograph light must be color or wavelengthNm'.")
    }
  })

  test("ConvertFromJsonErrorInSensorTypeTest", () => {
    const timestamps = [10, 20, 30]

    const sensorECG = new SensorBuilder()
      .withIntValues([1, 2, 3])
      .withElectrocardiogramChannel(1)
      .build()

    const data = new DataBuilder()
      .withSensor(sensorECG)
      .withTimestamps(timestamps)
      .build()

    let dataJson = JSON.stringify(DataCompressor.compress(data))
    dataJson = dataJson.replace("electrocardiogram", "electrocardiograms")

    expect(() => Converter.convertFromJson(dataJson)).toThrow("Inspector::validate: Invalid value in variable 'Sensor values must be photoplethysmograph, electrocardiogram or accelerometer'.")
  })

  test("ConvertFromJsonErrorInSensorValuesTest", () => {
    const timestamps = [10, 20, 30]

    const sensor = new SensorBuilder()
      .withIntValues([1, 2, 3])
      .withElectrocardiogramChannel(1)
      .build()

    const data = new DataBuilder()
      .withSensor(sensor)
      .withTimestamps(timestamps)
      .build()

    let dataJson = JSON.stringify(DataCompressor.compress(data))
    dataJson = dataJson.replace("intValue", "itValue")

    expect(() => Converter.convertFromJson(dataJson)).toThrow("Inspector::validate: Invalid value in variable 'Sensor values must be intValuesContainer or doubleValuesContainer'.")
  })

  test("ConvertFromJsonErrorInPPGTypeTest", () => {
    const timestamps = [10, 20, 30]

    const sensorPPG = new SensorBuilder()
      .withIntValues([1, 2, 3])
      .withPhotoplethysmographColor(Color.BLUE)
      .build()

    const data = new DataBuilder()
      .withSensor(sensorPPG)
      .withTimestamps(timestamps)
      .build()

    let dataJson = JSON.stringify(DataCompressor.compress(data))
    dataJson = dataJson.replace("color", "clor")
    expect(() => Converter.convertFromJson(dataJson)).toThrow("Inspector::validate: Invalid value in variable 'Photoplethysmograph light must be color or wavelengthNm'.")
  })
})
