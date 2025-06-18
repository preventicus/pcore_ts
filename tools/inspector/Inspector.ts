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

import {DataPb} from "@/ProtobufDefinitions"
import {UnixTimestamp} from "@/models/UnixTimestamp"

/**
 * Utility class for inspecting compressed data without full decompression.
 */
export class Inspector {

  /**
   * Returns the first Unix timestamp in the compressed data.
   * @param dataPb Compressed data protobuf object
   * @returns First Unix timestamp in milliseconds, or 0 if not present
   */
  static getFirstUnixTimestamp( dataPb: DataPb): UnixTimestamp {
    if (dataPb.compressedTimestampsContainer === undefined) {
      return 0
    }
    return dataPb.compressedTimestampsContainer.firstUnixTimestampMs
  }

  /**
   * Returns the last Unix timestamp in the compressed data.
   * @param dataPb Compressed data protobuf object
   * @returns Last Unix timestamp in milliseconds, or 0 if not present
   */
  static getLastUnixTimestamp(dataPb: DataPb): UnixTimestamp {
    if (dataPb.compressedTimestampsContainer === undefined) {
      return 0
    }

    const compressedTimestampsContainer = dataPb.compressedTimestampsContainer
    let lastUnixTimestamp = compressedTimestampsContainer.firstUnixTimestampMs
    for (let i = 1; i < compressedTimestampsContainer.outerSectionsDurationsMs.length; i++) {
      lastUnixTimestamp += compressedTimestampsContainer.outerSectionsDurationsMs[i]
    }

    const size = compressedTimestampsContainer.innerSectionsDurationsMs.length
    lastUnixTimestamp += compressedTimestampsContainer.innerSectionsDurationsMs[size-1] * (compressedTimestampsContainer.sectionsSizes[size-1] - 1)
    return lastUnixTimestamp
  }

  /**
   * Returns the number of compressed timestamp sections.
   * @param dataPb Compressed data protobuf object
   * @returns Number of timestamp sections
   */
  static getNumberOfSections( dataPb: DataPb ): number {
    if (dataPb.compressedTimestampsContainer === undefined) {
      return 0
    }
    return dataPb.compressedTimestampsContainer.sectionsSizes.length
  }

  /**
   * Returns the number of sensor values (elements) in the compressed data.
   * Uses the first sensor for inspection.
   * @param dataPb Compressed data protobuf object
   * @returns Number of sensor data elements
   */
  static getNumberOfElements(dataPb: DataPb) : number {
    if (dataPb.sensors.length === 0) {
      return 0
    }
    switch (dataPb.sensors[0].values.oneofKind) {
        case "intValuesContainer": {
          return dataPb.sensors[0].values.intValuesContainer.values.length
        }
        case "doubleValuesContainer": {
          return dataPb.sensors[0].values.doubleValuesContainer.values.length
        }
        default: {
          return 0
        }
    }
  }
}
