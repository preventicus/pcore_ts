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
import * as os from "os"
import * as nodePath from "path"
import { AccelerometerType, Color, DataPb } from "@/ProtobufDefinitions"
import { Converter, DataBuilder, DataCompressor, DataDecompressor, DataForm, File, InvalidDataException, PcoreFile, SensorBuilder, WrongValueException } from "@/index"
import { PcoreVersion } from "@generated/pcoreVersion"
import { buildNormalData } from "@tests/helpers/normalData"

describe("PcoreFileTest", () => {
  // every run writes its files into a fresh directory, so no file of an earlier run can make a test pass
  let directory: string

  beforeAll(() => {
    directory = fs.mkdtempSync(nodePath.join(os.tmpdir(), "pcore-file-test-"))
  })

  afterAll(() => {
    fs.rmSync(directory, { recursive: true, force: true })
  })

  test("DeprecatedFileNameTest", () => {
    // the former class name stays available for existing users
    expect(File).toBe(PcoreFile)
  })

  test("PcoreEmptyDataTest", () => {
    // empty data is not valid since Pcore 2.1.0 and is not written
    const path = nodePath.join(directory, "emptyTest.pcore")
    expect(() => PcoreFile.writePcoreBinary(DataPb.create(), path)).toThrow(InvalidDataException)
    expect(fs.existsSync(path)).toBe(false)
  })

  test("PcoreReadEmptyFileTest", () => {
    // an empty file is read without validation, decompressing it fails
    const path = nodePath.join(directory, "emptyFileTest.pcore")
    fs.writeFileSync(path, "")

    const dataPbRead = PcoreFile.readPcoreBinary(path)

    expect(dataPbRead.sensors.length).toBe(0)
    expect(dataPbRead.compressedTimestampsContainer).toBeUndefined()
    expect(dataPbRead.metadata).toBeUndefined()
    expect(() => DataDecompressor.decompress(dataPbRead)).toThrow(InvalidDataException)
  })

  test("PcoreMinimalDataTest", () => {
    // empty data cannot be compressed since Pcore 2.1.0, so the smallest valid data has one timestamp and one sensor
    const path = nodePath.join(directory, "minimalTest.pcore")
    const sensor = new SensorBuilder().withIntValues([7]).withElectrocardiogramChannel(1).build()
    const data = new DataBuilder().withTimestamps([1]).withSensor(sensor).build()
    const dataPbWrite = DataCompressor.compress(data)
    expect(() => PcoreFile.writePcoreBinary(dataPbWrite, path)).not.toThrow()
    expect(fs.existsSync(path)).toBe(true)
    expect(fs.statSync(path).size).toBeGreaterThan(0)

    const dataPbRead = PcoreFile.readPcoreBinary(path)

    expect(dataPbRead).toEqual(dataPbWrite)
    expect(dataPbRead.metadata!.pcoreVersion!.major).toBe(PcoreVersion.major)
    expect(dataPbRead.metadata!.pcoreVersion!.minor).toBe(PcoreVersion.minor)
    expect(dataPbRead.metadata!.pcoreVersion!.patch).toBe(PcoreVersion.patch)
  })

  test("PcoreUnsafeIntegerTest", () => {
    // JavaScript-specific: 64-bit integers outside of the safe integer range cannot be read exactly
    const path = nodePath.join(directory, "unsafeIntegerTest.pcore")
    const sensor = new SensorBuilder().withIntValues([7]).withElectrocardiogramChannel(1).build()
    const dataPbWrite = DataCompressor.compress(new DataBuilder().withTimestamps([1]).withSensor(sensor).build())
    if (dataPbWrite.sensors[0].values.oneofKind === "intValuesContainer") {
      dataPbWrite.sensors[0].values.intValuesContainer.values = [2 ** 60]
    }
    // written without PcoreFile.writePcoreBinary, which would reject the value
    fs.writeFileSync(path, DataPb.toBinary(dataPbWrite))

    expect(() => PcoreFile.readPcoreBinary(path)).toThrow(WrongValueException)
  })

  test("PcoreTruncatedFileTest", () => {
    // no spec counterpart, the spec does not cover file handling: a file that ends too early, e.g. after an aborted download
    const path = nodePath.join(directory, "truncatedFileTest.pcore")
    const sensor = new SensorBuilder().withIntValues([7, 8, 9]).withElectrocardiogramChannel(1).build()
    const dataPbWrite = DataCompressor.compress(new DataBuilder().withTimestamps([1, 2, 3]).withSensor(sensor).build())
    const raw = DataPb.toBinary(dataPbWrite)
    fs.writeFileSync(path, raw.subarray(0, raw.length - 1))

    expect(() => PcoreFile.readPcoreBinary(path)).toThrow(InvalidDataException)
    expect(() => PcoreFile.readPcoreBinary(path)).toThrow("PcoreFile.readPcoreBinary: The file cannot be decoded as Pcore data")
  })

  test("PcoreForeignFileTest", () => {
    // no spec counterpart, the spec does not cover file handling: a file of another format with the extension .pcore
    const path = nodePath.join(directory, "foreignFileTest.pcore")
    fs.writeFileSync(path, "this is not a Pcore file")

    expect(() => PcoreFile.readPcoreBinary(path)).toThrow(InvalidDataException)
  })

  test("PcoreMissingFileTest", () => {
    // no spec counterpart, the spec does not cover file handling: errors of the file system are passed on unchanged
    const path = nodePath.join(directory, "missingFileTest.pcore")

    expect(() => PcoreFile.readPcoreBinary(path)).toThrow(expect.objectContaining({ code: "ENOENT" }))
    expect(() => PcoreFile.readPcoreBinary(path)).not.toThrow(InvalidDataException)
  })

  test("PcoreNormalDataTest", () => {
    const path = nodePath.join(directory, "normalTest.pcore")

    const data = buildNormalData()

    const dataPbWrite = DataCompressor.compress(data)

    expect(() => PcoreFile.writePcoreBinary(dataPbWrite, path)).not.toThrow()
    expect(fs.existsSync(path)).toBe(true)
    expect(fs.statSync(path).size).toBeGreaterThan(0)

    const dataPbRead = PcoreFile.readPcoreBinary(path)

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

  test("JsonMinimalDataTest", () => {
    const path = nodePath.join(directory, "minimalTest.pcore.json")
    const sensor = new SensorBuilder().withIntValues([7]).withElectrocardiogramChannel(1).build()
    const dataPbWrite = DataCompressor.compress(new DataBuilder().withTimestamps([1]).withSensor(sensor).build())
    const dataJsonWrite = Converter.convertToJson(dataPbWrite, DataForm.Compressed)
    expect(() => PcoreFile.writePcoreJson(dataJsonWrite, path)).not.toThrow()
    expect(fs.existsSync(path)).toBe(true)

    const dataJsonRead = PcoreFile.readPcoreJson(path)

    expect(dataJsonWrite).toBe(dataJsonRead)
  })

  test("JsonNormalDataTest", () => {
    const path = nodePath.join(directory, "normalTest.pcore.json")

    const data = buildNormalData()

    const dataPbWrite = DataCompressor.compress(data)
    const dataJsonWrite = Converter.convertToJson(dataPbWrite, DataForm.Compressed)

    expect(() => PcoreFile.writePcoreJson(dataJsonWrite, path)).not.toThrow()
    expect(fs.existsSync(path)).toBe(true)
    expect(fs.statSync(path).size).toBeGreaterThan(0)

    const dataJsonRead = PcoreFile.readPcoreJson(path)

    expect(dataJsonWrite).toBe(dataJsonRead)
  })
})
