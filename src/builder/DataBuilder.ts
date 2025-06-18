import {Metadata, Sensor} from "@/ProtobufDefinitions"
import {UnixTimestamps} from "@/models/UnixTimestamp"
import {Data} from "@/models/Data"

/**
 * A builder class for constructing a Data object step-by-step.
 */
export class DataBuilder {

  private timestamps: UnixTimestamps = []
  private metadata?: Metadata
  private sensors: Sensor[] = []

  /**
   * Sets the metadata for the Data object.
   * @param metadata - The metadata to assign
   * @returns The current builder instance for method chaining
   */
  withMetadata(metadata: Metadata): this {
    this.metadata = metadata
    return this
  }

  /**
   * Sets the timestamps for the Data object.
   * @param timestamps - An array of Unix timestamps
   * @returns The current builder instance for method chaining
   */
  withTimestamps(timestamps: UnixTimestamps): this {
    this.timestamps = timestamps
    return this
  }

  /**
   * Replaces the current list of sensors with the provided list.
   * @param sensors - An array of Sensor objects
   * @returns The current builder instance for method chaining
   */
  withSensors(sensors: Sensor[]): this {
    this.sensors = sensors
    return this
  }

  /**
   * Adds a single sensor to the Data object.
   * @param sensor - A Sensor object to add
   * @returns The current builder instance for method chaining
   */
  withSensor(sensor: Sensor): this {
    this.sensors.push(sensor)
    return this
  }

  /**
   * Builds the final Data object using the provided components.
   * @returns A fully constructed Data object
   */
  build(): Data {
    return {
      metadata: this.metadata,
      timestamps: this.timestamps,
      sensors: this.sensors
    }
  }
}
