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

import { BinaryWriter } from "@protobuf-ts/runtime"
import { SafeIntegerReader } from "@tools/file/SafeIntegerReader"
import { WrongValueException } from "@/index"

// JavaScript-specific, so no spec counterpart: 64-bit integers are read as number and must be safe integers
describe("SafeIntegerReaderTest", () => {
  const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER)
  const signedKinds = ["int64", "sint64", "sfixed64"] as const
  const unsignedKinds = ["uint64", "fixed64"] as const

  function read(kind: typeof signedKinds[number] | typeof unsignedKinds[number], value: bigint): number {
    const raw = new BinaryWriter()[kind](value).finish()
    return new SafeIntegerReader(raw)[kind]().toNumber()
  }

  test("SafeIntegersTest", () => {
    for (const kind of signedKinds) {
      expect(read(kind, MAX_SAFE)).toBe(Number.MAX_SAFE_INTEGER)
      expect(read(kind, -MAX_SAFE)).toBe(Number.MIN_SAFE_INTEGER)
      expect(read(kind, BigInt(0))).toBe(0)
    }
    for (const kind of unsignedKinds) {
      expect(read(kind, MAX_SAFE)).toBe(Number.MAX_SAFE_INTEGER)
      expect(read(kind, BigInt(0))).toBe(0)
    }
  })

  test("UnsafeIntegersTest", () => {
    for (const kind of signedKinds) {
      expect(() => read(kind, MAX_SAFE + BigInt(1))).toThrow(WrongValueException)
      expect(() => read(kind, -MAX_SAFE - BigInt(1))).toThrow(WrongValueException)
      expect(() => read(kind, BigInt("9223372036854775807"))).toThrow(WrongValueException)
      expect(() => read(kind, BigInt("-9223372036854775808"))).toThrow(WrongValueException)
    }
    for (const kind of unsignedKinds) {
      expect(() => read(kind, MAX_SAFE + BigInt(1))).toThrow(WrongValueException)
      expect(() => read(kind, BigInt("18446744073709551615"))).toThrow(WrongValueException)
    }
  })

  test("MessageNamesTheValueTest", () => {
    expect(() => read("sint64", BigInt("-9007199254740992"))).toThrow("SafeIntegerReader: 64-bit integers must be safe integers, but the data holds -9007199254740992")
  })
})
