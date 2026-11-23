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

import * as fs from "fs"
import { AccelerometerType, Color, DataPb } from "../../../src/ProtobufDefinitions"
import { Converter, DataBuilder, DataCompressor, DataForm, File, MetadataBuilder, SensorBuilder } from "../../../src"
import { PcoreVersion } from "../../../dist/gens/pcore/pcoreVersion"

describe("FileTest", () => {
  test("PcoreEmptyDataTest", () => {
    const path = __dirname + "/emptyTest.pcore"
    const dataPbWrite = DataPb.create()
    expect(() => File.writePcoreBinary(dataPbWrite, path)).not.toThrow()
    expect(fs.existsSync(path)).toBe(true)
    expect(fs.statSync(path).size).toBe(0)

    const dataPbRead = File.readPcoreBinary(path)

    expect(dataPbRead.sensors.length).toBe(0)
    expect(dataPbRead.compressedTimestampsContainer).toBeUndefined()
    expect(dataPbRead.metadata).toBeUndefined()
  })

  test("PcoreEmpty2DataTest", () => {
    const path = __dirname + "/empty2Test.pcore"
    const data = new DataBuilder().build()
    const dataPbWrite = DataCompressor.compress(data)
    expect(() => File.writePcoreBinary(dataPbWrite, path)).not.toThrow()
    expect(fs.existsSync(path)).toBe(true)
    expect(fs.statSync(path).size).toBeGreaterThan(0)

    const dataPbRead = File.readPcoreBinary(path)

    expect(dataPbRead.sensors.length).toBe(0)
    expect(dataPbRead.compressedTimestampsContainer).toBeUndefined()
    expect(dataPbRead.metadata).toBeDefined()
    expect(dataPbRead.metadata!.pcoreVersion).toBeDefined()
    expect(dataPbRead.metadata!.pcoreVersion!.major).toBe(PcoreVersion.major)
    expect(dataPbRead.metadata!.pcoreVersion!.minor).toBe(PcoreVersion.minor)
    expect(dataPbRead.metadata!.pcoreVersion!.patch).toBe(PcoreVersion.patch)
  })

  test("PcoreNormalDataTest", () => {
    const path = __dirname + "/normalTest.pcore"

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

    const dataPbWrite = DataCompressor.compress(data)

    expect(() => File.writePcoreBinary(dataPbWrite, path)).not.toThrow()
    expect(fs.existsSync(path)).toBe(true)
    expect(fs.statSync(path).size).toBeGreaterThan(0)

    const dataPbRead = File.readPcoreBinary(path)

    expect(dataPbRead.sensors.length).toBe(4)
    expect(dataPbRead.sensors[0].type.oneofKind).toBe("electrocardiogram")
    if (dataPbRead.sensors[0].type.oneofKind === "electrocardiogram") {
      expect(dataPbRead.sensors[0].type.electrocardiogram.channel).toBe(1)
    }
    expect(dataPbRead.sensors[0].values.oneofKind).toBe("intValuesContainer")
    if (dataPbRead.sensors[0].values.oneofKind === "intValuesContainer") {
      expect(dataPbRead.sensors[0].values.intValuesContainer.values.length).toBe(3)
      expect(dataPbRead.sensors[0].values.intValuesContainer.values).toStrictEqual([1, 1, 1])
    }

    expect(dataPbRead.sensors[1].type.oneofKind).toBe("photoplethysmograph")
    if (dataPbRead.sensors[1].type.oneofKind === "photoplethysmograph") {
      expect(dataPbRead.sensors[1].type.photoplethysmograph.light.oneofKind).toBe("color")
      if (dataPbRead.sensors[1].type.photoplethysmograph.light.oneofKind === "color") {
        expect(dataPbRead.sensors[1].type.photoplethysmograph.light.color).toBe(Color.BLUE)
      }
    }
    expect(dataPbRead.sensors[1].values.oneofKind).toBe("intValuesContainer")
    if (dataPbRead.sensors[1].values.oneofKind === "intValuesContainer") {
      expect(dataPbRead.sensors[1].values.intValuesContainer.values.length).toBe(3)
      expect(dataPbRead.sensors[1].values.intValuesContainer.values).toStrictEqual([1, 1, 1])
    }

    expect(dataPbRead.sensors[2].type.oneofKind).toBe("photoplethysmograph")
    if (dataPbRead.sensors[2].type.oneofKind === "photoplethysmograph") {
      expect(dataPbRead.sensors[2].type.photoplethysmograph.light.oneofKind).toBe("wavelengthNm")
      if (dataPbRead.sensors[2].type.photoplethysmograph.light.oneofKind === "wavelengthNm") {
        expect(dataPbRead.sensors[2].type.photoplethysmograph.light.wavelengthNm).toBe(700)
      }
    }
    expect(dataPbRead.sensors[2].values.oneofKind).toBe("doubleValuesContainer")
    if (dataPbRead.sensors[2].values.oneofKind === "doubleValuesContainer") {
      expect(dataPbRead.sensors[2].values.doubleValuesContainer.values.length).toBe(3)
      expect(dataPbRead.sensors[2].values.doubleValuesContainer.values).toStrictEqual([1, 2, 3])
    }

    expect(dataPbRead.sensors[3].type.oneofKind).toBe("accelerometer")
    if (dataPbRead.sensors[3].type.oneofKind === "accelerometer") {
      expect(dataPbRead.sensors[3].type.accelerometer.type).toBe(AccelerometerType.Z_COORDINATE)
    }
    expect(dataPbRead.sensors[3].values.oneofKind).toBe("intValuesContainer")
    if (dataPbRead.sensors[3].values.oneofKind === "intValuesContainer") {
      expect(dataPbRead.sensors[3].values.intValuesContainer.values.length).toBe(3)
      expect(dataPbRead.sensors[3].values.intValuesContainer.values).toStrictEqual([1, 1, 1])
    }

    expect(dataPbRead.compressedTimestampsContainer).toBeDefined()
    expect(dataPbRead.compressedTimestampsContainer!.firstUnixTimestampMs).toBe(10)
    expect(dataPbRead.compressedTimestampsContainer!.sectionsSizes).toStrictEqual([3])
    expect(dataPbRead.compressedTimestampsContainer!.innerSectionsDurationsMs).toStrictEqual([10])
    expect(dataPbRead.compressedTimestampsContainer!.outerSectionsDurationsMs).toStrictEqual([0])

    expect(dataPbRead.metadata).toBeDefined()
    expect(dataPbRead.metadata!.timezoneOffsetMin).toBe(400)
    expect(dataPbRead.metadata!.device).toBeDefined()
    expect(dataPbRead.metadata!.device!.id).toBe("123")
    expect(dataPbRead.metadata!.device!.name).toBe("xyz")
    expect(dataPbRead.metadata!.device!.manufacturer).toBe("ABC")
    expect(dataPbRead.metadata!.device!.firmwareVersion).toBeDefined()
    expect(dataPbRead.metadata!.device!.firmwareVersion!.major).toBe(3)
    expect(dataPbRead.metadata!.device!.firmwareVersion!.minor).toBe(2)
    expect(dataPbRead.metadata!.device!.firmwareVersion!.patch).toBe(1)
    expect(dataPbRead.metadata!.pcoreVersion).toBeDefined()
    expect(dataPbRead.metadata!.pcoreVersion!.patch).toBe(PcoreVersion.patch)
    expect(dataPbRead.metadata!.pcoreVersion!.minor).toBe(PcoreVersion.minor)
    expect(dataPbRead.metadata!.pcoreVersion!.major).toBe(PcoreVersion.major)
  })

  test("JsonEmptyDataTest", () => {
    const path = __dirname + "/emptyTest.pcore.json"
    const dataJsonWrite = Converter.convertToJson(DataPb.create(), DataForm.Compressed)
    expect(() => File.writePcoreJson(dataJsonWrite, path)).not.toThrow()
    expect(fs.existsSync(path)).toBe(true)

    const dataJsonRead = File.readPcoreJson(path)

    expect(dataJsonWrite).toBe(dataJsonRead)
  })

  test("JsonEmpty2DataTest", () => {
    const path = __dirname + "/emptyTest2.pcore.json"
    const data = new DataBuilder().build()
    const dataPbWrite = DataCompressor.compress(data)
    const dataJsonWrite = Converter.convertToJson(dataPbWrite, DataForm.Compressed)
    expect(() => File.writePcoreJson(dataJsonWrite, path)).not.toThrow()
    expect(fs.existsSync(path)).toBe(true)

    const dataJsonRead = File.readPcoreJson(path)

    expect(dataJsonWrite).toBe(dataJsonRead)
  })

  test("PcoreNormalDataTest", () => {
    const path = __dirname + "/normalTest.pcore.json"

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

    const dataPbWrite = DataCompressor.compress(data)
    const dataJsonWrite = Converter.convertToJson(dataPbWrite, DataForm.Compressed)

    expect(() => File.writePcoreJson(dataJsonWrite, path)).not.toThrow()
    expect(fs.existsSync(path)).toBe(true)
    expect(fs.statSync(path).size).toBeGreaterThan(0)

    const dataJsonRead = File.readPcoreJson(path)

    expect(dataJsonWrite).toBe(dataJsonRead)
  })
})
