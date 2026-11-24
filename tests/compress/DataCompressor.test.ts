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
import { DataBuilder, DataCompressor, InvalidDataException, MetadataBuilder, SensorBuilder, WrongValueException } from "@/index"
import { PcoreVersion } from "@generated/pcoreVersion"
import { getIntValues, getDoubleValues, getAccelerometerType, getPhotoplethysmographWavelength, getPhotoplethysmographColor, getElectrocardiogramChannel } from "@/util/utils"

describe("DataCompressorTest", () => {
  test("EmptyWithoutCompressorTest", () => {
    const dataPb = DataPb.create()
    expect(dataPb.metadata).toBeUndefined()
    expect(dataPb.compressedTimestampsContainer).toBeUndefined()
    expect(dataPb.sensors.length).toBe(0)
  })

  // Sensors given as "int_values" / "double_values" in the spec get a sensor type that is valid and unique within the test
  function intSensor(values: number[]): Sensor {
    return new SensorBuilder().withIntValues(values).withElectrocardiogramChannel(1).build()
  }

  function doubleSensor(values: number[]): Sensor {
    return new SensorBuilder().withDoubleValues(values).withElectrocardiogramChannel(2).build()
  }

  function compress(timestamps: number[], sensors: Sensor[], timezoneOffsetMin?: number): DataPb {
    const builder = new DataBuilder().withTimestamps(timestamps).withSensors(sensors)
    if (timezoneOffsetMin !== undefined) {
      builder.withMetadata(new MetadataBuilder().withTimezoneOffset(timezoneOffsetMin).build())
    }
    return DataCompressor.compress(builder.build())
  }

  test("EmptyWithCompressorTest", () => {
    // empty data is not valid since Pcore 2.1.0 (compression rule 1)
    expect(() => DataCompressor.compress(new DataBuilder().build())).toThrow(InvalidDataException)
  })

  test("MissingUnixTimestampsTest", () => {
    expect(() => compress([], [intSensor([0, 3, 1, 3, 2])])).toThrow(InvalidDataException)
  })

  test("MissingSensorTest", () => {
    expect(() => compress([1, 2, 3, 4, 5], [])).toThrow(InvalidDataException)
  })

  test("DifferentNumberSensorIntValuesTest", () => {
    expect(() => compress([1, 2, 3, 4, 5], [intSensor([3, 1, 3, 2, 7, 6, 4])])).toThrow(InvalidDataException)
  })

  test("DifferentNumberSensorDoubleValuesTest", () => {
    expect(() => compress([1, 2, 3, 4, 5], [doubleSensor([3, 1, 3, 2, 7, 6, 4])])).toThrow(InvalidDataException)
  })

  test("DifferentNumberSensorMixedValuesTest", () => {
    expect(() => compress([1, 2, 3, 4, 5], [doubleSensor([3, 1, 3, 2, 7]), intSensor([3, 1, 3, 2, 7, 6, 4])])).toThrow(InvalidDataException)
  })

  test("SensorWithoutValuesTest", () => {
    // a sensor without values container has no values, so the number of values does not match
    const sensor = new SensorBuilder().withElectrocardiogramChannel(1).build()
    expect(() => compress([1, 2, 3], [sensor])).toThrow(InvalidDataException)
  })

  test("WrongTimeZoneOffsetNegativeTest", () => {
    expect(() => compress([1, 2, 3], [intSensor([1, 2, 3])], -721)).toThrow(WrongValueException)
  })

  test("WrongTimeZoneOffsetPositiveTest", () => {
    expect(() => compress([1, 2, 3], [intSensor([1, 2, 3])], 841)).toThrow(WrongValueException)
  })

  test("MinTimeZoneOffsetTest", () => {
    expect(() => compress([1, 2, 3], [intSensor([1, 2, 3])], -720)).not.toThrow()
  })

  test("MaxTimeZoneOffsetTest", () => {
    expect(() => compress([1, 2, 3], [intSensor([1, 2, 3])], 840)).not.toThrow()
  })

  test("DuplicateUnixTimestampsTest", () => {
    expect(() => compress([1, 2, 2, 3, 4], [intSensor([1, 2, 3, 4, 5])])).toThrow(InvalidDataException)
  })

  test("DecreasingUnixTimestampsTest", () => {
    expect(() => compress([1, 3, 2, 4, 5], [intSensor([1, 2, 3, 4, 5])])).toThrow(InvalidDataException)
  })

  test("NegativeUnixTimestampTest", () => {
    expect(() => compress([-2, -1, 0], [intSensor([1, 2, 3])])).toThrow(WrongValueException)
  })

  test("UnsafeUnixTimestampTest", () => {
    // JavaScript-specific: 64-bit integers are stored as number and must be safe integers
    expect(() => compress([2 ** 53], [intSensor([1])])).toThrow(WrongValueException)
    expect(() => compress([1, 2.5, 4], [intSensor([1, 2, 3])])).toThrow(WrongValueException)
  })

  test("MaxSectionDurationTest", () => {
    expect(() => compress([0, 4294967295], [intSensor([1, 2])])).not.toThrow()
  })

  test("InnerSectionDurationOverflowTest", () => {
    expect(() => compress([0, 4294967296], [intSensor([1, 2])])).toThrow(WrongValueException)
  })

  test("OuterSectionDurationOverflowTest", () => {
    expect(() => compress([0, 1, 2, 4294967297], [intSensor([1, 2, 3, 4])])).toThrow(WrongValueException)
  })

  // The spec uses the int64 limits for the following two cases. This library stores 64-bit integers
  // as number, so the limits are those of safe integers (Number.MIN_SAFE_INTEGER / Number.MAX_SAFE_INTEGER).
  test("MaxIntValueDeltaTest", () => {
    expect(() => compress([1, 2], [intSensor([Number.MIN_SAFE_INTEGER, 0])])).not.toThrow()
  })

  test("IntValueDeltaOverflowTest", () => {
    expect(() => compress([1, 2], [intSensor([Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER])])).toThrow(WrongValueException)
  })

  test("UnsafeIntValueTest", () => {
    // JavaScript-specific: 64-bit integers are stored as number and must be safe integers
    expect(() => compress([1, 2], [intSensor([2 ** 53, 0])])).toThrow(WrongValueException)
    expect(() => compress([1, 2], [intSensor([1.5, 0])])).toThrow(WrongValueException)
  })

  test("NoIntegerInSensorTypeTest", () => {
    // JavaScript-specific: number also holds negative values and fractions, which protobuf excludes by the types uint32 and enum.
    // Without the check these sensors would be compressed and fail only when the binary is written.
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
      expect(() => compress([1], [sensor])).toThrow(WrongValueException)
    })
    expect(() => DataPb.toBinary(compress([1], [sensorWithMaxChannel]))).not.toThrow()
  })

  test("NoIntegerTimeZoneOffsetTest", () => {
    // JavaScript-specific: the timezone offset is an integer in protobuf
    expect(() => compress([1], [intSensor([1])], 1.5)).toThrow(WrongValueException)
    expect(() => compress([1], [intSensor([1])], NaN)).toThrow(WrongValueException)
  })

  test("NoUnsignedIntegerVersionTest", () => {
    // JavaScript-specific: version numbers are uint32 in protobuf
    const compressWithFirmwareVersion = (major: number, minor: number, patch: number) => {
      const metadata = new MetadataBuilder().withDeviceFirmwareVersion(major, minor, patch).build()
      return DataCompressor.compress(new DataBuilder().withTimestamps([1]).withSensor(intSensor([1])).withMetadata(metadata).build())
    }
    expect(() => compressWithFirmwareVersion(-1, 0, 0)).toThrow(WrongValueException)
    expect(() => compressWithFirmwareVersion(1, 2.5, 0)).toThrow(WrongValueException)
    expect(() => compressWithFirmwareVersion(1, 2, 4294967296)).toThrow(WrongValueException)
    expect(() => DataPb.toBinary(compressWithFirmwareVersion(1, 2, 4294967295))).not.toThrow()
  })

  test("NonFiniteDoubleValueTest", () => {
    // not covered by the spec test cases, because JSON cannot represent NaN and Infinity
    expect(() => compress([1, 2, 3], [doubleSensor([1, NaN, 3])])).toThrow(WrongValueException)
    expect(() => compress([1, 2, 3], [doubleSensor([1, Infinity, 3])])).toThrow(WrongValueException)
    expect(() => compress([1, 2, 3], [doubleSensor([1, -Infinity, 3])])).toThrow(WrongValueException)
  })

  test("MissingSensorTypeTest", () => {
    const sensor = new SensorBuilder().withIntValues([1, 2, 3]).build()
    expect(() => compress([1, 2, 3], [sensor])).toThrow(InvalidDataException)
  })

  test("DuplicatePpgSensorTest", () => {
    const sensors = [
      new SensorBuilder().withIntValues([1, 2, 3]).withPhotoplethysmographColor(Color.GREEN).build(),
      new SensorBuilder().withIntValues([4, 5, 6]).withPhotoplethysmographColor(Color.GREEN).build()
    ]
    expect(() => compress([1, 2, 3], sensors)).toThrow(InvalidDataException)
  })

  test("DuplicatePpgSensorExplicitChannelTest", () => {
    const sensors = [
      new SensorBuilder().withIntValues([1, 2, 3]).withPhotoplethysmographColor(Color.GREEN, 0).build(),
      new SensorBuilder().withIntValues([4, 5, 6]).withPhotoplethysmographColor(Color.GREEN).build()
    ]
    expect(() => compress([1, 2, 3], sensors)).toThrow(InvalidDataException)
  })

  test("DistinctPpgChannelsTest", () => {
    const sensors = [
      new SensorBuilder().withIntValues([1, 2, 3]).withPhotoplethysmographColor(Color.GREEN, 0).build(),
      new SensorBuilder().withIntValues([4, 5, 6]).withPhotoplethysmographColor(Color.GREEN, 1).build()
    ]
    expect(() => compress([1, 2, 3], sensors)).not.toThrow()
  })

  test("DistinctPpgLightTest", () => {
    const sensors = [
      new SensorBuilder().withIntValues([1, 2, 3]).withPhotoplethysmographColor(Color.GREEN).build(),
      new SensorBuilder().withIntValues([4, 5, 6]).withPhotoplethysmographColor(Color.RED).build()
    ]
    expect(() => compress([1, 2, 3], sensors)).not.toThrow()
  })

  test("DuplicateAccSensorTest", () => {
    const sensors = [
      new SensorBuilder().withIntValues([1, 2, 3]).withAccelerometerType(AccelerometerType.X_COORDINATE, 1).build(),
      new SensorBuilder().withIntValues([4, 5, 6]).withAccelerometerType(AccelerometerType.X_COORDINATE, 1).build()
    ]
    expect(() => compress([1, 2, 3], sensors)).toThrow(InvalidDataException)
  })

  test("DistinctAccChannelsTest", () => {
    const sensors = [
      new SensorBuilder().withIntValues([1, 2, 3]).withAccelerometerType(AccelerometerType.X_COORDINATE, 0).build(),
      new SensorBuilder().withIntValues([4, 5, 6]).withAccelerometerType(AccelerometerType.X_COORDINATE, 1).build()
    ]
    expect(() => compress([1, 2, 3], sensors)).not.toThrow()
  })

  test("DistinctAccTypesTest", () => {
    const sensors = [
      new SensorBuilder().withIntValues([1, 2, 3]).withAccelerometerType(AccelerometerType.X_COORDINATE).build(),
      new SensorBuilder().withIntValues([4, 5, 6]).withAccelerometerType(AccelerometerType.Y_COORDINATE).build(),
      new SensorBuilder().withIntValues([7, 8, 9]).withAccelerometerType(AccelerometerType.Z_COORDINATE).build()
    ]
    expect(() => compress([1, 2, 3], sensors)).not.toThrow()
  })

  test("DuplicateEcgChannelTest", () => {
    const sensors = [
      new SensorBuilder().withIntValues([1, 2, 3]).withElectrocardiogramChannel(2).build(),
      new SensorBuilder().withIntValues([4, 5, 6]).withElectrocardiogramChannel(2).build()
    ]
    expect(() => compress([1, 2, 3], sensors)).toThrow(InvalidDataException)
  })

  test("DistinctSensorTypesSameChannelTest", () => {
    const sensors = [
      new SensorBuilder().withIntValues([1, 2, 3]).withPhotoplethysmographColor(Color.GREEN).build(),
      new SensorBuilder().withIntValues([4, 5, 6]).withAccelerometerType(AccelerometerType.X_COORDINATE).build(),
      new SensorBuilder().withDoubleValues([0.1, 0.2, 0.3]).withElectrocardiogramChannel(0).build()
    ]
    expect(() => compress([1, 2, 3], sensors)).not.toThrow()
  })

  test("MissingPpgLightTest", () => {
    const sensor: Sensor = {
      values: { oneofKind: "intValuesContainer", intValuesContainer: { values: [1, 2, 3] } },
      type: { oneofKind: "photoplethysmograph", photoplethysmograph: { light: { oneofKind: undefined }, channel: 0 } }
    }
    expect(() => compress([1, 2, 3], [sensor])).toThrow(InvalidDataException)
  })

  test("PpgColorUnspecifiedTest", () => {
    const sensor = new SensorBuilder().withIntValues([1, 2, 3]).withPhotoplethysmographColor(Color.UNSPECIFIED).build()
    expect(() => compress([1, 2, 3], [sensor])).toThrow(WrongValueException)
  })

  test("MinPpgWavelengthTest", () => {
    const sensor = new SensorBuilder().withIntValues([1, 2, 3]).withPhotoplethysmographWavelength(350).build()
    expect(() => compress([1, 2, 3], [sensor])).not.toThrow()
  })

  test("PpgWavelengthTooSmallTest", () => {
    const sensor = new SensorBuilder().withIntValues([1, 2, 3]).withPhotoplethysmographWavelength(349).build()
    expect(() => compress([1, 2, 3], [sensor])).toThrow(WrongValueException)
  })

  test("MaxPpgWavelengthTest", () => {
    const sensor = new SensorBuilder().withIntValues([1, 2, 3]).withPhotoplethysmographWavelength(1000).build()
    expect(() => compress([1, 2, 3], [sensor])).not.toThrow()
  })

  test("PpgWavelengthTooLargeTest", () => {
    const sensor = new SensorBuilder().withIntValues([1, 2, 3]).withPhotoplethysmographWavelength(1001).build()
    expect(() => compress([1, 2, 3], [sensor])).toThrow(WrongValueException)
  })

  test("AccTypeUnspecifiedTest", () => {
    const sensor = new SensorBuilder().withIntValues([1, 2, 3]).withAccelerometerType(AccelerometerType.UNSPECIFIED).build()
    expect(() => compress([1, 2, 3], [sensor])).toThrow(WrongValueException)
  })

  test("MaxEcgChannelTest", () => {
    const sensor = new SensorBuilder().withIntValues([1, 2, 3]).withElectrocardiogramChannel(22).build()
    expect(() => compress([1, 2, 3], [sensor])).not.toThrow()
  })

  test("EcgChannelTooLargeTest", () => {
    const sensor = new SensorBuilder().withIntValues([1, 2, 3]).withElectrocardiogramChannel(23).build()
    expect(() => compress([1, 2, 3], [sensor])).toThrow(WrongValueException)
  })

  test("ChannelsTest", () => {
    const sensors = [
      new SensorBuilder().withIntValues([1, 2, 3]).withPhotoplethysmographWavelength(530, 3).build(),
      new SensorBuilder().withIntValues([4, 5, 6]).withAccelerometerType(AccelerometerType.X_COORDINATE, 2).build()
    ]
    const dataPb = compress([1, 2, 3], sensors)
    expect(dataPb.sensors[0].type.oneofKind === "photoplethysmograph" && dataPb.sensors[0].type.photoplethysmograph.channel).toBe(3)
    expect(dataPb.sensors[1].type.oneofKind === "accelerometer" && dataPb.sensors[1].type.accelerometer.channel).toBe(2)
  })

  test("CompleteTest", () => {
    const metadata = new MetadataBuilder()
      .withTimezoneOffset(310)
      .withDeviceId("I3212JH")
      .withDeviceFirmwareVersion(3, 2, 1)
      .withDeviceName("Name")
      .withDeviceManufacturer("Xw2")
      .build()

    const sensors: Sensor[] = []

    sensors.push(new SensorBuilder()
      .withIntValues([0, 3, 1, 3, 2])
      .withPhotoplethysmographColor(Color.RED)
      .build()
    )

    sensors.push(new SensorBuilder()
      .withIntValues([3, 5, 2, 1, 4])
      .withPhotoplethysmographColor(Color.GREEN)
      .build()
    )

    sensors.push(new SensorBuilder()
      .withIntValues([0, 0, 0, 0, 0])
      .withPhotoplethysmographColor(Color.BLUE)
      .build()
    )

    sensors.push(new SensorBuilder()
      .withIntValues([4, 6, 3, 2, 4])
      .withPhotoplethysmographWavelength(400)
      .build()
    )

    sensors.push(new SensorBuilder()
      .withIntValues([0, 0, 0, -200, 0])
      .withAccelerometerType(AccelerometerType.X_COORDINATE)
      .build()
    )

    sensors.push(new SensorBuilder()
      .withIntValues([0, 0, 0, 200, 0])
      .withAccelerometerType(AccelerometerType.Y_COORDINATE)
      .build()
    )

    sensors.push(new SensorBuilder()
      .withIntValues([0, 100, 0, -200, 0])
      .withAccelerometerType(AccelerometerType.Z_COORDINATE)
      .build()
    )

    sensors.push(new SensorBuilder()
      .withDoubleValues([3.21274389, 8.723849, 400.782934, 43.839240, 64.34894])
      .withAccelerometerType(AccelerometerType.EUCLIDEAN_DIFFERENCES_NORM)
      .build()
    )

    sensors.push(new SensorBuilder()
      .withIntValues([0, 0, 0, 40, 0])
      .withElectrocardiogramChannel(1)
      .build()
    )

    sensors.push(new SensorBuilder()
      .withIntValues([0, 40, 0, 20, 0])
      .withElectrocardiogramChannel(2)
      .build()
    )

    const data = new DataBuilder()
      .withMetadata(metadata)
      .withTimestamps([1, 2, 3, 4, 5])
      .withSensors(sensors)
      .build()

    const dataPb = DataCompressor.compress(data)

    expect(dataPb.metadata).toBeDefined()

    expect(dataPb.metadata?.device).toBeDefined()
    expect(dataPb.metadata?.device?.name).toBe("Name")
    expect(dataPb.metadata?.device?.manufacturer).toBe("Xw2")
    expect(dataPb.metadata?.device?.id).toBe("I3212JH")
    expect(dataPb.metadata?.device?.firmwareVersion).toBeDefined()
    expect(dataPb.metadata?.device?.firmwareVersion?.major).toBe(3)
    expect(dataPb.metadata?.device?.firmwareVersion?.minor).toBe(2)
    expect(dataPb.metadata?.device?.firmwareVersion?.patch).toBe(1)

    expect(dataPb.metadata?.pcoreVersion).toBeDefined()
    expect(dataPb.metadata?.pcoreVersion?.major).toBe(PcoreVersion.major)
    expect(dataPb.metadata?.pcoreVersion?.minor).toBe(PcoreVersion.minor)
    expect(dataPb.metadata?.pcoreVersion?.patch).toBe(PcoreVersion.patch)

    expect(dataPb.metadata?.timezoneOffsetMin).toBe(310)

    expect(dataPb.compressedTimestampsContainer?.firstUnixTimestampMs).toBe(1)
    expect(dataPb.compressedTimestampsContainer?.sectionsSizes.length).toBe(1)
    expect(dataPb.compressedTimestampsContainer?.sectionsSizes).toEqual([5])
    expect(dataPb.compressedTimestampsContainer?.innerSectionsDurationsMs.length).toBe(1)
    expect(dataPb.compressedTimestampsContainer?.innerSectionsDurationsMs).toEqual([1])
    expect(dataPb.compressedTimestampsContainer?.outerSectionsDurationsMs.length).toBe(1)
    expect(dataPb.compressedTimestampsContainer?.outerSectionsDurationsMs).toEqual([0])

    expect(dataPb.sensors.length).toBe(10)

    expect(dataPb.sensors[0].type.oneofKind).toBe("photoplethysmograph")
    expect(getPhotoplethysmographColor(dataPb.sensors[0])).toBe(Color.RED)
    expect(getIntValues(dataPb.sensors[0])).toEqual([0, 3, -2, 2, -1])

    expect(dataPb.sensors[1].type.oneofKind).toBe("photoplethysmograph")
    expect(getPhotoplethysmographColor(dataPb.sensors[1])).toBe(Color.GREEN)
    expect(getIntValues(dataPb.sensors[1])).toEqual([3, 2, -3, -1, 3])

    expect(dataPb.sensors[2].type.oneofKind).toBe("photoplethysmograph")
    expect(getPhotoplethysmographColor(dataPb.sensors[2])).toBe(Color.BLUE)
    expect(getIntValues(dataPb.sensors[2])).toEqual([0, 0, 0, 0, 0])

    expect(dataPb.sensors[3].type.oneofKind).toBe("photoplethysmograph")
    expect(getPhotoplethysmographWavelength(dataPb.sensors[3])).toBe(400)
    expect(getIntValues(dataPb.sensors[3])).toEqual([4, 2, -3, -1, 2])

    expect(dataPb.sensors[4].type.oneofKind).toBe("accelerometer")
    expect(getAccelerometerType(dataPb.sensors[4])).toBe(AccelerometerType.X_COORDINATE)
    expect(getIntValues(dataPb.sensors[4])).toEqual([0, 0, 0, -200, 200])

    expect(dataPb.sensors[5].type.oneofKind).toBe("accelerometer")
    expect(getAccelerometerType(dataPb.sensors[5])).toBe(AccelerometerType.Y_COORDINATE)
    expect(getIntValues(dataPb.sensors[5])).toEqual([0, 0, 0, 200, -200])

    expect(dataPb.sensors[6].type.oneofKind).toBe("accelerometer")
    expect(getAccelerometerType(dataPb.sensors[6])).toBe(AccelerometerType.Z_COORDINATE)
    expect(getIntValues(dataPb.sensors[6])).toEqual([0, 100, -100, -200, 200])

    expect(dataPb.sensors[7].type.oneofKind).toBe("accelerometer")
    expect(getAccelerometerType(dataPb.sensors[7])).toBe(AccelerometerType.EUCLIDEAN_DIFFERENCES_NORM)
    expect(getDoubleValues(dataPb.sensors[7])).toEqual([3.21274389, 8.723849, 400.782934, 43.839240, 64.34894])

    expect(dataPb.sensors[8].type.oneofKind).toBe("electrocardiogram")
    expect(getElectrocardiogramChannel(dataPb.sensors[8])).toBe(1)
    expect(getIntValues(dataPb.sensors[8])).toEqual([0, 0, 0, 40, -40])

    expect(dataPb.sensors[9].type.oneofKind).toBe("electrocardiogram")
    expect(getElectrocardiogramChannel(dataPb.sensors[9])).toBe(2)
    expect(getIntValues(dataPb.sensors[9])).toEqual([0, 40, -40, 20, -20])
  })
})
