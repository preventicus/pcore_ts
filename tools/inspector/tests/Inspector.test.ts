import {DataPb} from "../../../src/ProtobufDefinitions"
import {Inspector} from "../Inspector"
import {SensorBuilder} from "../../../src/builder/SensorBuilder"

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
})
