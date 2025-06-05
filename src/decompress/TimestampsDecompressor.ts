import {CompressedTimestampsContainer} from "@/ProtobufDefinitions"
import {UnixTimestamps} from "@/models/UnixTimestamp"


export class TimestampsDecompressor {
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
