
import {Metadata} from "@/ProtobufDefinitions";
import {Exception, WrongValueException} from "@/Exception";

export class MetadataCompressor {
    static compress(metadata: Metadata): Metadata {
        if (840 <= metadata.timezoneOffsetMin || metadata.timezoneOffsetMin <= -720) {
            throw new WrongValueException("MetadataCompressor.compress", "TimezoneOffset must be between -720 and 840")
        }
        return structuredClone(metadata)
    }
}
