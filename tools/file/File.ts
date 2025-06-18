import {DataPb} from "../../src/ProtobufDefinitions"
import * as fs from "node:fs"

export class File {
  static writePcoreBinary(dataPb:DataPb, path: string) {
    const raw = DataPb.toBinary(dataPb)
    fs.writeFileSync(path, raw)
  }

  static readPcoreBinary(path: string) : DataPb {
    const raw = fs.readFileSync(path)
    return DataPb.fromBinary(raw)
  }

  static writePcoreJson(json: string, path: string) {
    fs.writeFileSync(path, json, { encoding: "utf8" })
  }

  static readPcoreJson(path: string): string {
    return fs.readFileSync(path, { encoding: "utf8" })
  }

}
