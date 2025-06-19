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

import { DataCompressor } from "../../src/compress/DataCompressor"
import { Converter } from "../../tools/converter/Converter"
import { DataForm } from "../../tools/converter/DataForm"
import { data } from "../ExampleData"

function main() {
  const dataPb = DataCompressor.compress(data)

  const decompressedJson = Converter.convertToJson(dataPb, DataForm.Decompressed)
  const compressedJson = Converter.convertToJson(dataPb, DataForm.Compressed)

  /* eslint-disable no-console */
  console.log(decompressedJson)
  console.log("\n")
  console.log(compressedJson)
  /* eslint-enable no-console */

  const dataPbConvertedFromDecompressedJson = Converter.convertFromJson(decompressedJson)
  const dataPbConvertedFromCompressedJson = Converter.convertFromJson(compressedJson)

  /* eslint-disable no-console */
  console.log("\n")
  console.log(JSON.stringify(dataPbConvertedFromDecompressedJson))
  console.log("\n")
  console.log(JSON.stringify(dataPbConvertedFromCompressedJson))
  /* eslint-disable no-console */
}

main()
