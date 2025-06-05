import {DataPb} from "../../src/ProtobufDefinitions"
import * as fs from "node:fs"

export class File {
  static write(dataPb:DataPb, path: string) {
    const raw = DataPb.toBinary(dataPb)
    fs.writeFileSync(path, raw)
  }

  static read(path: string) : DataPb {
    const raw = fs.readFileSync(path)
    return DataPb.fromBinary(raw)
  }
}
