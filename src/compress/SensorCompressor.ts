import {IntValuesContainer, Sensor} from "@/ProtobufDefinitions"

/**
 * Provides compression utilities for sensor data, including delta encoding for integer sequences.
 */
export class SensorCompressor {

  /**
   * Compresses a `Sensor` object by applying delta encoding to integer value sequences.
   *
   * If the sensor contains integer values, each value (after the first) is replaced
   * by the difference from the previous value. Double values are returned unmodified.
   *
   * @param sensor - The original `Sensor` object to be compressed.
   * @returns A new compressed `Sensor` object.
   */
  static compress(sensor: Sensor): Sensor {
    const sensorPb = Sensor.create()

    sensorPb.type = structuredClone(sensor.type)

    switch (sensor.values.oneofKind) {
        case "intValuesContainer": {
          const values = sensor.values.intValuesContainer.values
          if (values.length === 0) {
            sensorPb.values = structuredClone(sensor.values)
            return sensorPb
          }
          const intValuesContainerPb = IntValuesContainer.create()
          intValuesContainerPb.values.push(values[0])
          for (let i = 1; i < values.length; i++) {
            const difference = values[i] - values[i - 1]
            intValuesContainerPb.values.push(difference)
          }

          sensorPb.values = {
            oneofKind: "intValuesContainer",
            intValuesContainer: intValuesContainerPb
          }
          break
        }
        case "doubleValuesContainer": {
          sensorPb.values = structuredClone(sensor.values)
          break
        }
    }
    return sensorPb
  }
}
