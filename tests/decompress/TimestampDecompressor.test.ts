import {TimestampsDecompressor} from "../../src/decompress/TimestampsDecompressor"
import {CompressedTimestampsContainer} from "../../src/ProtobufDefinitions"
import {UnixTimestamp} from "../../src/models/UnixTimestamp"

function fillCompressedTimestampsContainerPb(fistUnixTimestamp: UnixTimestamp, innerSectionDurations: number[], outerSectionDurations: number[], sectionSizes: number[]): CompressedTimestampsContainer {
  const compressedTimestampsContainer = CompressedTimestampsContainer.create()
  compressedTimestampsContainer.firstUnixTimestampMs = fistUnixTimestamp
  compressedTimestampsContainer.innerSectionsDurationsMs = innerSectionDurations
  compressedTimestampsContainer.outerSectionsDurationsMs = outerSectionDurations
  compressedTimestampsContainer.sectionsSizes = sectionSizes
  return compressedTimestampsContainer
}

describe("TimestampsDecompressor", () => {

  test("ZeroTimestampTest", () => {
    const compressedTimestampsContainer = fillCompressedTimestampsContainerPb(
      0,
      [0],
      [0],
      [0]
    )
    const decompressed = TimestampsDecompressor.decompress(compressedTimestampsContainer)
    expect(decompressed.length).toBe(0)
  })

  test("OneTimestampTest", () => {
    const compressedTimestampsContainer = fillCompressedTimestampsContainerPb(
      1,
      [0],
      [0],
      [1]
    )
    const decompressed = TimestampsDecompressor.decompress(compressedTimestampsContainer)
    expect(decompressed.length).toBe(1)
    expect(decompressed).toEqual([1])
  })

  test("OneSectionTest", () => {
    const compressedTimestampsContainer = fillCompressedTimestampsContainerPb(
      1,
      [1],
      [0],
      [4]
    )
    const decompressed = TimestampsDecompressor.decompress(compressedTimestampsContainer)
    expect(decompressed.length).toBe(4)
    expect(decompressed).toEqual([1, 2, 3, 4])
  })

  test("TwoSectionTest", () => {
    const compressedTimestampsContainer = fillCompressedTimestampsContainerPb(
      1,
      [1,1],
      [0,5],
      [4,4]
    )
    const decompressed = TimestampsDecompressor.decompress(compressedTimestampsContainer)
    expect(decompressed.length).toBe(8)
    expect(decompressed).toEqual([1, 2, 3, 4, 6, 7, 8, 9])
  })

  test("ThreeSectionTest", () => {
    const compressedTimestampsContainer = fillCompressedTimestampsContainerPb(
      1,
      [1,1,1],
      [0,5,5],
      [4,4,3]
    )
    const decompressed = TimestampsDecompressor.decompress(compressedTimestampsContainer)
    expect(decompressed.length).toBe(11)
    expect(decompressed).toEqual([1, 2, 3, 4, 6, 7, 8, 9, 11, 12, 13])
  })

  test("LastSingleTimestampSectionTest", () => {
    const compressedTimestampsContainer = fillCompressedTimestampsContainerPb(
      1,
      [1,0],
      [0,5],
      [4,1]
    )
    const decompressed = TimestampsDecompressor.decompress(compressedTimestampsContainer)
    expect(decompressed.length).toBe(5)
    expect(decompressed).toEqual([1, 2, 3, 4, 6])
  })

  test("FirstSingleTimestampSectionTest", () => {
    const compressedTimestampsContainer = fillCompressedTimestampsContainerPb(
      1,
      [2,1],
      [0,3],
      [2,3]
    )
    const decompressed = TimestampsDecompressor.decompress(compressedTimestampsContainer)
    expect(decompressed.length).toBe(5)
    expect(decompressed).toEqual([1, 3, 4, 5, 6])
  })

  test("ThreeSectionDifferentGapsWithSingleTimeStampTest", () => {
    const compressedTimestampsContainer = fillCompressedTimestampsContainerPb(
      1,
      [1,3,1],
      [0,4,4],
      [3,2,2]
    )
    const decompressed = TimestampsDecompressor.decompress(compressedTimestampsContainer)
    expect(decompressed.length).toBe(7)
    expect(decompressed).toEqual([1,2,3,5,8,9,10])
  })

  test("ThreeSectionDifferentGapsTest", () => {
    const compressedTimestampsContainer = fillCompressedTimestampsContainerPb(
      1,
      [1,1,1],
      [0,4,5],
      [3,3,3]
    )
    const decompressed = TimestampsDecompressor.decompress(compressedTimestampsContainer)
    expect(decompressed.length).toBe(9)
    expect(decompressed).toEqual([1, 2, 3, 5, 6, 7, 10, 11, 12])
  })

  test("ThreeSectionDifferentBigGapsTest", () => {
    const compressedTimestampsContainer = fillCompressedTimestampsContainerPb(
      1,
      [1,3,4],
      [0,5,14],
      [4,2,3]
    )
    const decompressed = TimestampsDecompressor.decompress(compressedTimestampsContainer)
    expect(decompressed.length).toBe(9)
    expect(decompressed).toEqual([1, 2, 3, 4, 6, 9, 20, 24, 28])
  })

  test("FourSectionTest", () => {
    const compressedTimestampsContainer = fillCompressedTimestampsContainerPb(
      1,
      [1,3,1,5],
      [0,5,8,6],
      [4,3,3,2]
    )
    const decompressed = TimestampsDecompressor.decompress(compressedTimestampsContainer)
    expect(decompressed.length).toBe(12)
    expect(decompressed).toEqual([1, 2, 3, 4, 6, 9, 12, 14, 15, 16, 20, 25])
  })

  test("MixedSectionTest", () => {
    const compressedTimestampsContainer = fillCompressedTimestampsContainerPb(
      0,
      [2, 7, 1, 3, 0],
      [0, 5, 8, 7, 30],
      [3, 2, 4, 8, 1]
    )
    const decompressed = TimestampsDecompressor.decompress(compressedTimestampsContainer)
    expect(decompressed.length).toBe(18)
    expect(decompressed).toEqual([0, 2, 4, 5, 12, 13, 14, 15, 16, 20, 23, 26, 29, 32, 35, 38, 41, 50])
  })

  test("AllDifferentTimestampsDurationTest", () => {
    const compressedTimestampsContainer = fillCompressedTimestampsContainerPb(
      1000,
      [10, 30, 0],
      [0, 30, 70],
      [2, 2, 1]
    )
    const decompressed = TimestampsDecompressor.decompress(compressedTimestampsContainer)
    expect(decompressed.length).toBe(5)
    expect(decompressed).toEqual([1000, 1010, 1030, 1060, 1100])
  })

  test("RealDataTest", () => {
    const compressedTimestampsContainer = fillCompressedTimestampsContainerPb(
      1675732789987,
      [40, 40, 80, 40],
      [0, 480, 400, 480],
      [10, 8, 5, 3]
    )
    const decompressed = TimestampsDecompressor.decompress(compressedTimestampsContainer)
    expect(decompressed.length).toBe(26)
    expect(decompressed).toEqual([1675732789987,1675732790027,1675732790067,1675732790107,1675732790147,1675732790187,1675732790227,1675732790267,1675732790307,1675732790347,1675732790467,
      1675732790507,1675732790547,1675732790587,1675732790627,1675732790667,1675732790707,1675732790747,1675732790867,1675732790947,1675732791027,1675732791107,
      1675732791187,1675732791347,1675732791387,1675732791427])
  })
})
