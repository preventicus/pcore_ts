import {AccelerometerType, Color, DataPb, Sensor} from "../../src/ProtobufDefinitions"
import {DataBuilder} from "../../src/builder/DataBuilder"
import {PcoreVersion} from "../../generated/pcore/pcoreVersion"
import {SensorBuilder} from "../../src/builder/SensorBuilder"
import {MetadataBuilder} from "../../src/builder/MetadataBuilder"
import {getIntValues, getDoubleValues, getAccelerometerType, getPhotoplethysmographWavelength, getPhotoplethysmographColor, getElectrocardiogramChannel} from "../util/utils"
import {DataDecompressor} from "../../src/decompress/DataDecompressor"
import {Data} from "../../generated/pcore/pcore"

describe("DataDecompressorTest", () => {

  test("EmptyWithoutDecompressorTest" , () => {
    const data = new DataBuilder().build()
    expect(data.metadata).toBeUndefined()
    expect(data.timestamps.length).toBe(0)
    expect(data.sensors.length).toBe(0)
  })

  test("EmptyWithDecompressorTest" , () => {
    const dataPb = Data.create()
    const data = DataDecompressor.decompress(dataPb)
    expect(data.metadata).toBeUndefined()
    expect(data.timestamps.length).toBe(0)
    expect(data.sensors.length).toBe(0)
  })

  test("MissingUnixTimestampsTest" , () => {

    const sensor = new SensorBuilder()
      .withIntValues([0,3,1,3,2])
      .build()

    const dataPb : DataPb = {
      metadata: undefined,
      compressedTimestampsContainer: undefined,
      sensors: [sensor]
    }

    expect(() => DataDecompressor.decompress(dataPb)).toThrow(
      "Data must hold compressed timestamps if it has sensor data"
    )
  })

  test("MissingSensorTest" , () => {
    const dataPb : DataPb = {
      metadata: undefined,
      compressedTimestampsContainer: {
        firstUnixTimestampMs: 1,
        innerSectionsDurationsMs: [2,1],
        outerSectionsDurationsMs: [0,6],
        sectionsSizes: [4,3]
      },
      sensors: []
    }
    expect(() => DataDecompressor.decompress(dataPb)).toThrow(
      "Data must have sensor data if it holds compressed timestamps"
    )
  })

  test("DifferentNumberSensorIntValuesTest" , () => {

    const sensor = new SensorBuilder()
      .withIntValues([3,1,3,2])
      .build()

    const dataPb : DataPb = {
      metadata: undefined,
      compressedTimestampsContainer: {
        firstUnixTimestampMs: 1,
        innerSectionsDurationsMs: [2,1],
        outerSectionsDurationsMs: [0,6],
        sectionsSizes: [4,3]
      },
      sensors: [sensor]
    }

    expect(() => DataDecompressor.decompress(dataPb)).toThrow(
      "Sensor data must have the same length as unix timestamps"
    )
  })

  test("DifferentNumberSensorDoubleValuesTest" , () => {

    const sensor = new SensorBuilder()
      .withDoubleValues([3,1,3,2,7,6,4])
      .build()

    const dataPb : DataPb = {
      metadata: undefined,
      compressedTimestampsContainer: {
        firstUnixTimestampMs: 1,
        innerSectionsDurationsMs: [2,1],
        outerSectionsDurationsMs: [0,6],
        sectionsSizes: [4,5]
      },
      sensors: [sensor]
    }

    expect(() => DataDecompressor.decompress(dataPb)).toThrow(
      "Sensor data must have the same length as unix timestamps"
    )
  })

  test("DifferentNumberSensorMixedValuesTest" , () => {

    const sensorInt = new SensorBuilder()
      .withIntValues([3,1,3,2,7,6,4])
      .build()

    const sensorDouble = new SensorBuilder()
      .withIntValues([3,1,3,2,7,6,4])
      .build()

    const dataPb : DataPb = {
      metadata: undefined,
      compressedTimestampsContainer: {
        firstUnixTimestampMs: 1,
        innerSectionsDurationsMs: [2,1],
        outerSectionsDurationsMs: [0,6],
        sectionsSizes: [4,5]
      },
      sensors: [sensorInt, sensorDouble]
    }

    expect(() => DataDecompressor.decompress(dataPb)).toThrow(
      "Sensor data must have the same length as unix timestamps"
    )
  })

  test("CompleteTest", () => {
    const metadataPb = new MetadataBuilder()
      .withTimezoneOffset(310)
      .withDeviceId("I3212JH")
      .withDeviceFirmwareVersion(3,2,1)
      .withDeviceName("Name")
      .withDeviceManufacturer("Xw2")
      .build()

    const sensorsPb: Sensor[] = []

    sensorsPb.push(new SensorBuilder()
      .withIntValues([0,3,-2,2,-1])
      .withPhotoplethysmographColor(Color.RED)
      .build()
    )

    sensorsPb.push(new SensorBuilder()
      .withIntValues([3,2,-3,-1,3])
      .withPhotoplethysmographColor(Color.GREEN)
      .build()
    )

    sensorsPb.push(new SensorBuilder()
      .withIntValues([0,0,0,0,0])
      .withPhotoplethysmographColor(Color.BLUE)
      .build()
    )

    sensorsPb.push(new SensorBuilder()
      .withIntValues([4,2,-3,-1,2])
      .withPhotoplethysmographWavelength(400)
      .build()
    )

    sensorsPb.push(new SensorBuilder()
      .withIntValues([0,0,0,-200,200])
      .withAccelerometerType(AccelerometerType.X_COORDINATE)
      .build()
    )

    sensorsPb.push(new SensorBuilder()
      .withIntValues([0,0,0,200,-200])
      .withAccelerometerType(AccelerometerType.Y_COORDINATE)
      .build()
    )

    sensorsPb.push(new SensorBuilder()
      .withIntValues([0, 100, -100, -200, 200])
      .withAccelerometerType(AccelerometerType.Z_COORDINATE)
      .build()
    )

    sensorsPb.push(new SensorBuilder()
      .withDoubleValues([3.21274389,8.723849,400.782934,43.839240,64.34894])
      .withAccelerometerType(AccelerometerType.EUCLIDEAN_DIFFERENCES_NORM)
      .build()
    )

    sensorsPb.push(new SensorBuilder()
      .withIntValues([0,0,0,40,-40])
      .withElectrocardiogramChannel(1)
      .build()
    )

    sensorsPb.push(new SensorBuilder()
      .withIntValues([0,40,-40,20,-20])
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
    expect(data.timestamps).toEqual([1,2,3,4,5])

    expect(data.sensors.length).toBe(10)

    expect(data.sensors[0].type.oneofKind).toBe("photoplethysmograph")
    expect(getPhotoplethysmographColor(data.sensors[0])).toBe(Color.RED)
    expect(getIntValues(data.sensors[0])).toEqual([0,3,1,3,2])

    expect(data.sensors[1].type.oneofKind).toBe("photoplethysmograph")
    expect(getPhotoplethysmographColor(data.sensors[1])).toBe(Color.GREEN)
    expect(getIntValues(data.sensors[1])).toEqual([3,5,2,1,4])

    expect(data.sensors[2].type.oneofKind).toBe("photoplethysmograph")
    expect(getPhotoplethysmographColor(data.sensors[2])).toBe(Color.BLUE)
    expect(getIntValues(data.sensors[2])).toEqual([0,0,0,0,0])

    expect(data.sensors[3].type.oneofKind).toBe("photoplethysmograph")
    expect(getPhotoplethysmographWavelength(data.sensors[3])).toBe(400)
    expect(getIntValues(data.sensors[3])).toEqual([4,6,3,2,4])

    expect(data.sensors[4].type.oneofKind).toBe("accelerometer")
    expect(getAccelerometerType(data.sensors[4])).toBe(AccelerometerType.X_COORDINATE)
    expect(getIntValues(data.sensors[4])).toEqual([0,0,0,-200,0])

    expect(data.sensors[5].type.oneofKind).toBe("accelerometer")
    expect(getAccelerometerType(data.sensors[5])).toBe(AccelerometerType.Y_COORDINATE)
    expect(getIntValues(data.sensors[5])).toEqual([0,0,0,200,0])

    expect(data.sensors[6].type.oneofKind).toBe("accelerometer")
    expect(getAccelerometerType(data.sensors[6])).toBe(AccelerometerType.Z_COORDINATE)
    expect(getIntValues(data.sensors[6])).toEqual([0,100,0,-200,0])

    expect(data.sensors[7].type.oneofKind).toBe("accelerometer")
    expect(getAccelerometerType(data.sensors[7])).toBe(AccelerometerType.EUCLIDEAN_DIFFERENCES_NORM)
    expect(getDoubleValues(data.sensors[7])).toEqual([3.21274389,8.723849,400.782934,43.839240,64.34894])

    expect(data.sensors[8].type.oneofKind).toBe("electrocardiogram")
    expect(getElectrocardiogramChannel(data.sensors[8])).toBe(1)
    expect(getIntValues(data.sensors[8])).toEqual([0,0,0,40,0])

    expect(data.sensors[9].type.oneofKind).toBe("electrocardiogram")
    expect(getElectrocardiogramChannel(data.sensors[9])).toBe(2)
    expect(getIntValues(data.sensors[9])).toEqual([0,40,0,20,0])

  })

})
