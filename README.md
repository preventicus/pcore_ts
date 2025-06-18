# Pcore TypeScript Library

This TypeScript library provides functionality to read, write, convert, compress, and decompress biomedical time series data in the **Pcore** format. It includes support for working with protobuf-based binary data and a JSON representation of both compressed and decompressed data.

---

## Features

- Read/write `.pcore` binary files (protobuf)
- Read/write `.json` files in compressed or decompressed format
- Compression and decompression of:
    - Timestamps
    - Sensor data (integer and double values)
    - Metadata
- Conversion between compressed protobuf format and human-readable JSON
- Error handling with meaningful exceptions

---

## Project Structure

| Module               | Responsibility                                               |
|----------------------|--------------------------------------------------------------|
| `File`               | Reading/writing binary and JSON files                        |
| `Converter`          | Converts between protobuf format and decompressed JSON       |
| `DataCompressor`     | Compresses metadata, timestamps, and sensors                 |
| `DataDecompressor`   | Decompresses protobuf data into a usable internal format     |
| `Inspector`          | Utility for inspecting protobuf data                         |
| `Exception`          | Custom exception classes                                     |

---

## Installation

To install start the `generate:proto` script.

---

## Usage Examples

Convert .pcore file to decompressed JSON
```
import { File, Converter, DataForm } from "pcore-typescript"

const dataPb = File.readPcoreBinary("input.pcore")
const json = Converter.convertToJson(dataPb, DataForm.Decompressed)
File.writePcoreJson(json, "output.json")
```

Convert decompressed JSON back to .pcore
```
const json = File.readPcoreJson("output.json")
const dataPb = Converter.convertFromJson(json)
File.writePcoreBinary(dataPb, "output.pcore")
```

For more examples see `example` folder.

---

## Testing

For testing run the `test` script.

---

## License 

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

---
