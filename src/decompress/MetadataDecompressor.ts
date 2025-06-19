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

import { Metadata } from "@/ProtobufDefinitions"
import { WrongValueException } from "@/Exception"

/**
 * Provides functionality to decompress `Metadata` objects.
 * Ensures that metadata fields, such as timezone offset, are within valid bounds.
 */
export class MetadataDecompressor {
  /**
   * Decompresses a `Metadata` object by validating and returning a cloned version.
   *
   * @param metadata - The metadata object to decompress.
   * @returns A deep clone of the validated `Metadata` object.
   * @throws {WrongValueException} If the timezone offset is outside the valid range [-720, 840].
   */
  static decompress(metadata: Metadata): Metadata {
    if (840 <= metadata.timezoneOffsetMin || metadata.timezoneOffsetMin <= -720) {
      throw new WrongValueException("MetadataCompressor.compress", "TimezoneOffset must be between -720 and 840")
    }
    return structuredClone(metadata)
  }
}
