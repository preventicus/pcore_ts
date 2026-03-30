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

import { DataPb, Metadata, Sensor } from "@/ProtobufDefinitions"
import { Data } from "@/models/Data"
import { TimestampsDecompressor } from "@/decompress/TimestampsDecompressor"
import { SensorDecompressor } from "@/decompress/SensorDecompressor"
import { Inspector } from "@tools/inspector/Inspector"

/**
 * Provides functionality to decompress `DataPb` objects into full `Data` objects.
 * This includes metadata, decompressed timestamps, and sensor data.
 * Ensures the consistency and structural validity of compressed input before decompression.
 */
export class DataDecompressor {
  /**
   * Decompresses a `DataPb` object back into its original `Data` structure.
   * Validates the structure and integrity of the compressed data before reconstruction.
   *
   * @param dataPb - The compressed data in protocol buffer format (`DataPb`).
   * @returns A fully reconstructed `Data` object including metadata, timestamps, and sensors.
   * @throws {InvalidDataException} If the compressed data is structurally invalid or inconsistent.
   */
  static decompress(dataPb: DataPb): Data {
    Inspector.validateCompressed(dataPb)

    let metadata: Metadata | undefined
    if (dataPb.metadata !== undefined) {
      metadata = structuredClone(dataPb.metadata)
    }

    const timestamps = TimestampsDecompressor.decompress(dataPb.compressedTimestampsContainer)

    const sensors : Sensor[] = []

    dataPb.sensors.forEach(sensorPb => {
      const sensor = SensorDecompressor.decompress(sensorPb)
      sensors.push(sensor)
    })

    return {
      metadata: metadata,
      timestamps: timestamps,
      sensors: sensors
    }
  }
}
