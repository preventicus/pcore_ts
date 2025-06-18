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
