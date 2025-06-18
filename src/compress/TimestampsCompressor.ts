import {UnixTimestamps} from "@/models/UnixTimestamp"
import {CompressedTimestampsContainer} from "@/ProtobufDefinitions"
import {SectionIdxs} from "@/models/SectionIdxs"

/**
 * Utility class for compressing sequences of Unix timestamps into a structured format
 * that represents regular patterns in the time intervals.
 */
export class TimestampsCompressor {
  /**
   * Compresses a sequence of Unix timestamps into a `CompressedTimestampsContainer`.
   *
   * The compression algorithm detects sections of timestamps with consistent step durations,
   * and stores metadata such as section sizes, inner and outer section durations.
   *
   * @param unixTimestamps - The array of Unix timestamps in milliseconds.
   * @returns A `CompressedTimestampsContainer` representing the compressed form of the timestamps.
   */

  static compress(unixTimestamps: UnixTimestamps): CompressedTimestampsContainer {

    const compressedTimestampsContainer = CompressedTimestampsContainer.create()

    const sectionIdxs = TimestampsCompressor.findSectionIdxs(unixTimestamps)
    const numberOfSection = sectionIdxs.length
    if (numberOfSection === 0) {
      return compressedTimestampsContainer
    }

    const sizeUnixTimestamps = unixTimestamps.length
    const firstUnixTimestampInMs = unixTimestamps[0]

    compressedTimestampsContainer.firstUnixTimestampMs = firstUnixTimestampInMs
    compressedTimestampsContainer.outerSectionsDurationsMs.push(0)

    if (numberOfSection === 1) {
      compressedTimestampsContainer.innerSectionsDurationsMs.push( sizeUnixTimestamps === 1 ? 0 : unixTimestamps[1] - firstUnixTimestampInMs )
      compressedTimestampsContainer.sectionsSizes.push(sizeUnixTimestamps)
      return compressedTimestampsContainer
    }

    compressedTimestampsContainer.innerSectionsDurationsMs.push(unixTimestamps[1] - firstUnixTimestampInMs)
    compressedTimestampsContainer.sectionsSizes.push(sectionIdxs[1])

    for (let i = 1; i <= (sectionIdxs.length - 2); i++) {
      const previousSectionIdx = sectionIdxs[i - 1]
      const currentSectionIdx = sectionIdxs[i]
      const nextSectionIdx = sectionIdxs[i + 1]
      compressedTimestampsContainer.innerSectionsDurationsMs.push(unixTimestamps[currentSectionIdx + 1] - unixTimestamps[currentSectionIdx])
      compressedTimestampsContainer.outerSectionsDurationsMs.push(unixTimestamps[currentSectionIdx] - unixTimestamps[previousSectionIdx])
      compressedTimestampsContainer.sectionsSizes.push(nextSectionIdx - currentSectionIdx)
    }

    const lastSectionIdx = sectionIdxs[sectionIdxs.length - 1]
    compressedTimestampsContainer.outerSectionsDurationsMs.push(unixTimestamps[lastSectionIdx] - unixTimestamps[sectionIdxs[numberOfSection - 2]])
    compressedTimestampsContainer.innerSectionsDurationsMs.push(sizeUnixTimestamps - 1 === lastSectionIdx ? 0 : unixTimestamps[lastSectionIdx+1] - unixTimestamps[lastSectionIdx])
    compressedTimestampsContainer.sectionsSizes.push(sizeUnixTimestamps - lastSectionIdx)

    return compressedTimestampsContainer
  }

  static findSectionIdxs(unixTimestampsInMs: UnixTimestamps): SectionIdxs {
    const sectionIdxs: SectionIdxs = []
    if (unixTimestampsInMs.length === 0) return sectionIdxs
    let referenceTimeDurationInMs = 0
    let isNewSection = true
    sectionIdxs.push(0)
    for( let i = 1; i < unixTimestampsInMs.length; i++ ) {
      const timeDurationInMs = unixTimestampsInMs[i] - unixTimestampsInMs[i-1]
      if (isNewSection) {
        referenceTimeDurationInMs = timeDurationInMs
        isNewSection = false
      }
      if (timeDurationInMs !== referenceTimeDurationInMs) {
        sectionIdxs.push(i)
        isNewSection = true
      }
    }
    return sectionIdxs
  }
}
