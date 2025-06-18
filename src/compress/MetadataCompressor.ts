
import {Metadata, Version} from "@/ProtobufDefinitions"
import {WrongValueException} from "@/Exception"
import {PcoreVersion} from "@generated/pcoreVersion"

/**
 * Provides utilities to compress or sanitize metadata for transmission or storage.
 */
export class MetadataCompressor {

  /**
   * Compresses a `Metadata` object by ensuring its `pcoreVersion` is set to the current version
   * and by validating the timezone offset.
   *
   * If no metadata is provided, a default `Metadata` instance with only the `pcoreVersion` is returned.
   *
   * @param metadata - The optional `Metadata` object to compress.
   * @returns A new `Metadata` object with the current `pcoreVersion`.
   * @throws {WrongValueException} If the timezone offset is outside the valid range [-720, 840].
   */
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
