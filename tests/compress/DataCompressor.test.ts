import {AccelerometerType, Color, DataPb, Sensor} from "../../src/ProtobufDefinitions"
import {DataCompressor} from "../../src/compress/DataCompressor"
import {DataBuilder} from "../../src/builder/DataBuilder"
import {PcoreVersion} from "../../generated/pcore/pcoreVersion"
import {SensorBuilder} from "../../src/builder/SensorBuilder"
import {MetadataBuilder} from "../../src/builder/MetadataBuilder"
import {getIntValues, getDoubleValues, getAccelerometerType, getPhotoplethysmographWavelength, getPhotoplethysmographColor, getElectrocardiogramChannel} from "../util/utils"

describe("DataCompressorTest", () => {

  test("EmptyWithoutCompressorTest" , () => {
    const dataPb = DataPb.create()
    expect(dataPb.metadata).toBeUndefined()
    expect(dataPb.compressedTimestampsContainer).toBeUndefined()
    expect(dataPb.sensors.length).toBe(0)
  })

  test("EmptyWithCompressorTest" , () => {
    const data = new DataBuilder().build()
    const dataPb = DataCompressor.compress(data)

    expect(dataPb.metadata).toBeDefined()
    expect(dataPb.metadata?.pcoreVersion).toBeDefined()
    expect(dataPb.metadata?.pcoreVersion?.major).toBe(PcoreVersion.major)
    expect(dataPb.metadata?.pcoreVersion?.minor).toBe(PcoreVersion.minor)
    expect(dataPb.metadata?.pcoreVersion?.patch).toBe(PcoreVersion.patch)

    expect(dataPb.metadata?.device).toBeUndefined()
    expect(dataPb.compressedTimestampsContainer).toBeUndefined()
    expect(dataPb.sensors.length).toBe(0)

  })

  test("MissingUnixTimestampsTest" , () => {

    const sensor = new SensorBuilder()
      .withIntValues([0,3,1,3,2])
      .build()

    const data = new DataBuilder()
      .withSensor(sensor)
      .build()

    expect(() => DataCompressor.compress(data)).toThrow(
      "Data must hold unix timestamps if it has sensor data"
    )
  })

  test("MissingSensorTest" , () => {

    const data = new DataBuilder()
      .withTimestamps([1,2,3,4,5])
      .build()

    expect(() => DataCompressor.compress(data)).toThrow(
      "Data must have sensor data if it holds unix timestamps"
    )
  })

  test("DifferentNumberSensorIntValuesTest" , () => {

    const sensor = new SensorBuilder()
      .withIntValues([3,1,3,2])
      .build()

    const data = new DataBuilder()
      .withTimestamps([1,2,3,4,5])
      .withSensor(sensor)
      .build()

    expect(() => DataCompressor.compress(data)).toThrow(
      "Number of unix timestamps should be equal to the number of data points"
    )
  })

  test("DifferentNumberSensorDoubleValuesTest" , () => {

    const sensor = new SensorBuilder()
      .withDoubleValues([3,1,3,2,7,6,4])
      .build()

    const data = new DataBuilder()
      .withTimestamps([1,2,3,4,5])
      .withSensor(sensor)
      .build()

    expect(() => DataCompressor.compress(data)).toThrow(
      "Number of unix timestamps should be equal to the number of data points"
    )
  })

  test("DifferentNumberSensorMixedValuesTest" , () => {

    const sensorInt = new SensorBuilder()
      .withIntValues([3,1,3,2,7,6,4])
      .build()

    const sensorDouble = new SensorBuilder()
      .withIntValues([3,1,3,2,7,6,4])
      .build()

    const data = new DataBuilder()
      .withTimestamps([1,2,3,4,5])
      .withSensor(sensorInt)
      .withSensor(sensorDouble)
      .build()

    expect(() => DataCompressor.compress(data)).toThrow(
      "Number of unix timestamps should be equal to the number of data points"
    )
  })

  test("CompleteTest", () => {
    const metadata = new MetadataBuilder()
      .withTimezoneOffset(310)
      .withDeviceId("I3212JH")
      .withDeviceFirmwareVersion(3,2,1)
      .withDeviceName("Name")
      .withDeviceManufacturer("Xw2")
      .build()

    const sensors: Sensor[] = []

    sensors.push(new SensorBuilder()
      .withIntValues([0,3,1,3,2])
      .withPhotoplethysmographColor(Color.RED)
      .build()
    )

    sensors.push(new SensorBuilder()
      .withIntValues([3,5,2,1,4])
      .withPhotoplethysmographColor(Color.GREEN)
      .build()
    )

    sensors.push(new SensorBuilder()
      .withIntValues([0,0,0,0,0])
      .withPhotoplethysmographColor(Color.BLUE)
      .build()
    )

    sensors.push(new SensorBuilder()
      .withIntValues([4,6,3,2,4])
      .withPhotoplethysmographWavelength(400)
      .build()
    )

    sensors.push(new SensorBuilder()
      .withIntValues([0,0,0,-200,0])
      .withAccelerometerType(AccelerometerType.X_COORDINATE)
      .build()
    )

    sensors.push(new SensorBuilder()
      .withIntValues([0,0,0,200,0])
      .withAccelerometerType(AccelerometerType.Y_COORDINATE)
      .build()
    )

    sensors.push(new SensorBuilder()
      .withIntValues([0,100,0,-200,0])
      .withAccelerometerType(AccelerometerType.Z_COORDINATE)
      .build()
    )

    sensors.push(new SensorBuilder()
      .withDoubleValues([3.21274389,8.723849,400.782934,43.839240,64.34894])
      .withAccelerometerType(AccelerometerType.EUCLIDEAN_DIFFERENCES_NORM)
      .build()
    )

    sensors.push(new SensorBuilder()
      .withIntValues([0,0,0,40,0])
      .withElectrocardiogramChannel(1)
      .build()
    )

    sensors.push(new SensorBuilder()
      .withIntValues([0,40,0,20,0])
      .withElectrocardiogramChannel(2)
      .build()
    )

    const data = new DataBuilder()
      .withMetadata(metadata)
      .withTimestamps([1,2,3,4,5])
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
    expect(getIntValues(dataPb.sensors[0])).toEqual([0,3,-2,2,-1])

    expect(dataPb.sensors[1].type.oneofKind).toBe("photoplethysmograph")
    expect(getPhotoplethysmographColor(dataPb.sensors[1])).toBe(Color.GREEN)
    expect(getIntValues(dataPb.sensors[1])).toEqual([3,2,-3,-1,3])

    expect(dataPb.sensors[2].type.oneofKind).toBe("photoplethysmograph")
    expect(getPhotoplethysmographColor(dataPb.sensors[2])).toBe(Color.BLUE)
    expect(getIntValues(dataPb.sensors[2])).toEqual([0,0,0,0,0])

    expect(dataPb.sensors[3].type.oneofKind).toBe("photoplethysmograph")
    expect(getPhotoplethysmographWavelength(dataPb.sensors[3])).toBe(400)
    expect(getIntValues(dataPb.sensors[3])).toEqual([4,2,-3,-1,2])

    expect(dataPb.sensors[4].type.oneofKind).toBe("accelerometer")
    expect(getAccelerometerType(dataPb.sensors[4])).toBe(AccelerometerType.X_COORDINATE)
    expect(getIntValues(dataPb.sensors[4])).toEqual([0,0,0,-200,200])

    expect(dataPb.sensors[5].type.oneofKind).toBe("accelerometer")
    expect(getAccelerometerType(dataPb.sensors[5])).toBe(AccelerometerType.Y_COORDINATE)
    expect(getIntValues(dataPb.sensors[5])).toEqual([0,0,0,200,-200])

    expect(dataPb.sensors[6].type.oneofKind).toBe("accelerometer")
    expect(getAccelerometerType(dataPb.sensors[6])).toBe(AccelerometerType.Z_COORDINATE)
    expect(getIntValues(dataPb.sensors[6])).toEqual([0, 100, -100, -200, 200])

    expect(dataPb.sensors[7].type.oneofKind).toBe("accelerometer")
    expect(getAccelerometerType(dataPb.sensors[7])).toBe(AccelerometerType.EUCLIDEAN_DIFFERENCES_NORM)
    expect(getDoubleValues(dataPb.sensors[7])).toEqual([3.21274389,8.723849,400.782934,43.839240,64.34894])

    expect(dataPb.sensors[8].type.oneofKind).toBe("electrocardiogram")
    expect(getElectrocardiogramChannel(dataPb.sensors[8])).toBe(1)
    expect(getIntValues(dataPb.sensors[8])).toEqual([0,0,0,40,-40])

    expect(dataPb.sensors[9].type.oneofKind).toBe("electrocardiogram")
    expect(getElectrocardiogramChannel(dataPb.sensors[9])).toBe(2)
    expect(getIntValues(dataPb.sensors[9])).toEqual([0,40,-40,20,-20])

  })

})
