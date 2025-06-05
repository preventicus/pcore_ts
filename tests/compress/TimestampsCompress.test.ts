import { TimestampsCompressor } from "../../src/compress/TimestampsCompressor"

describe("TimestampsCompressor", () => {

  test("ZeroTimestampTest", () => {
    const unixTimestamps: number[] = []

    const compressed = TimestampsCompressor.compress(unixTimestamps)

    expect(compressed.firstUnixTimestampMs).toBe(0)
    expect(compressed.sectionsSizes.length).toBe(0)
    expect(compressed.innerSectionsDurationsMs.length).toBe(0)
    expect(compressed.outerSectionsDurationsMs.length).toBe(0)
  })

  test("OneTimestampTest", () => {
    const unixTimestamps = [1]

    const compressed = TimestampsCompressor.compress(unixTimestamps)

    expect(compressed.firstUnixTimestampMs).toBe(1)

    expect(compressed.sectionsSizes.length).toBe(1)
    expect(compressed.sectionsSizes).toEqual([1])

    expect(compressed.innerSectionsDurationsMs.length).toBe(1)
    expect(compressed.innerSectionsDurationsMs).toEqual([0])

    expect(compressed.outerSectionsDurationsMs.length).toBe(1)
    expect(compressed.outerSectionsDurationsMs).toEqual([0])
  })

  test("OneSectionTest", () => {
    const unixTimestamps = [1, 2, 3, 4]
    const compressed = TimestampsCompressor.compress(unixTimestamps)

    expect(compressed.firstUnixTimestampMs).toBe(1)
    expect(compressed.sectionsSizes.length).toBe(1)
    expect(compressed.sectionsSizes).toEqual([4])

    expect(compressed.innerSectionsDurationsMs.length).toBe(1)
    expect(compressed.innerSectionsDurationsMs).toEqual([1])

    expect(compressed.outerSectionsDurationsMs.length).toBe(1)
    expect(compressed.outerSectionsDurationsMs).toEqual([0])
  })

  test("TwoSectionTest", () => {
    const unixTimestamps = [1, 2, 3, 4, 6, 7, 8, 9]
    const compressed = TimestampsCompressor.compress(unixTimestamps)

    expect(compressed.firstUnixTimestampMs).toBe(1)
    expect(compressed.sectionsSizes.length).toBe(2)
    expect(compressed.sectionsSizes).toEqual([4, 4])

    expect(compressed.innerSectionsDurationsMs.length).toBe(2)
    expect(compressed.innerSectionsDurationsMs).toEqual([1, 1])

    expect(compressed.outerSectionsDurationsMs.length).toBe(2)
    expect(compressed.outerSectionsDurationsMs).toEqual([0, 5])
  })

  test("ThreeSectionTest", () => {
    const unixTimestamps = [1, 2, 3, 4, 6, 7, 8, 9, 11, 12, 13]
    const compressed = TimestampsCompressor.compress(unixTimestamps)

    expect(compressed.firstUnixTimestampMs).toBe(1)
    expect(compressed.sectionsSizes.length).toBe(3)
    expect(compressed.sectionsSizes).toEqual([4, 4, 3])

    expect(compressed.innerSectionsDurationsMs.length).toBe(3)
    expect(compressed.innerSectionsDurationsMs).toEqual([1, 1, 1])

    expect(compressed.outerSectionsDurationsMs.length).toBe(3)
    expect(compressed.outerSectionsDurationsMs).toEqual([0, 5, 5])
  })

  test("LastSingleTimestampSectionTest", () => {
    const timestamps = [1, 2, 3, 4, 6]
    const compressed = TimestampsCompressor.compress(timestamps)

    expect(compressed.firstUnixTimestampMs).toBe(1)
    expect(compressed.sectionsSizes).toEqual([4, 1])
    expect(compressed.innerSectionsDurationsMs).toEqual([1, 0])
    expect(compressed.outerSectionsDurationsMs).toEqual([0, 5])
  })

  test("FirstSingleTimestampSectionTest", () => {
    const timestamps = [1, 3, 4, 5, 6]
    const compressed = TimestampsCompressor.compress(timestamps)

    expect(compressed.firstUnixTimestampMs).toBe(1)
    expect(compressed.sectionsSizes).toEqual([2, 3])
    expect(compressed.innerSectionsDurationsMs).toEqual([2, 1])
    expect(compressed.outerSectionsDurationsMs).toEqual([0, 3])
  })

  test("ThreeSectionDifferentGapsWithSingleTimeStampTest", () => {
    const timestamps = [1, 2, 3, 5, 8, 9, 10]
    const compressed = TimestampsCompressor.compress(timestamps)

    expect(compressed.firstUnixTimestampMs).toBe(1)
    expect(compressed.sectionsSizes).toEqual([3, 2, 2])
    expect(compressed.innerSectionsDurationsMs).toEqual([1, 3, 1])
    expect(compressed.outerSectionsDurationsMs).toEqual([0, 4, 4])
  })

  test("ThreeSectionDifferentGapsTest", () => {
    const timestamps = [1, 2, 3, 5, 6, 7, 10, 11, 12]
    const compressed = TimestampsCompressor.compress(timestamps)

    expect(compressed.firstUnixTimestampMs).toBe(1)
    expect(compressed.sectionsSizes).toEqual([3, 3, 3])
    expect(compressed.innerSectionsDurationsMs).toEqual([1, 1, 1])
    expect(compressed.outerSectionsDurationsMs).toEqual([0, 4, 5])
  })

  test("ThreeSectionDifferentBigGapsTest", () => {
    const timestamps = [1, 2, 3, 4, 6, 9, 20, 24, 28]
    const compressed = TimestampsCompressor.compress(timestamps)

    expect(compressed.firstUnixTimestampMs).toBe(1)
    expect(compressed.sectionsSizes).toEqual([4, 2, 3])
    expect(compressed.innerSectionsDurationsMs).toEqual([1, 3, 4])
    expect(compressed.outerSectionsDurationsMs).toEqual([0, 5, 14])
  })

  test("FourSectionTest", () => {
    const timestamps = [1, 2, 3, 4, 6, 9, 12, 14, 15, 16, 20, 25]
    const compressed = TimestampsCompressor.compress(timestamps)

    expect(compressed.firstUnixTimestampMs).toBe(1)
    expect(compressed.sectionsSizes).toEqual([4, 3, 3, 2])
    expect(compressed.innerSectionsDurationsMs).toEqual([1, 3, 1, 5])
    expect(compressed.outerSectionsDurationsMs).toEqual([0, 5, 8, 6])
  })

  test("MixedSectionTest", () => {
    const timestamps = [0, 2, 4, 5, 12, 13, 14, 15, 16, 20, 23, 26, 29, 32, 35, 38, 41, 50]
    const compressed = TimestampsCompressor.compress(timestamps)

    expect(compressed.firstUnixTimestampMs).toBe(0)
    expect(compressed.sectionsSizes).toEqual([3, 2, 4, 8, 1])
    expect(compressed.innerSectionsDurationsMs).toEqual([2, 7, 1, 3, 0])
    expect(compressed.outerSectionsDurationsMs).toEqual([0, 5, 8, 7, 30])
  })

  test("AllDifferentTimestampsDurationTest", () => {
    const timestamps = [1000, 1010, 1030, 1060, 1100]
    const compressed = TimestampsCompressor.compress(timestamps)

    expect(compressed.firstUnixTimestampMs).toBe(1000)
    expect(compressed.sectionsSizes).toEqual([2, 2, 1])
    expect(compressed.innerSectionsDurationsMs).toEqual([10, 30, 0])
    expect(compressed.outerSectionsDurationsMs).toEqual([0, 30, 70])
  })

  test("RealDataTest", () => {
    const timestamps = [
      1675732789987, 1675732790027, 1675732790067, 1675732790107, 1675732790147,
      1675732790187, 1675732790227, 1675732790267, 1675732790307, 1675732790347,
      1675732790467, 1675732790507, 1675732790547, 1675732790587, 1675732790627,
      1675732790667, 1675732790707, 1675732790747, 1675732790867, 1675732790947,
      1675732791027, 1675732791107, 1675732791187, 1675732791347, 1675732791387,
      1675732791427,
    ]
    const compressed = TimestampsCompressor.compress(timestamps)

    expect(compressed.firstUnixTimestampMs).toBe(1675732789987)
    expect(compressed.sectionsSizes).toEqual([10, 8, 5, 3])
    expect(compressed.innerSectionsDurationsMs).toEqual([40, 40, 80, 40])
    expect(compressed.outerSectionsDurationsMs).toEqual([0, 480, 400, 480])
  })
})
