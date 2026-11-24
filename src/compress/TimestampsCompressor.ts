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

import { UnixTimestamps } from "@/models/UnixTimestamp"
import { CompressedTimestampsContainer } from "@/ProtobufDefinitions"
import { SectionIdxs } from "@/models/SectionIdxs"

/**
 * Utility class for compressing sequences of Unix timestamps into a structured format
 * that represents regular patterns in the time intervals.
 */
export class TimestampsCompressor {
  /**
   * Compresses a sequence of Unix timestamps into a `CompressedTimestampsContainer`.
   *
   * Implements the algorithm `CompressTimestamps` of the Pcore specification: the timestamps are
   * split into sections with a constant step duration, and for each section its size, its inner
   * section duration and its outer section duration (distance to the start of the previous section)
   * are stored.
   *
   * @param unixTimestamps - The array of Unix timestamps in milliseconds.
   * @returns A `CompressedTimestampsContainer` representing the compressed form of the timestamps.
   */
  static compress(unixTimestamps: UnixTimestamps): CompressedTimestampsContainer {
    const compressedTimestampsContainer = CompressedTimestampsContainer.create()

    const sectionStartIdxs = TimestampsCompressor.findSectionIdxs(unixTimestamps)
    if (sectionStartIdxs.length === 0) {
      return compressedTimestampsContainer
    }

    compressedTimestampsContainer.firstUnixTimestampMs = unixTimestamps[0]
    // each section ends where the next one starts, the last one at the end of the list
    const sectionEndIdxs = [...sectionStartIdxs.slice(1), unixTimestamps.length]
    // the first section is its own predecessor, so its outer section duration is 0
    let previousStartIdx = 0
    for (let k = 0; k < sectionStartIdxs.length; k++) {
      const startIdx = sectionStartIdxs[k]
      const sectionSize = sectionEndIdxs[k] - startIdx

      compressedTimestampsContainer.sectionsSizes.push(sectionSize)
      compressedTimestampsContainer.outerSectionsDurationsMs.push(unixTimestamps[startIdx] - unixTimestamps[previousStartIdx])
      compressedTimestampsContainer.innerSectionsDurationsMs.push(sectionSize > 1 ? unixTimestamps[startIdx + 1] - unixTimestamps[startIdx] : 0)
      previousStartIdx = startIdx
    }

    return compressedTimestampsContainer
  }

  /**
   * Returns the indices of the timestamps at which a new section starts.
   *
   * Implements the algorithm `FindSectionIndices` of the Pcore specification.
   *
   * @param unixTimestampsInMs - Strictly increasing Unix timestamps in milliseconds.
   * @returns The start indices of all sections, empty for empty input.
   */
  static findSectionIdxs(unixTimestampsInMs: UnixTimestamps): SectionIdxs {
    const sectionIdxs: SectionIdxs = []
    if (unixTimestampsInMs.length === 0) return sectionIdxs
    let referenceTimeDurationInMs = 0
    let isNewSection = true
    sectionIdxs.push(0)
    for (let i = 1; i < unixTimestampsInMs.length; i++) {
      const timeDurationInMs = unixTimestampsInMs[i] - unixTimestampsInMs[i - 1]
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
