import {Metadata} from "@/ProtobufDefinitions"
import {WrongValueException} from "@/Exception"

/**
 * Provides functionality to decompress `Metadata` objects.
 * Ensures that metadata fields, such as timezone offset, are within valid bounds.
 */
export class MetadataDecompressor {

  /**
   * Decompresses a `Metadata` object by validating and returning a cloned version.
   *
   * @param metadata - The metadata object to decompress.
   * @returns A deep clone of the validated `Metadata` object.
   * @throws {WrongValueException} If the timezone offset is outside the valid range [-720, 840].
   */
  static decompress(metadata: Metadata): Metadata  {
    if (840 <= metadata.timezoneOffsetMin || metadata.timezoneOffsetMin <= -720) {
      throw new WrongValueException("MetadataCompressor.compress", "TimezoneOffset must be between -720 and 840")
    }
    return structuredClone(metadata)
  }
}
