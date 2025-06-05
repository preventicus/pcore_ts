import {IntValuesContainer, Sensor} from "@/ProtobufDefinitions"

export class SensorCompressor {
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
