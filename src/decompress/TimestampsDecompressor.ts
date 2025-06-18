import {CompressedTimestampsContainer} from "@/ProtobufDefinitions"
import {UnixTimestamps} from "@/models/UnixTimestamp"

/**
 * Responsible for decompressing delta-encoded and sectioned Unix timestamps.
 * Reconstructs the original timestamp sequence from compressed sections and durations.
 */
export class TimestampsDecompressor {

  /**
   * Decompresses a `CompressedTimestampsContainer` into an array of Unix timestamps in milliseconds.
   *
   * - Reconstructs timestamps by iteratively adding section-level and intra-section durations.
   * - Returns an empty array if the input container is `undefined`.
   *
   * @param compressedTimestampContainer - The compressed representation of timestamps.
   * @returns The full array of decompressed Unix timestamps.
   */
  static decompress(compressedTimestampContainer?: CompressedTimestampsContainer): UnixTimestamps {

    if (compressedTimestampContainer === undefined) {
      return []
    }

    let currentUnixTimestampInMsPb = compressedTimestampContainer.firstUnixTimestampMs
    const outerSectionsDurationsInMsPb = compressedTimestampContainer.outerSectionsDurationsMs
    const innerSectionsDurationsInMsPb = compressedTimestampContainer.innerSectionsDurationsMs
    const sectionsSizesPb = compressedTimestampContainer.sectionsSizes

    let numberOfUnixTimestamps = 0
    for (let i = 0; i < sectionsSizesPb.length; i++) {
      numberOfUnixTimestamps += sectionsSizesPb[i]
    }
    const unixTimestamps = new Array<number>(numberOfUnixTimestamps)

    let arrayIndex = 0
    for (let i = 0; i < sectionsSizesPb.length; i++) {
      currentUnixTimestampInMsPb += outerSectionsDurationsInMsPb[i]
      const sectionSize = sectionsSizesPb[i]
      const innerDuration = innerSectionsDurationsInMsPb[i]
      for (let j = 0; j < sectionSize; j++) {
        unixTimestamps[arrayIndex++] = currentUnixTimestampInMsPb + j * innerDuration
      }
    }

    return unixTimestamps
  }

}
