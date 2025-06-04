import {Data} from "@/models/Data";
import {DataPb} from "@/ProtobufDefinitions";
import {MetadataCompressor} from "@/compress/MetadataCompressor";
import {TimestampsCompressor} from "@/compress/TimestampsCompressor";
import {SensorCompressor} from "@/compress/SensorCompressor";
import {InvalidDataException} from "@/Exception";

export class DataCompressor {
    static compress(data: Data): DataPb {
        DataCompressor.validate(data)

        const dataPb = DataPb.create()

        dataPb.metadata = MetadataCompressor.compress(data.metaData);

        if (data.timestamps.length !== 0) {
            dataPb.compressedTimestampsContainer = TimestampsCompressor.compress(data.timestamps)
        }

        data.sensors.forEach( sensor => {
            dataPb.sensors.push(SensorCompressor.compress(sensor))
        })

        return dataPb;
    }

    static validate(data: Data) {

        // case  data.timestamps.length === 0 && data.sensors.length === 0
        // means data are empty, every thing is fine.

        if ( data.timestamps.length === 0 && data.sensors.length !== 0 ) {
            throw new InvalidDataException("DataCompressor.validate", "Data must hold unix timestamps if it has sensor data")
        }

        if ( data.timestamps.length !== 0  && data.sensors.length === 0 ) {
            throw new InvalidDataException("DataCompressor.validate", "Data must have sensor data if it holds unix timestamps")
        }

        if (data.timestamps.length !== 0 && data.sensors.length !== 0) {
            const numberOfUnixTimestamps = data.timestamps.length
            data.sensors.forEach( sensor => {
                switch (sensor.values.oneofKind) {
                    case "intValuesContainer": {
                        const values = sensor.values.intValuesContainer.values
                        if (values.length !== numberOfUnixTimestamps) {
                            throw new InvalidDataException("DataCompressor.validate", "Number of unix timestamps should be equal to the number of data points")
                        }
                        break
                    }
                    case "doubleValuesContainer": {
                        const values = sensor.values.doubleValuesContainer.values
                        if (values.length !== numberOfUnixTimestamps) {
                            throw new InvalidDataException("DataCompressor::validate", "Number of unix timestamps should be equal to the number of data points")
                        }
                        break
                    }
                }
            })
        }
    }
}
