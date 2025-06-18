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

import {DataPb} from "../../src/ProtobufDefinitions"
import {DataCompressor} from "../../src/compress/DataCompressor"
import {File} from "../../tools/file/File"
import {DataDecompressor} from "../../src/decompress/DataDecompressor"
import {data as dataWrite} from "../ExampleData"

function main() {

  /*
    * Writing Binary
    */
  const dataWritePb = DataCompressor.compress(dataWrite)

  try {
    File.writePcoreBinary(dataWritePb, __dirname + "/dataWrite.pcore")
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("Error when writing the file: ", e)
  }

  /*
     * Reading Binary
     */

  let dataReadPb: DataPb | undefined

  try {
    dataReadPb = File.readPcoreBinary(__dirname + "/dataWrite.pcore")
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("Error when reading the file: ", e)
    return
  }

  if (dataReadPb === undefined) {
    // eslint-disable-next-line no-console
    console.error("Error when reading the file:")
    return
  }

  const dataRead = DataDecompressor.decompress(dataReadPb)

  /* eslint-disable no-console */
  console.log(JSON.stringify(dataRead, null, 2))
  /* eslint-enable no-console */

}

main()
