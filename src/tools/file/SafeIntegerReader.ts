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

import { BinaryReader, PbLong, PbULong } from "@protobuf-ts/runtime"
import { WrongValueException } from "@/Exception"

const TWO_POWER_32 = 4294967296

/**
 * A binary reader of protobuf-ts that reports 64-bit integers outside of the safe integer range
 * ±(2^53 - 1) as `WrongValueException`.
 *
 * This library reads 64-bit integers as `number`, and protobuf-ts cannot be relied on for values
 * that do not fit:
 * - Most of them it rejects with a plain `Error`, which could only be told apart from other decoding
 *   errors by its message text.
 * - Unsigned values close to 2^64 it converts without an error into small negative numbers,
 *   e.g. 18446744073709551516 into -100 (observed with @protobuf-ts/runtime 2.11).
 *
 * This reader therefore checks every 64-bit integer itself, right where it is read.
 */
export class SafeIntegerReader extends BinaryReader {
  override int64(): PbLong {
    return SafeIntegerReader.checkedSigned(super.int64())
  }

  override uint64(): PbULong {
    return SafeIntegerReader.checkedUnsigned(super.uint64())
  }

  override sint64(): PbLong {
    return SafeIntegerReader.checkedSigned(super.sint64())
  }

  override fixed64(): PbULong {
    return SafeIntegerReader.checkedUnsigned(super.fixed64())
  }

  override sfixed64(): PbLong {
    return SafeIntegerReader.checkedSigned(super.sfixed64())
  }

  // protobuf-ts holds a 64-bit integer as its upper and lower 32 bits. The sum below is exact for
  // every safe integer; a larger magnitude may be rounded, but never into the safe range.

  private static checkedSigned(value: PbLong): PbLong {
    // the upper half carries the sign, the lower half is unsigned
    return SafeIntegerReader.checked(value, (value.hi | 0) * TWO_POWER_32 + (value.lo >>> 0))
  }

  private static checkedUnsigned(value: PbULong): PbULong {
    return SafeIntegerReader.checked(value, (value.hi >>> 0) * TWO_POWER_32 + (value.lo >>> 0))
  }

  private static checked<T extends PbLong | PbULong>(value: T, asNumber: number): T {
    if (!Number.isSafeInteger(asNumber)) {
      throw new WrongValueException("SafeIntegerReader", `64-bit integers must be safe integers, but the data holds ${value.toString()}`)
    }
    return value
  }
}
