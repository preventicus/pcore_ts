import {Metadata, Sensor} from "@/ProtobufDefinitions"
import {UnixTimestamps} from "@/models/UnixTimestamp"
import {Data} from "@/models/Data"

export class DataBuilder {

  private timestamps: UnixTimestamps = []
  private metadata?: Metadata
  private sensors: Sensor[] = []

  withMetadata(metadata: Metadata): this {
    this.metadata = metadata
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
      metadata: this.metadata,
      timestamps: this.timestamps,
      sensors: this.sensors
    }
  }

}
