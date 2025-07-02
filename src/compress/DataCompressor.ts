/*

Created by Steve Merschel 2025

Copyright © 2025 PREVENTICUS GmbH

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice,
   this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its contributors
   may be used to endorse or promote products derived from this software without
   specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

*/

import { Data } from "@/models/Data"
import { DataPb } from "@/ProtobufDefinitions"
import { MetadataCompressor } from "@/compress/MetadataCompressor"
import { TimestampsCompressor } from "@/compress/TimestampsCompressor"
import { SensorCompressor } from "@/compress/SensorCompressor"
import { InvalidDataException } from "@/Exception"

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

    data.sensors.forEach(sensor => {
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

    if (data.timestamps.length === 0 && data.sensors.length !== 0) {
      throw new InvalidDataException("DataCompressor.validate", "Data must hold unix timestamps if it has sensor data")
    }

    if (data.timestamps.length !== 0 && data.sensors.length === 0) {
      throw new InvalidDataException("DataCompressor.validate", "Data must have sensor data if it holds unix timestamps")
    }

    if (data.timestamps.length !== 0 && data.sensors.length !== 0) {
      const numberOfUnixTimestamps = data.timestamps.length
      data.sensors.forEach(sensor => {
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
