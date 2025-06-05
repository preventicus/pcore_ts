import {Sensor} from "@/ProtobufDefinitions"


export class SensorDecompressor {
  static decompress(sensorPb: Sensor): Sensor {

    const sensor = Sensor.create()
    sensor.type   = structuredClone(sensorPb.type)

    switch (sensorPb.values.oneofKind) {
        case "intValuesContainer": {

          const valuesPb = sensorPb.values.intValuesContainer.values
          const sizeValuesPb = valuesPb.length

          const values = new Array<number>(sizeValuesPb)

          if (sizeValuesPb > 0) {
            values[0] = valuesPb[0]
            for (let i = 1; i < sizeValuesPb; i++) {
              values[i] = valuesPb[i] + values[i - 1]
            }
          }

          sensor.values = {
            oneofKind: "intValuesContainer",
            intValuesContainer: {
              values: values
            }
          }
          break
        }
        case "doubleValuesContainer": {
          sensor.values = structuredClone(sensorPb.values)
          break
        }
    }
    return sensor
  }
}
