import {
    AccelerometerType,
    Color,
    DataPb,
    Metadata,
    Sensor
} from "../../src/ProtobufDefinitions"
import {DataCompressor} from "../../src/compress/DataCompressor"
import {Data} from "@/models/Data"
import {DataDecompressor} from "../../src/decompress/DataDecompressor"
import {DataForm} from "./DataForm"
import {UnixTimestamps} from "../../src/models/UnixTimestamp"

interface DecompressedPhotoplethysmographWavelengthSensorJson {
    valuesType: string,
    values: number[],
    photoplethysmograph: {
        wavelengthNm: number
    }
}

interface DecompressedPhotoplethysmographColorSensorJson {
    valuesType: string,
    values: number[],
    photoplethysmograph: {
        color: string
    }
}

interface DecompressedAccelerometerSensorJson {
    valuesType: string,
    values: number[],
    accelerometer: {
        type: string
    }
}

interface DecompressedElectrocardiogramSensorJson {
    valuesType: string,
    values: number[],
    electrocardiogram: {
        channel: number
    }
}

type DecompressedSensor =
      DecompressedPhotoplethysmographWavelengthSensorJson
    | DecompressedPhotoplethysmographColorSensorJson
    | DecompressedAccelerometerSensorJson
    | DecompressedElectrocardiogramSensorJson

interface DecompressedPcoreJson {
    metadata?: Metadata,
    timestamps: UnixTimestamps,
    sensors: DecompressedSensor[]
}

/**
 * The Converter class provides static methods to convert between
 * compressed Protobuf data (DataPb) and a human-readable JSON format.
 */
export class Converter {

    /**
     * Converts a protobuf data object to JSON.
     *
     * @param dataPb - The protobuf data object.
     * @param dataForm - Indicates whether the data is compressed or decompressed.
     * @returns The JSON string representation of the data.
     * @throws {Error} Throws if internal parsing fails or unsupported sensor types are encountered.
     */
    static convertToJson(dataPb: DataPb, dataForm: DataForm): string {
        switch (dataForm) {
            case DataForm.Compressed: {
                return JSON.stringify(dataPb)
            }
            case DataForm.Decompressed: {
                const data = DataDecompressor.decompress(dataPb)
                const decompressedPcoreJson: DecompressedPcoreJson = {
                    metadata: data.metadata,
                    timestamps: data.timestamps,
                    sensors: data.sensors.map(Converter.parseToDecompressedSensor)
                }
                return JSON.stringify(decompressedPcoreJson)
            }
        }
    }

    /**
     * Converts a JSON string back into a DataPb object.
     * Accepts both compressed and decompressed JSON structures.
     *
     * @param json - The JSON string to convert.
     * @returns A DataPb object reconstructed from the JSON.
     * @throws {Error} Throws if internal parsing fails or unsupported sensor types are encountered.
     */
    static convertFromJson(json: string): DataPb {
        const parsedJson = JSON.parse(json)
        if ("compressedTimestampsContainer" in parsedJson) {
            return parsedJson as DataPb
        }
        const decompressedPcoreJson = parsedJson as DecompressedPcoreJson
        const data: Data = {
            metadata: decompressedPcoreJson.metadata,
            timestamps: decompressedPcoreJson.timestamps,
            sensors: decompressedPcoreJson.sensors.map(Converter.parseFromDecompressedSensor)
        }
        return DataCompressor.compress(data)
    }

    /**
     * Converts a Sensor protobuf object into a decompressed JSON representation.
     *
     * @param sensor - The Sensor protobuf object.
     * @returns A DecompressedSensor JSON object.
     * @throws {Error} If the sensor type or value type is unsupported.
     */
    private static parseToDecompressedSensor(sensor: Sensor): DecompressedSensor {
        let values: number[] = []
        switch (sensor.values.oneofKind) {
            case "intValuesContainer": {
                values = sensor.values.intValuesContainer.values
                break
            }
            case "doubleValuesContainer": {
                values = sensor.values.doubleValuesContainer.values
                break
            }
            default: {
                throw new Error(`Unsupported sensor value type: ${sensor.values.oneofKind}`)
            }
        }

        switch (sensor.type.oneofKind) {
            case "accelerometer": {
                return {
                    valuesType: sensor.values.oneofKind,
                    values,
                    accelerometer: {
                        type: AccelerometerType[sensor.type.accelerometer.type]
                    }
                } satisfies DecompressedAccelerometerSensorJson
            }
            case "photoplethysmograph": {
                switch (sensor.type.photoplethysmograph.light.oneofKind) {
                    case "wavelengthNm": {
                        return {
                            valuesType: sensor.values.oneofKind,
                            values,
                            photoplethysmograph: {
                                wavelengthNm: sensor.type.photoplethysmograph.light.wavelengthNm,
                            }
                        } satisfies DecompressedPhotoplethysmographWavelengthSensorJson
                    }
                    case "color": {
                        return {
                            valuesType: sensor.values.oneofKind,
                            values,
                            photoplethysmograph: {
                                color: Color[sensor.type.photoplethysmograph.light.color],
                            }
                        } satisfies DecompressedPhotoplethysmographColorSensorJson
                    }
                    default: {
                        throw new Error(`Unsupported sensor photoplethysmograph type: ${sensor.type.photoplethysmograph.light.oneofKind}`)
                    }
                }
            }
            case "electrocardiogram": {
                return {
                    valuesType: sensor.values.oneofKind,
                    values,
                    electrocardiogram: {
                        channel: sensor.type.electrocardiogram.channel
                    }
                } satisfies DecompressedElectrocardiogramSensorJson
            }
            default: {
                throw new Error(`Unsupported sensor type: ${sensor.type.oneofKind}`)
            }
        }
    }

    /**
     * Converts a decompressed JSON representation of a sensor back into a Sensor protobuf object.
     *
     * @param sensor - The decompressed sensor JSON object.
     * @returns A Sensor protobuf object.
     * @throws {Error} If the sensor type or value type is unsupported.
     */
    private static parseFromDecompressedSensor(sensor: any): Sensor {

        const photoplethysmographColorMap: Record<string, Color> = {
            GREEN: Color.GREEN,
            RED: Color.RED,
            BLUE: Color.BLUE
        }

        if (sensor.valuesType !== "intValuesContainer" || sensor.valuesType !== "doubleValuesContainer") {
            throw new Error(`Unsupported sensor value type: ${sensor.valuesType}`)
        }

        const result: any = {
            values: {
                oneofKind: sensor.valuesType,
                [`${sensor.valuesType}`]: {
                    values: sensor.values
                }
            }
        }

        if (sensor.accelerometer) {
            result.type = {
                oneofKind: "accelerometer",
                accelerometer: {
                    type: AccelerometerType[sensor.accelerometer.type as keyof typeof AccelerometerType]
                }
            }
        }

        if (sensor.electrocardiogram) {
            result.type = {
                oneofKind: "electrocardiogram",
                electrocardiogram: {
                    channel: sensor.electrocardiogram.channel
                }
            }
        }

        if (sensor.photoplethysmograph) {
            if ("color" in sensor.photoplethysmograph) {
                const colorString = sensor.photoplethysmograph.color
                const colorEnum = photoplethysmographColorMap[colorString]
                result.type = {
                    oneofKind: "photoplethysmograph",
                    photoplethysmograph: {
                        light: {
                            oneofKind: "color",
                            color: colorEnum ?? Color.UNSPECIFIED
                        }
                    }
                }
            } else if ("wavelengthNm" in sensor.photoplethysmograph) {
                result.type = {
                    oneofKind: "photoplethysmograph",
                    photoplethysmograph: {
                        light: {
                            oneofKind: "wavelengthNm",
                            wavelengthNm: sensor.photoplethysmograph.wavelengthNm
                        }
                    }
                }
            } else {
                throw new Error("Unsupported sensor type")
            }
        }
        return result
    }
}
