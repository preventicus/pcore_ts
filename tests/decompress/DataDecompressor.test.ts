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

import { AccelerometerType, Color, DataPb, Sensor } from "@/ProtobufDefinitions"
import { Data, DataBuilder, DataCompressor, DataDecompressor, InvalidDataException, MetadataBuilder, SensorBuilder, WrongValueException } from "@/index"
import { PcoreVersion } from "@generated/pcoreVersion"
import { getIntValues, getDoubleValues, getAccelerometerType, getPhotoplethysmographWavelength, getPhotoplethysmographColor, getElectrocardiogramChannel } from "@/util/utils"

describe("DataDecompressorTest", () => {
  test("EmptyWithoutDecompressorTest", () => {
    const data = new DataBuilder().build()
    expect(data.metadata).toBeUndefined()
    expect(data.timestamps.length).toBe(0)
    expect(data.sensors.length).toBe(0)
  })

  // Sensors given as "int_values" / "double_values" in the spec get a sensor type that is valid and unique within the test
  function intSensor(values: number[]): Sensor {
    return new SensorBuilder().withIntValues(values).withElectrocardiogramChannel(1).build()
  }

  function doubleSensor(values: number[]): Sensor {
    return new SensorBuilder().withDoubleValues(values).withElectrocardiogramChannel(2).build()
  }

  interface Timestamps {
    first: number
    sizes: number[]
    inner: number[]
    outer: number[]
  }

  function decompress(timestamps: Timestamps | undefined, sensors: Sensor[], timezoneOffsetMin?: number): Data {
    const dataPb: DataPb = {
      metadata: timezoneOffsetMin === undefined ? undefined : new MetadataBuilder().withTimezoneOffset(timezoneOffsetMin).build(),
      compressedTimestampsContainer: timestamps === undefined ? undefined : {
        firstUnixTimestampMs: timestamps.first,
        sectionsSizes: timestamps.sizes,
        innerSectionsDurationsMs: timestamps.inner,
        outerSectionsDurationsMs: timestamps.outer
      },
      sensors
    }
    return DataDecompressor.decompress(dataPb)
  }

  test("EmptyWithDecompressorTest", () => {
    // empty data is not valid since Pcore 2.1.0 (decompression rule 1)
    expect(() => DataDecompressor.decompress(DataPb.create())).toThrow(InvalidDataException)
  })

  test("MissingUnixTimestampsTest", () => {
    expect(() => decompress(undefined, [intSensor([1, 2, 3])])).toThrow(InvalidDataException)
  })

  test("MissingSensorTest", () => {
    expect(() => decompress({ first: 1, sizes: [3], inner: [2], outer: [0] }, [])).toThrow(InvalidDataException)
  })

  test("EmptyTimestampsContainerTest", () => {
    expect(() => decompress({ first: 1, sizes: [], inner: [], outer: [] }, [intSensor([])])).toThrow(InvalidDataException)
  })

  test("TooLongInnerSectionsDurationsTest", () => {
    expect(() => decompress({ first: 1, sizes: [3], inner: [2, 2], outer: [0] }, [intSensor([1, 2, 3])])).toThrow(InvalidDataException)
  })

  test("TooLongOuterSectionsDurationsTest", () => {
    expect(() => decompress({ first: 1, sizes: [3], inner: [2], outer: [0, 10] }, [intSensor([1, 2, 3])])).toThrow(InvalidDataException)
  })

  test("TooLongSectionsSizesTest", () => {
    expect(() => decompress({ first: 1, sizes: [3, 3], inner: [2], outer: [0] }, [intSensor([1, 2, 3, 4, 5, 6])])).toThrow(InvalidDataException)
  })

  test("SensorIntValueCountMismatchTest", () => {
    expect(() => decompress({ first: 1, sizes: [5], inner: [2], outer: [0] }, [intSensor([3, 2])])).toThrow(InvalidDataException)
  })

  test("SensorDoubleValueCountMismatchTest", () => {
    expect(() => decompress({ first: 1, sizes: [5], inner: [2], outer: [0] }, [doubleSensor([3.1, 2.2])])).toThrow(InvalidDataException)
  })

  test("SectionsSizesSumOverflowTest", () => {
    expect(() => decompress({ first: 1, sizes: [4294967295, 4], inner: [1, 1], outer: [0, 4294967295] }, [intSensor([1, 1, 1])])).toThrow(InvalidDataException)
  })

  test("OuterSectionDurationFirstValueTest", () => {
    expect(() => decompress({ first: 1, sizes: [1], inner: [0], outer: [10] }, [doubleSensor([3.1])])).toThrow(InvalidDataException)
  })

  test("OuterSectionDurationValueTest", () => {
    expect(() => decompress({ first: 1, sizes: [1, 1], inner: [0, 0], outer: [0, 0] }, [doubleSensor([3.1, 2.2])])).toThrow(InvalidDataException)
  })

  test("OverlappingSectionsTest", () => {
    expect(() => decompress({ first: 1, sizes: [4, 4], inner: [1, 1], outer: [0, 2] }, [intSensor([1, 1, 1, 1, 1, 1, 1, 1])])).toThrow(InvalidDataException)
  })

  test("TouchingSectionsTest", () => {
    expect(() => decompress({ first: 1, sizes: [4, 4], inner: [1, 1], outer: [0, 3] }, [intSensor([1, 1, 1, 1, 1, 1, 1, 1])])).toThrow(InvalidDataException)
  })

  test("OverlappingSectionsOverflowTest", () => {
    expect(() => decompress({ first: 1, sizes: [3, 1], inner: [2147483648, 0], outer: [0, 1] }, [intSensor([1, 1, 1, 1])])).toThrow(InvalidDataException)
  })

  test("InnerSectionDurationZeroTest", () => {
    expect(() => decompress({ first: 1, sizes: [2, 1], inner: [0, 0], outer: [0, 1] }, [doubleSensor([3.1, 2.2, 1.3])])).toThrow(InvalidDataException)
  })

  test("InnerSectionDurationSingleTimestampTest", () => {
    expect(() => decompress({ first: 1, sizes: [1], inner: [2], outer: [0] }, [doubleSensor([3.1])])).toThrow(InvalidDataException)
  })

  test("InnerSectionDurationSingleTimestampLastSectionTest", () => {
    expect(() => decompress({ first: 1, sizes: [2, 1], inner: [2, 3], outer: [0, 5] }, [doubleSensor([3.1, 2.2, 1.3])])).toThrow(InvalidDataException)
  })

  test("ValidSingleTimestampLastSectionTest", () => {
    const data = decompress({ first: 1, sizes: [2, 1], inner: [2, 0], outer: [0, 5] }, [doubleSensor([3.1, 2.2, 1.3])])
    expect(data.timestamps).toEqual([1, 3, 6])
  })

  test("ValidSingleTimestampFirstSectionTest", () => {
    const data = decompress({ first: 1, sizes: [1, 3], inner: [0, 1], outer: [0, 5] }, [doubleSensor([3.1, 2.2, 1.3, 0.4])])
    expect(data.timestamps).toEqual([1, 6, 7, 8])
  })

  test("SectionsSizesZeroTest", () => {
    expect(() => decompress({ first: 1, sizes: [2, 0], inner: [2, 2], outer: [0, 5] }, [doubleSensor([3.1, 2.2])])).toThrow(InvalidDataException)
  })

  test("IntValueOverflowTest", () => {
    // The spec uses the int64 maximum. This library stores 64-bit integers as number,
    // so the limit is Number.MAX_SAFE_INTEGER.
    expect(() => decompress({ first: 1, sizes: [2], inner: [1], outer: [0] }, [intSensor([Number.MAX_SAFE_INTEGER, 1])])).toThrow(WrongValueException)
  })

  test("UnsafeIntValueTest", () => {
    // JavaScript-specific: 64-bit integers are stored as number and must be safe integers
    expect(() => decompress({ first: 1, sizes: [2], inner: [1], outer: [0] }, [intSensor([2 ** 53, 0])])).toThrow(WrongValueException)
  })

  test("UnsafeUnixTimestampTest", () => {
    // JavaScript-specific: the decompressed timestamps must be safe integers
    expect(() => decompress({ first: Number.MAX_SAFE_INTEGER, sizes: [2], inner: [1], outer: [0] }, [intSensor([1, 2])])).toThrow(WrongValueException)
    expect(() => decompress({ first: Number.MAX_SAFE_INTEGER - 1, sizes: [2], inner: [1], outer: [0] }, [intSensor([1, 2])])).not.toThrow()
  })

  test("NoUnsignedIntegerInTimestampsContainerTest", () => {
    // JavaScript-specific: number also holds negative values and fractions, which protobuf excludes by the type uint32 / uint64.
    // Without the check the first case would decompress to the timestamps [100, 95, 90, 92, 93].
    const sensors = [intSensor([1, 1, 1, 1, 1])]
    expect(() => decompress({ first: 100, sizes: [3, 2], inner: [-5, 1], outer: [0, -8] }, sensors)).toThrow(WrongValueException)
    expect(() => decompress({ first: 100, sizes: [3, 2], inner: [1.5, 1], outer: [0, 8] }, sensors)).toThrow(WrongValueException)
    expect(() => decompress({ first: 100, sizes: [3, 2], inner: [1, 1], outer: [0, 4294967296] }, sensors)).toThrow(WrongValueException)
    expect(() => decompress({ first: 100, sizes: [2.5, 2.5], inner: [1, 1], outer: [0, 8] }, sensors)).toThrow(WrongValueException)
    expect(() => decompress({ first: 100, sizes: [3, 2], inner: [NaN, 1], outer: [0, 8] }, sensors)).toThrow(WrongValueException)
    expect(() => decompress({ first: -100, sizes: [3, 2], inner: [1, 1], outer: [0, 8] }, sensors)).toThrow(WrongValueException)
    expect(() => decompress({ first: 100.5, sizes: [3, 2], inner: [1, 1], outer: [0, 8] }, sensors)).toThrow(WrongValueException)
    expect(decompress({ first: 100, sizes: [3, 2], inner: [1, 1], outer: [0, 4294967295] }, sensors).timestamps).toEqual([100, 101, 102, 4294967395, 4294967396])
  })

  test("NoIntegerInSensorTypeTest", () => {
    // JavaScript-specific: number also holds negative values and fractions, which protobuf excludes by the types uint32 and enum
    const timestamps = { first: 1, sizes: [1], inner: [0], outer: [0] }
    const sensorsWithInvalidType = [
      new SensorBuilder().withIntValues([1]).withElectrocardiogramChannel(-1).build(),
      new SensorBuilder().withIntValues([1]).withElectrocardiogramChannel(1.5).build(),
      new SensorBuilder().withIntValues([1]).withElectrocardiogramChannel(NaN).build(),
      new SensorBuilder().withIntValues([1]).withPhotoplethysmographColor(Color.GREEN, -1).build(),
      new SensorBuilder().withIntValues([1]).withPhotoplethysmographWavelength(530, 4294967296).build(),
      new SensorBuilder().withIntValues([1]).withPhotoplethysmographWavelength(400.5).build(),
      new SensorBuilder().withIntValues([1]).withAccelerometerType(AccelerometerType.X_COORDINATE, 0.5).build(),
      new SensorBuilder().withIntValues([1]).withAccelerometerType(1.5 as AccelerometerType).build()
    ]
    const sensorWithMaxChannel = new SensorBuilder().withIntValues([1]).withPhotoplethysmographColor(Color.GREEN, 4294967295).build()

    sensorsWithInvalidType.forEach(sensor => {
      expect(() => decompress(timestamps, [sensor])).toThrow(WrongValueException)
    })
    expect(() => decompress(timestamps, [sensorWithMaxChannel])).not.toThrow()
  })

  test("NoIntegerTimeZoneOffsetTest", () => {
    // JavaScript-specific: the timezone offset is an integer in protobuf
    const timestamps = { first: 1, sizes: [1], inner: [0], outer: [0] }
    expect(() => decompress(timestamps, [intSensor([1])], 1.5)).toThrow(WrongValueException)
    expect(() => decompress(timestamps, [intSensor([1])], NaN)).toThrow(WrongValueException)
  })

  test("NoUnsignedIntegerVersionTest", () => {
    // JavaScript-specific: version numbers are uint32 in protobuf
    const decompressWithVersions = (pcoreVersionMajor: number, firmwareVersionPatch: number) => {
      const dataPb = DataCompressor.compress(new DataBuilder().withTimestamps([1]).withSensor(intSensor([1])).build())
      dataPb.metadata = {
        timezoneOffsetMin: 0,
        pcoreVersion: { major: pcoreVersionMajor, minor: 1, patch: 0 },
        device: { name: "", manufacturer: "", id: "", firmwareVersion: { major: 1, minor: 2, patch: firmwareVersionPatch } }
      }
      return DataDecompressor.decompress(dataPb)
    }
    expect(() => decompressWithVersions(-2, 3)).toThrow(WrongValueException)
    expect(() => decompressWithVersions(2.1, 3)).toThrow(WrongValueException)
    expect(() => decompressWithVersions(2, -3)).toThrow(WrongValueException)
    expect(() => decompressWithVersions(2, 4294967295)).not.toThrow()
  })

  test("NonFiniteDoubleValueTest", () => {
    // not covered by the spec test cases, because JSON cannot represent NaN and Infinity
    const timestamps = { first: 1, sizes: [3], inner: [1], outer: [0] }
    expect(() => decompress(timestamps, [doubleSensor([1, NaN, 3])])).toThrow(WrongValueException)
    expect(() => decompress(timestamps, [doubleSensor([1, Infinity, 3])])).toThrow(WrongValueException)
    expect(() => decompress(timestamps, [doubleSensor([1, -Infinity, 3])])).toThrow(WrongValueException)
  })

  test("WrongTimeZoneOffsetNegativeTest", () => {
    expect(() => decompress({ first: 1, sizes: [3], inner: [1], outer: [0] }, [intSensor([1, 1, 1])], -721)).toThrow(WrongValueException)
  })

  test("WrongTimeZoneOffsetPositiveTest", () => {
    expect(() => decompress({ first: 1, sizes: [3], inner: [1], outer: [0] }, [intSensor([1, 1, 1])], 841)).toThrow(WrongValueException)
  })

  test("MinTimeZoneOffsetTest", () => {
    const data = decompress({ first: 1, sizes: [3], inner: [1], outer: [0] }, [intSensor([1, 1, 1])], -720)
    expect(data.metadata?.timezoneOffsetMin).toBe(-720)
  })

  test("MaxTimeZoneOffsetTest", () => {
    const data = decompress({ first: 1, sizes: [3], inner: [1], outer: [0] }, [intSensor([1, 1, 1])], 840)
    expect(data.metadata?.timezoneOffsetMin).toBe(840)
  })

  test("LegacyDuplicatePpgSensorTest", () => {
    const sensors = [
      new SensorBuilder().withIntValues([1, 1, 1]).withPhotoplethysmographColor(Color.GREEN).build(),
      new SensorBuilder().withIntValues([2, 2, 2]).withPhotoplethysmographColor(Color.GREEN).build()
    ]
    const data = decompress({ first: 1, sizes: [3], inner: [1], outer: [0] }, sensors)
    expect(getIntValues(data.sensors[0])).toEqual([1, 2, 3])
    expect(getIntValues(data.sensors[1])).toEqual([2, 4, 6])
  })

  test("LegacyDuplicateAccSensorTest", () => {
    const sensors = [
      new SensorBuilder().withIntValues([1, 1, 1]).withAccelerometerType(AccelerometerType.X_COORDINATE).build(),
      new SensorBuilder().withIntValues([2, 2, 2]).withAccelerometerType(AccelerometerType.X_COORDINATE).build()
    ]
    const data = decompress({ first: 1, sizes: [3], inner: [1], outer: [0] }, sensors)
    expect(getIntValues(data.sensors[0])).toEqual([1, 2, 3])
    expect(getIntValues(data.sensors[1])).toEqual([2, 4, 6])
  })

  test("MissingPpgLightTest", () => {
    const sensor: Sensor = {
      values: { oneofKind: "intValuesContainer", intValuesContainer: { values: [1, 1, 1] } },
      type: { oneofKind: "photoplethysmograph", photoplethysmograph: { light: { oneofKind: undefined }, channel: 0 } }
    }
    expect(() => decompress({ first: 1, sizes: [3], inner: [1], outer: [0] }, [sensor])).toThrow(InvalidDataException)
  })

  test("PpgColorUnspecifiedTest", () => {
    const sensor = new SensorBuilder().withIntValues([1, 1, 1]).withPhotoplethysmographColor(Color.UNSPECIFIED).build()
    expect(() => decompress({ first: 1, sizes: [3], inner: [1], outer: [0] }, [sensor])).toThrow(WrongValueException)
  })

  test("MinPpgWavelengthTest", () => {
    const sensor = new SensorBuilder().withIntValues([1, 1, 1]).withPhotoplethysmographWavelength(350).build()
    expect(() => decompress({ first: 1, sizes: [3], inner: [1], outer: [0] }, [sensor])).not.toThrow()
  })

  test("PpgWavelengthTooSmallTest", () => {
    const sensor = new SensorBuilder().withIntValues([1, 1, 1]).withPhotoplethysmographWavelength(349).build()
    expect(() => decompress({ first: 1, sizes: [3], inner: [1], outer: [0] }, [sensor])).toThrow(WrongValueException)
  })

  test("MaxPpgWavelengthTest", () => {
    const sensor = new SensorBuilder().withIntValues([1, 1, 1]).withPhotoplethysmographWavelength(1000).build()
    expect(() => decompress({ first: 1, sizes: [3], inner: [1], outer: [0] }, [sensor])).not.toThrow()
  })

  test("PpgWavelengthTooLargeTest", () => {
    const sensor = new SensorBuilder().withIntValues([1, 1, 1]).withPhotoplethysmographWavelength(1001).build()
    expect(() => decompress({ first: 1, sizes: [3], inner: [1], outer: [0] }, [sensor])).toThrow(WrongValueException)
  })

  test("AccTypeUnspecifiedTest", () => {
    const sensor = new SensorBuilder().withIntValues([1, 1, 1]).withAccelerometerType(AccelerometerType.UNSPECIFIED).build()
    expect(() => decompress({ first: 1, sizes: [3], inner: [1], outer: [0] }, [sensor])).toThrow(WrongValueException)
  })

  test("MaxEcgChannelTest", () => {
    const sensor = new SensorBuilder().withIntValues([1, 1, 1]).withElectrocardiogramChannel(22).build()
    expect(() => decompress({ first: 1, sizes: [3], inner: [1], outer: [0] }, [sensor])).not.toThrow()
  })

  test("EcgChannelTooLargeTest", () => {
    const sensor = new SensorBuilder().withIntValues([1, 1, 1]).withElectrocardiogramChannel(23).build()
    expect(() => decompress({ first: 1, sizes: [3], inner: [1], outer: [0] }, [sensor])).toThrow(WrongValueException)
  })

  test("MissingSensorTypeTest", () => {
    // sensor types are intentionally not checked when decompressing
    const sensor = new SensorBuilder().withIntValues([1, 1, 1]).build()
    const data = decompress({ first: 1, sizes: [3], inner: [1], outer: [0] }, [sensor])
    expect(data.sensors[0].type.oneofKind).toBeUndefined()
  })

  test("MetaDataTest", () => {
    const metaData = new MetadataBuilder()
      .withTimezoneOffset(400)
      .withDeviceId("123")
      .withDeviceName("ABC")
      .withDeviceManufacturer("XYZ")
      .withDeviceFirmwareVersion(3, 4, 1)
      .build()

    const dataPb: DataPb = {
      metadata: metaData,
      compressedTimestampsContainer: {
        firstUnixTimestampMs: 1,
        sectionsSizes: [1],
        innerSectionsDurationsMs: [0],
        outerSectionsDurationsMs: [0]
      },
      sensors: [intSensor([5])]
    }

    const decompressed = DataDecompressor.decompress(dataPb)

    expect(decompressed.metadata).toBeDefined()
    expect(decompressed.metadata?.device).toBeDefined()
    expect(decompressed.metadata?.pcoreVersion).toBeDefined()

    expect(decompressed.metadata?.timezoneOffsetMin).toBe(400)

    expect(decompressed.metadata?.pcoreVersion?.major).toBe(PcoreVersion.major)
    expect(decompressed.metadata?.pcoreVersion?.minor).toBe(PcoreVersion.minor)
    expect(decompressed.metadata?.pcoreVersion?.patch).toBe(PcoreVersion.patch)

    expect(decompressed.metadata?.device?.name).toBe("ABC")
    expect(decompressed.metadata?.device?.manufacturer).toBe("XYZ")
    expect(decompressed.metadata?.device?.id).toBe("123")

    expect(decompressed.metadata?.device?.firmwareVersion?.major).toBe(3)
    expect(decompressed.metadata?.device?.firmwareVersion?.minor).toBe(4)
    expect(decompressed.metadata?.device?.firmwareVersion?.patch).toBe(1)
  })

  test("CompleteTest", () => {
    const metadataPb = new MetadataBuilder()
      .withTimezoneOffset(310)
      .withDeviceId("I3212JH")
      .withDeviceFirmwareVersion(3, 2, 1)
      .withDeviceName("Name")
      .withDeviceManufacturer("Xw2")
      .build()

    const sensorsPb: Sensor[] = []

    sensorsPb.push(new SensorBuilder()
      .withIntValues([0, 3, -2, 2, -1])
      .withPhotoplethysmographColor(Color.RED)
      .build()
    )

    sensorsPb.push(new SensorBuilder()
      .withIntValues([3, 2, -3, -1, 3])
      .withPhotoplethysmographColor(Color.GREEN)
      .build()
    )

    sensorsPb.push(new SensorBuilder()
      .withIntValues([0, 0, 0, 0, 0])
      .withPhotoplethysmographColor(Color.BLUE)
      .build()
    )

    sensorsPb.push(new SensorBuilder()
      .withIntValues([4, 2, -3, -1, 2])
      .withPhotoplethysmographWavelength(400)
      .build()
    )

    sensorsPb.push(new SensorBuilder()
      .withIntValues([0, 0, 0, -200, 200])
      .withAccelerometerType(AccelerometerType.X_COORDINATE)
      .build()
    )

    sensorsPb.push(new SensorBuilder()
      .withIntValues([0, 0, 0, 200, -200])
      .withAccelerometerType(AccelerometerType.Y_COORDINATE)
      .build()
    )

    sensorsPb.push(new SensorBuilder()
      .withIntValues([0, 100, -100, -200, 200])
      .withAccelerometerType(AccelerometerType.Z_COORDINATE)
      .build()
    )

    sensorsPb.push(new SensorBuilder()
      .withDoubleValues([3.21274389, 8.723849, 400.782934, 43.839240, 64.34894])
      .withAccelerometerType(AccelerometerType.EUCLIDEAN_DIFFERENCES_NORM)
      .build()
    )

    sensorsPb.push(new SensorBuilder()
      .withIntValues([0, 0, 0, 40, -40])
      .withElectrocardiogramChannel(1)
      .build()
    )

    sensorsPb.push(new SensorBuilder()
      .withIntValues([0, 40, -40, 20, -20])
      .withElectrocardiogramChannel(2)
      .build()
    )

    const dataPb: DataPb = {
      metadata: metadataPb,
      compressedTimestampsContainer: {
        firstUnixTimestampMs: 1,
        innerSectionsDurationsMs: [1],
        outerSectionsDurationsMs: [0],
        sectionsSizes: [5]
      },
      sensors: sensorsPb
    }

    const data = DataDecompressor.decompress(dataPb)

    expect(data.metadata).toBeDefined()

    expect(data.metadata?.device).toBeDefined()
    expect(data.metadata?.device?.name).toBe("Name")
    expect(data.metadata?.device?.manufacturer).toBe("Xw2")
    expect(data.metadata?.device?.id).toBe("I3212JH")
    expect(data.metadata?.device?.firmwareVersion).toBeDefined()
    expect(data.metadata?.device?.firmwareVersion?.major).toBe(3)
    expect(data.metadata?.device?.firmwareVersion?.minor).toBe(2)
    expect(data.metadata?.device?.firmwareVersion?.patch).toBe(1)

    expect(data.metadata?.pcoreVersion).toBeDefined()
    expect(data.metadata?.pcoreVersion?.major).toBe(PcoreVersion.major)
    expect(data.metadata?.pcoreVersion?.minor).toBe(PcoreVersion.minor)
    expect(data.metadata?.pcoreVersion?.patch).toBe(PcoreVersion.patch)

    expect(data.metadata?.timezoneOffsetMin).toBe(310)

    expect(data.timestamps.length).toBe(5)
    expect(data.timestamps).toEqual([1, 2, 3, 4, 5])

    expect(data.sensors.length).toBe(10)

    expect(data.sensors[0].type.oneofKind).toBe("photoplethysmograph")
    expect(getPhotoplethysmographColor(data.sensors[0])).toBe(Color.RED)
    expect(getIntValues(data.sensors[0])).toEqual([0, 3, 1, 3, 2])

    expect(data.sensors[1].type.oneofKind).toBe("photoplethysmograph")
    expect(getPhotoplethysmographColor(data.sensors[1])).toBe(Color.GREEN)
    expect(getIntValues(data.sensors[1])).toEqual([3, 5, 2, 1, 4])

    expect(data.sensors[2].type.oneofKind).toBe("photoplethysmograph")
    expect(getPhotoplethysmographColor(data.sensors[2])).toBe(Color.BLUE)
    expect(getIntValues(data.sensors[2])).toEqual([0, 0, 0, 0, 0])

    expect(data.sensors[3].type.oneofKind).toBe("photoplethysmograph")
    expect(getPhotoplethysmographWavelength(data.sensors[3])).toBe(400)
    expect(getIntValues(data.sensors[3])).toEqual([4, 6, 3, 2, 4])

    expect(data.sensors[4].type.oneofKind).toBe("accelerometer")
    expect(getAccelerometerType(data.sensors[4])).toBe(AccelerometerType.X_COORDINATE)
    expect(getIntValues(data.sensors[4])).toEqual([0, 0, 0, -200, 0])

    expect(data.sensors[5].type.oneofKind).toBe("accelerometer")
    expect(getAccelerometerType(data.sensors[5])).toBe(AccelerometerType.Y_COORDINATE)
    expect(getIntValues(data.sensors[5])).toEqual([0, 0, 0, 200, 0])

    expect(data.sensors[6].type.oneofKind).toBe("accelerometer")
    expect(getAccelerometerType(data.sensors[6])).toBe(AccelerometerType.Z_COORDINATE)
    expect(getIntValues(data.sensors[6])).toEqual([0, 100, 0, -200, 0])

    expect(data.sensors[7].type.oneofKind).toBe("accelerometer")
    expect(getAccelerometerType(data.sensors[7])).toBe(AccelerometerType.EUCLIDEAN_DIFFERENCES_NORM)
    expect(getDoubleValues(data.sensors[7])).toEqual([3.21274389, 8.723849, 400.782934, 43.839240, 64.34894])

    expect(data.sensors[8].type.oneofKind).toBe("electrocardiogram")
    expect(getElectrocardiogramChannel(data.sensors[8])).toBe(1)
    expect(getIntValues(data.sensors[8])).toEqual([0, 0, 0, 40, 0])

    expect(data.sensors[9].type.oneofKind).toBe("electrocardiogram")
    expect(getElectrocardiogramChannel(data.sensors[9])).toBe(2)
    expect(getIntValues(data.sensors[9])).toEqual([0, 40, 0, 20, 0])
  })
})
