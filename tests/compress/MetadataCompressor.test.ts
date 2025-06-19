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

import { MetadataBuilder } from "../../src/builder/MetadataBuilder"
import { PcoreVersion } from "../../generated/pcore/pcoreVersion"
import { MetadataCompressor } from "../../src/compress/MetadataCompressor"

describe("MetadataCompressorTest", () => {
  test("test", () => {
    const metaData = new MetadataBuilder()
      .withTimezoneOffset(400)
      .withDeviceId("123")
      .withDeviceName("ABC")
      .withDeviceManufacturer("XYZ")
      .withDeviceFirmwareVersion(3, 4, 1)
      .build()

    const compressed = MetadataCompressor.compress(metaData)

    expect(compressed.pcoreVersion?.major).toBe(PcoreVersion.major)
    expect(compressed.pcoreVersion?.minor).toBe(PcoreVersion.minor)
    expect(compressed.pcoreVersion?.patch).toBe(PcoreVersion.patch)

    expect(compressed.device?.name).toBe("ABC")
    expect(compressed.device?.manufacturer).toBe("XYZ")
    expect(compressed.device?.id).toBe("123")

    expect(compressed.device?.firmwareVersion?.major).toBe(3)
    expect(compressed.device?.firmwareVersion?.minor).toBe(4)
    expect(compressed.device?.firmwareVersion?.patch).toBe(1)
  })

  test("WrongTimeZoneOffsetPositiveTest", () => {
    const metaData = new MetadataBuilder()
      .withTimezoneOffset(841)
      .build()

    expect(() => MetadataCompressor.compress(metaData)).toThrow(
      "TimezoneOffset must be between -720 and 840"
    )
  })

  test("WrongTimeZoneOffsetNegativeTest", () => {
    const metaData = new MetadataBuilder()
      .withTimezoneOffset(-721)
      .build()

    expect(() => MetadataCompressor.compress(metaData)).toThrow(
      "TimezoneOffset must be between -720 and 840"
    )
  })
})
