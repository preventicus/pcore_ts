import {Device, Metadata, Sensor, Version} from "@/ProtobufDefinitions";
import {UnixTimestamps} from "@/models/UnixTimestamp";
import {Data} from "@/models/Data";

export class DataBuilder {

    private timestamps: UnixTimestamps = []
    private metaData=  Metadata.create()
    private sensors: Sensor[] = []

    withMetadata(metadata: Metadata): this {
        this.metaData = metadata
        return this
    }

    withTimestamps(timestamps: UnixTimestamps): this {
        this.timestamps = timestamps
        return this
    }

    withSensors(sensors: Sensor[]): this {
        this.sensors = sensors
        return this
    }

    withSensor(sensor: Sensor): this {
        this.sensors.push(sensor)
        return this
    }

    build(): Data {
        return {
            metaData: this.metaData,
            timestamps: this.timestamps,
            sensors: this.sensors
        }
    }

}
