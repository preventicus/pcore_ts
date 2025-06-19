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

import { Metadata, Version } from "@/ProtobufDefinitions"
import { WrongValueException } from "@/Exception"
import { PcoreVersion } from "@generated/pcoreVersion"

/**
 * Provides utilities to compress or sanitize metadata for transmission or storage.
 */
export class MetadataCompressor {
  /**
   * Compresses a `Metadata` object by ensuring its `pcoreVersion` is set to the current version
   * and by validating the timezone offset.
   *
   * If no metadata is provided, a default `Metadata` instance with only the `pcoreVersion` is returned.
   *
   * @param metadata - The optional `Metadata` object to compress.
   * @returns A new `Metadata` object with the current `pcoreVersion`.
   * @throws {WrongValueException} If the timezone offset is outside the valid range [-720, 840].
   */
  static compress(metadata?: Metadata): Metadata {
    if (metadata === undefined) {
      return Metadata.create({
        pcoreVersion: {
          major: PcoreVersion.major,
          minor: PcoreVersion.minor,
          patch: PcoreVersion.patch
        }
      })
    }

    if (840 <= metadata.timezoneOffsetMin || metadata.timezoneOffsetMin <= -720) {
      throw new WrongValueException("MetadataCompressor.compress", "TimezoneOffset must be between -720 and 840")
    }

    const metadataPb = structuredClone(metadata)
    metadataPb.pcoreVersion = Version.create({
      major: PcoreVersion.major,
      minor: PcoreVersion.minor,
      patch: PcoreVersion.patch
    })

    return metadataPb
  }
}
