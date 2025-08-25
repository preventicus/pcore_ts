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

import { DataPb } from "../../../src/ProtobufDefinitions"
import { Inspector } from "../../../src/tools/inspector/Inspector"
import { SensorBuilder } from "../../../src/builder/SensorBuilder"
import { DataBuilder, MetadataBuilder } from "../../../src"

describe("InspectorTest", () => {
  test("GetFirstUnixTimestampEmptyTest", () => {
    const dataPb = DataPb.create()
    expect(Inspector.getFirstUnixTimestamp(dataPb)).toBe(0)
  })

  test("GetFirstUnixTimestampTest", () => {
    const dataPb = DataPb.create({
      compressedTimestampsContainer: {
        firstUnixTimestampMs: 1000
      }
    })
    expect(Inspector.getFirstUnixTimestamp(dataPb)).toBe(1000)
  })

  test("GetLastUnixTimestampEmptyTest", () => {
    const dataPb = DataPb.create()
    expect(Inspector.getLastUnixTimestamp(dataPb)).toBe(0)
  })

  test("GetLastUnixTimestampTest", () => {
    const dataPb = DataPb.create({
      compressedTimestampsContainer: {
        firstUnixTimestampMs: 1000,
        innerSectionsDurationsMs: [10, 20],
        outerSectionsDurationsMs: [0, 50],
        sectionsSizes: [4, 2]
      }
    })
    expect(Inspector.getLastUnixTimestamp(dataPb)).toBe(1070)
  })

  test("GetLastUnixTimestampTest2", () => {
    const dataPb = DataPb.create({
      compressedTimestampsContainer: {
        firstUnixTimestampMs: 1000,
        innerSectionsDurationsMs: [10, 0],
        outerSectionsDurationsMs: [0, 50],
        sectionsSizes: [4, 1]
      }
    })
    expect(Inspector.getLastUnixTimestamp(dataPb)).toBe(1050)
  })

  test("GetLastUnixTimestampTest3", () => {
    const dataPb = DataPb.create({
      compressedTimestampsContainer: {
        firstUnixTimestampMs: 1000,
        innerSectionsDurationsMs: [10],
        outerSectionsDurationsMs: [0],
        sectionsSizes: [4]
      }
    })
    expect(Inspector.getLastUnixTimestamp(dataPb)).toBe(1030)
  })

  test("GetNumberOfSectionsEmptyTest", () => {
    const dataPb = DataPb.create()
    expect(Inspector.getNumberOfSections(dataPb)).toBe(0)
  })

  test("GetNumberOfSectionsTest", () => {
    const dataPb = DataPb.create({
      compressedTimestampsContainer: {
        firstUnixTimestampMs: 1000,
        innerSectionsDurationsMs: [10, 20, 0],
        outerSectionsDurationsMs: [0, 50, 50],
        sectionsSizes: [4, 1, 5]
      }
    })
    expect(Inspector.getNumberOfSections(dataPb)).toBe(3)
  })

  test("GetNumberOfElementsEmptyTest", () => {
    const dataPb = DataPb.create()
    expect(Inspector.getNumberOfElements(dataPb)).toBe(0)
  })

  test("GetNumberOfElementsEmptyTest", () => {
    const sensor = new SensorBuilder()
      .withIntValues([1, 2, 3])
      .build()
    const dataPb = DataPb.create({
      sensors: [sensor]
    })
    expect(Inspector.getNumberOfElements(dataPb)).toBe(3)
  })

  test("GetNumberOfElementsOverDoubleValuesTest", () => {
    const sensor = new SensorBuilder()
      .withDoubleValues([1.4, 2.2, 3.7])
      .build()
    const dataPb = DataPb.create({
      sensors: [sensor]
    })
    expect(Inspector.getNumberOfElements(dataPb)).toBe(3)
  })

  test("ValidateCompressedWithWrongTimeZoneOffsetPositiveTest", () => {
    const metaData = new MetadataBuilder()
      .withTimezoneOffset(841)
      .build()

    const data = new DataBuilder()
      .withMetadata(metaData)
      .build()

    expect(() => Inspector.validateCompressed(data)).toThrow(
      "TimezoneOffset must be between -720 and 840"
    )

    expect(() => Inspector.validateDecompressed(data)).toThrow(
      "TimezoneOffset must be between -720 and 840"
    )
  })

  test("ValidateCompressedWithWrongTimeZoneOffsetNegativeTest", () => {
    const metaData = new MetadataBuilder()
      .withTimezoneOffset(-721)
      .build()

    const data = new DataBuilder()
      .withMetadata(metaData)
      .build()

    expect(() => Inspector.validateCompressed(data)).toThrow(
      "TimezoneOffset must be between -720 and 840"
    )

    expect(() => Inspector.validateDecompressed(data)).toThrow(
      "TimezoneOffset must be between -720 and 840"
    )
  })
})
