import {IntValuesContainer, Sensor} from "@/ProtobufDefinitions";

export class SensorCompressor {
    static compress(sensor: Sensor): Sensor {
        let sensorPb = Sensor.create()

        sensorPb.type = structuredClone(sensor.type)

        switch (sensor.values.oneofKind) {
            case "intValuesContainer": {
                const values = sensor.values.intValuesContainer.values
                if (values.length === 0) return sensorPb
                const intValuesContainer = IntValuesContainer.create()
                intValuesContainer.values.push(values[0])
                for (let i = 1; i < values.length; i++) {
                    const difference = values[i] - values[i - 1];
                    intValuesContainer.values.push(difference);
                }
                break
            }
            case "doubleValuesContainer": {
                if (sensor.values.doubleValuesContainer.values.length === 0) return sensorPb
                sensorPb.values = structuredClone(sensor.values)
                break
            }
        }
        return sensorPb
    }
}
