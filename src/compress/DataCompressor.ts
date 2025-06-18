import {Data} from "@/models/Data"
import {DataPb} from "@/ProtobufDefinitions"
import {MetadataCompressor} from "@/compress/MetadataCompressor"
import {TimestampsCompressor} from "@/compress/TimestampsCompressor"
import {SensorCompressor} from "@/compress/SensorCompressor"
import {InvalidDataException} from "@/Exception"

/**
 * Provides functionality to compress full `Data` objects, including metadata,
 * timestamps, and sensor values. Ensures the data is valid and consistent
 * before compression.
 */
export class DataCompressor {

  /**
   * Compresses a complete `Data` object into a `DataPb` object suitable for efficient
   * transmission or storage.
   *
   * This method validates the internal consistency of the data (e.g., matching lengths
   * of timestamps and sensor values) and compresses each part individually using their
   * corresponding compressor classes.
   *
   * @param data - The `Data` object containing metadata, timestamps, and sensor data.
   * @returns A compressed `DataPb` representation of the input.
   * @throws {InvalidDataException} If the data is inconsistent (e.g., timestamps present without sensors, or mismatched lengths).
   */
  static compress(data: Data): DataPb {
    DataCompressor.validate(data)

    const dataPb = DataPb.create()

    dataPb.metadata = MetadataCompressor.compress(data.metadata)

    if (data.timestamps.length !== 0) {
      dataPb.compressedTimestampsContainer = TimestampsCompressor.compress(data.timestamps)
    }

    data.sensors.forEach( sensor => {
      dataPb.sensors.push(SensorCompressor.compress(sensor))
    })

    return dataPb
  }

  /**
   * Validates the consistency of the given `Data` object.
   * Ensures that sensor data and timestamps are aligned and both are present or absent together.
   *
   * @param data - The `Data` object to validate.
   * @throws {InvalidDataException} If the data violates required structural constraints.
   */
  private static validate(data: Data) {

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
