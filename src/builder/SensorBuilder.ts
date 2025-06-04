import {Sensor, Color, AccelerometerType, Electrocardiogram} from "@/ProtobufDefinitions"

export class SensorBuilder {
    private sensor: Sensor = {
        values: { oneofKind: undefined },
        type: { oneofKind: undefined },
    }

    withIntValues(values: number[]): this {
        this.sensor.values = {
            oneofKind: "intValuesContainer",
            intValuesContainer: { values },
        }
        return this
    }

    withDoubleValues(values: number[]): this {
        this.sensor.values = {
            oneofKind: "doubleValuesContainer",
            doubleValuesContainer: { values },
        }
        return this
    }

    withPhotoplethysmographColor(color: Color): this {
        this.sensor.type = {
            oneofKind: "photoplethysmograph",
            photoplethysmograph: {
                light: {
                    oneofKind: "color",
                    color,
                },
            },
        }
        return this
    }

    withPhotoplethysmographWavelength(wavelengthNm: number): this {
        this.sensor.type = {
            oneofKind: "photoplethysmograph",
            photoplethysmograph: {
                light: {
                    oneofKind: "wavelengthNm",
                    wavelengthNm,
                },
            },
        }
        return this
    }

    withAccelerometerType(type: AccelerometerType): this {
        this.sensor.type = {
            oneofKind: "accelerometer",
            accelerometer: {
                type: type
            }
        }
        return this
    }

    withElectrocardiogramChannel(channel: number): this {
        this.sensor.type = {
            oneofKind: "electrocardiogram",
            electrocardiogram: {
                channel: channel
            }
        }
        return this
    }

    build(): Sensor {
        return this.sensor
    }
}
