import {DataPb} from "../../src/ProtobufDefinitions"
import * as fs from "node:fs"

/**
 * Utility class for reading and writing Pcore data in binary and JSON formats.
 */
export class File {

  /**
   * Writes a DataPb object to disk as a Pcore binary file.
   * @param dataPb The DataPb object to write
   * @param path The target file path
   */
  static writePcoreBinary(dataPb:DataPb, path: string) {
    const raw = DataPb.toBinary(dataPb)
    fs.writeFileSync(path, raw)
  }

  /**
   * Reads a Pcore binary file from disk and deserializes it into a DataPb object.
   * @param path The path to the binary file
   * @returns The deserialized DataPb object
   */
  static readPcoreBinary(path: string) : DataPb {
    const raw = fs.readFileSync(path)
    return DataPb.fromBinary(raw)
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
