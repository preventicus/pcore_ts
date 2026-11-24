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

import { DataPb } from "@/ProtobufDefinitions"
import { InvalidDataException, WrongValueException } from "@/Exception"
import { Inspector } from "@tools/inspector/Inspector"
import * as fs from "node:fs"

/**
 * Options of `PcoreFile.readPcoreBinary`.
 */
export interface ReadPcoreBinaryOptions {
  /**
   * Whether the decoded data is validated with `Inspector.validateCompressed`. Defaults to `true`.
   *
   * Set it to `false` only to examine a file that the validation rejects, e.g. to find out what is wrong with it.
   * The returned data is then not checked: the `get...` methods of the `Inspector` may return meaningless
   * results for it, and decompressing or converting it still fails.
   */
  validate?: boolean
}

/**
 * Utility class for reading and writing Pcore data in binary and JSON formats.
 * It is not named `File`, because that is a global class of browsers and Node.js.
 */
export class PcoreFile {
  /**
   * Writes a DataPb object to disk as a Pcore binary file.
   * @param dataPb The DataPb object to write
   * @param path The target file path
   * @throws {InvalidDataException} If the data is structurally inconsistent, e.g. empty
   * @throws {WrongValueException} If a single value is outside of its allowed range
   */
  static writePcoreBinary(dataPb: DataPb, path: string) {
    Inspector.validateCompressed(dataPb)
    const raw = DataPb.toBinary(dataPb)
    fs.writeFileSync(path, raw)
  }

  /**
   * Reads a Pcore binary file from disk, deserializes it into a DataPb object and validates it.
   * Data from a file is therefore valid compressed data, as the `Inspector` and the `Converter` expect it.
   * Errors of the file system, e.g. a missing file, are passed on unchanged.
   * @param path The path to the binary file
   * @param options Optional. `{ validate: false }` returns the decoded data without validating it,
   *                which is meant for examining a file that the validation rejects
   * @returns The deserialized DataPb object, validated unless the validation was switched off
   * @throws {InvalidDataException} If the content cannot be decoded, e.g. a truncated file or a file of
   *                                another format, or if the data is structurally inconsistent, e.g. empty
   * @throws {WrongValueException} If a single value is outside of its allowed range, e.g. a 64-bit integer
   *                               that is not a safe JavaScript integer
   */
  static readPcoreBinary(path: string, options: ReadPcoreBinaryOptions = {}): DataPb {
    const dataPb = PcoreFile.decode(fs.readFileSync(path))
    if (options.validate ?? true) {
      Inspector.validateCompressed(dataPb)
    }
    return dataPb
  }

  private static decode(raw: Uint8Array): DataPb {
    try {
      return DataPb.fromBinary(raw)
    } catch (error) {
      // 64-bit integers are read as `number`, protobuf-ts throws this error for values outside of ±(2^53 - 1)
      if (error instanceof Error && error.message === "cannot convert to safe number") {
        throw new WrongValueException("PcoreFile.readPcoreBinary", "64-bit integers must be safe integers")
      }
      // every other decoding error means that the file is truncated, damaged or not a Pcore file
      throw new InvalidDataException("PcoreFile.readPcoreBinary", `The file cannot be decoded as Pcore data (${String(error)})`)
    }
  }

  /**
   * Writes a JSON string to disk as a Pcore JSON file.
   * @param json The JSON string to write
   * @param path The target file path
   */
  static writePcoreJson(json: string, path: string) {
    fs.writeFileSync(path, json, { encoding: "utf8" })
  }

  /**
   * Reads a Pcore JSON file from disk and returns its content as a string.
   * @param path The path to the JSON file
   * @returns The file content as a UTF-8 string
   */
  static readPcoreJson(path: string): string {
    return fs.readFileSync(path, { encoding: "utf8" })
  }
}

/**
 * The former name of `PcoreFile`.
 * @deprecated Use `PcoreFile` instead. `File` hides the global class of the same name.
 */
export const File = PcoreFile
