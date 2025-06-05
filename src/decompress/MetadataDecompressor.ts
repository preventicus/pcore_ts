import {Metadata} from "@/ProtobufDefinitions"
import {WrongValueException} from "@/Exception"

export class MetadataDecompressor {
  static decompress(metadata: Metadata): Metadata  {
    if (840 <= metadata.timezoneOffsetMin || metadata.timezoneOffsetMin <= -720) {
      throw new WrongValueException("MetadataCompressor.compress", "TimezoneOffset must be between -720 and 840")
    }
    return structuredClone(metadata)
  }
}
