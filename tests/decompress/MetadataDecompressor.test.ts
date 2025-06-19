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
import { MetadataDecompressor } from "../../src/decompress/MetadataDecompressor"

describe("MetadataDecompressorTest", () => {
  test("test", () => {
    const metaData = new MetadataBuilder()
      .withTimezoneOffset(400)
      .withDeviceId("123")
      .withDeviceName("ABC")
      .withDeviceManufacturer("XYZ")
      .withDeviceFirmwareVersion(3, 4, 1)
      .build()

    const decompressed = MetadataDecompressor.decompress(metaData)

    expect(decompressed.pcoreVersion?.major).toBe(PcoreVersion.major)
    expect(decompressed.pcoreVersion?.minor).toBe(PcoreVersion.minor)
    expect(decompressed.pcoreVersion?.patch).toBe(PcoreVersion.patch)

    expect(decompressed.device?.name).toBe("ABC")
    expect(decompressed.device?.manufacturer).toBe("XYZ")
    expect(decompressed.device?.id).toBe("123")

    expect(decompressed.device?.firmwareVersion?.major).toBe(3)
    expect(decompressed.device?.firmwareVersion?.minor).toBe(4)
    expect(decompressed.device?.firmwareVersion?.patch).toBe(1)
  })

  test("WrongTimeZoneOffsetPositiveTest", () => {
    const metaData = new MetadataBuilder()
      .withTimezoneOffset(841)
      .build()

    expect(() => MetadataDecompressor.decompress(metaData)).toThrow(
      "TimezoneOffset must be between -720 and 840"
    )
  })

  test("WrongTimeZoneOffsetNegativeTest", () => {
    const metaData = new MetadataBuilder()
      .withTimezoneOffset(-721)
      .build()

    expect(() => MetadataDecompressor.decompress(metaData)).toThrow(
      "TimezoneOffset must be between -720 and 840"
    )
  })
})
