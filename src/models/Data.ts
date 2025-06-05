import {UnixTimestamps} from "@/models/UnixTimestamp"
import {Metadata} from "@/ProtobufDefinitions"
import {Sensor} from "@/ProtobufDefinitions"

export interface Data {
    metadata?: Metadata
    timestamps: UnixTimestamps
    sensors: Sensor[]
}
