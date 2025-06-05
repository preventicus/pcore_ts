
import {Metadata, Version} from "@/ProtobufDefinitions"
import {WrongValueException} from "@/Exception"
import {PcoreVersion} from "@generated/pcoreVersion"

export class MetadataCompressor {
  static compress(metadata?: Metadata): Metadata {

    if (metadata === undefined) {
      return Metadata.create({
        pcoreVersion: {
          major: PcoreVersion.major,
          minor: PcoreVersion.minor,
          patch: PcoreVersion.patch
        }
      })
    }

    if (840 <= metadata.timezoneOffsetMin || metadata.timezoneOffsetMin <= -720) {
      throw new WrongValueException("MetadataCompressor.compress", "TimezoneOffset must be between -720 and 840")
    }

    const metadataPb = structuredClone(metadata)
    metadataPb.pcoreVersion = Version.create({
      major: PcoreVersion.major,
      minor: PcoreVersion.minor,
      patch: PcoreVersion.patch
    })

    return metadataPb
  }
}
