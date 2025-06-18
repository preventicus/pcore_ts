import {UnixTimestamps} from "@/models/UnixTimestamp"
import {Metadata} from "@/ProtobufDefinitions"
import {Sensor} from "@/ProtobufDefinitions"

/**
 * Represents a complete data packet containing optional metadata,
 * an array of Unix timestamps, and a list of sensors with their values.
 */
export interface Data {
    /**
     * Optional metadata information such as version, device or timezone offset.
     */
    metadata?: Metadata

    /**
     * Unix timestamps in milliseconds associated with the sensor readings.
     * Must be non-empty if sensor data is present.
     */
    timestamps: UnixTimestamps

    /**
     * Array of sensors with associated integer or double values.
     * Must be non-empty if timestamps are present.
     */
    sensors: Sensor[]
}
