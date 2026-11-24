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

## Public API

All of the following are exported from the package root (`src/index.ts`).

| Export                                               | Responsibility                                                         |
|------------------------------------------------------|------------------------------------------------------------------------|
| `Data`, `UnixTimestamp(s)`, `SectionIdx(s)`          | Decompressed data model                                                |
| `DataBuilder`, `MetadataBuilder`, `SensorBuilder`    | Fluent builders for creating valid decompressed data                   |
| `DataCompressor`                                     | Compresses metadata, timestamps and sensors into protobuf data         |
| `DataDecompressor`                                   | Decompresses protobuf data into the decompressed data model            |
| `PcoreFile`                                          | Reading/writing binary `.pcore` and JSON files                         |
| `Converter`, `DataForm`                              | Converts between protobuf data and compressed or decompressed JSON     |
| `Inspector`                                          | Reads properties of protobuf data without decompressing it, validation |
| `DataPb`, `Sensor`, `Metadata`, `Color`, …           | Protobuf types generated from the Pcore definition                     |
| `InvalidDataException`, `WrongValueException`        | Thrown when data violates the Pcore validation rules (structure / value range) |

### 64-bit integers

The library implements Pcore version 2.1.0. Unix timestamps and integer sensor values are 64-bit integers in Pcore,
but are represented as JavaScript `number`. Therefore they must be safe integers (between `Number.MIN_SAFE_INTEGER`
and `Number.MAX_SAFE_INTEGER`, i.e. ±(2^53 − 1)); this also applies to the differences between consecutive integer values.
Data that violates this is rejected with a `WrongValueException` when compressing, decompressing or reading a `.pcore` file.

For the same reason the unsigned integers of the compressed timestamps (first unix timestamp, sections sizes, inner and outer
section durations) are checked when decompressing: JavaScript `number` also holds negative values and fractions,
which are rejected with a `WrongValueException`. The same applies in both directions to the integer fields of the metadata and
the sensor types: channel, wavelength, accelerometer type, timezone offset and version numbers.

---

### Validation

Data is validated wherever it enters or leaves the library: `PcoreFile.readPcoreBinary`, `PcoreFile.writePcoreBinary`,
`Converter.convertFromJson`, `Converter.convertToJson`, `DataCompressor.compress` and `DataDecompressor.decompress` throw an
`InvalidDataException` or a `WrongValueException` for invalid data. The `get...` methods of the `Inspector` therefore do not
validate again. For a protobuf object that was built by hand, call `Inspector.validateCompressed` before inspecting it.

To examine a `.pcore` file that the validation rejects, switch the validation off explicitly. The file is then only
decoded; a file that cannot be decoded at all is still rejected with an `InvalidDataException`:

```
const dataPb = PcoreFile.readPcoreBinary("rejected.pcore", { validate: false })
```

---

## Installation

Node.js 18 or newer is required (the library uses `structuredClone`).

### Using the library in another project

The package is called `@preventicus/pcore`. It can be installed directly from this git repository; npm then
compiles the library on its own (script `prepare`):

```
npm install git+ssh://git@github.com/preventicus/pcore_ts.git#<branch, tag or commit>
```

Without `#...` npm takes the default branch. If the package is available in a package registry that your project
is configured for, `npm install @preventicus/pcore` does the same.

Afterwards import from the package name; the type definitions are included:

```
import { DataBuilder, DataCompressor, PcoreFile, SensorBuilder } from "@preventicus/pcore"

const sensor = new SensorBuilder().withIntValues([5, 7]).withElectrocardiogramChannel(1).build()
const data = new DataBuilder().withTimestamps([1000, 1010]).withSensor(sensor).build()
PcoreFile.writePcoreBinary(DataCompressor.compress(data), "output.pcore")
```

Only the compiled library (`dist/`) is part of the installed package, not the sources, tests and examples.

### Working on the library

Clone this repository and install the dependencies with `npm install`; this also compiles the library into `dist/`.
`npm test` runs the tests and `npm run lint` the linter, which needs Node.js 20.19 or newer.

The protobuf code in `src/generated/pcore/` is part of the repository. `npm run generate:proto` is only needed after
changing `.pcore-version`: it fetches the Pcore definition from GitHub and replaces the generated code.

---

## Usage Examples

Convert .pcore file to decompressed JSON
```
import { PcoreFile, Converter, DataForm } from "@preventicus/pcore"

const dataPb = PcoreFile.readPcoreBinary("input.pcore")
const json = Converter.convertToJson(dataPb, DataForm.Decompressed)
PcoreFile.writePcoreJson(json, "output.json")
```

Convert decompressed JSON back to .pcore
```
const json = PcoreFile.readPcoreJson("output.json")
const dataPb = Converter.convertFromJson(json)
PcoreFile.writePcoreBinary(dataPb, "output.pcore")
```

### JSON forms

`Converter.convertToJson` writes one of two forms, and `Converter.convertFromJson` reads both.

**`DataForm.Compressed`** is the compressed data in the [protobuf JSON format](https://protobuf.dev/programming-guides/json/).
Every protobuf implementation can read and write it with the Pcore proto file, e.g. `json_format.Parse` in Python.
A sensor holds its values container and its sensor type directly, enum values are written by name,
64-bit integers as strings, and fields with their default value (e.g. `"channel": 0`) are omitted:

```json
{
  "metadata": { "pcoreVersion": { "major": 2, "minor": 1 } },
  "compressedTimestampsContainer": {
    "firstUnixTimestampMs": "1000",
    "outerSectionsDurationsMs": [0],
    "innerSectionsDurationsMs": [10],
    "sectionsSizes": [2]
  },
  "sensors": [
    { "intValuesContainer": { "values": ["5", "2"] }, "electrocardiogram": { "channel": 1 } },
    { "doubleValuesContainer": { "values": [0.5, 0.7] }, "photoplethysmograph": { "color": "COLOR_GREEN" } }
  ]
}
```

When reading, the alternatives that protobuf JSON allows are accepted as well: numbers instead of strings for 64-bit integers,
numbers instead of names for enum values, and the field names of the proto file (`compressed_timestamps_container`).

**`DataForm.Decompressed`** is a human-readable form of this library with the decompressed timestamps and values.
It is not a protobuf JSON format:

```json
{
  "metadata": { "timezoneOffsetMin": 0, "pcoreVersion": { "major": 2, "minor": 1, "patch": 0 } },
  "timestamps": [1000, 1010],
  "sensors": [
    { "valuesType": "intValuesContainer", "values": [5, 7], "electrocardiogram": { "channel": 1 } },
    { "valuesType": "doubleValuesContainer", "values": [0.5, 0.7], "photoplethysmograph": { "color": "GREEN", "channel": 0 } }
  ]
}
```

For more examples see the `src/example` folder.

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
