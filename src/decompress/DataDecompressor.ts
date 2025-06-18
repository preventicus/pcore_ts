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

import {DataPb, Metadata, Sensor} from "@/ProtobufDefinitions"
import {Data} from "@/models/Data"
import {MetadataDecompressor} from "@/decompress/MetadataDecompressor"
import {TimestampsDecompressor} from "@/decompress/TimestampsDecompressor"
import {SensorDecompressor} from "@/decompress/SensorDecompressor"
import {InvalidDataException} from "@/Exception"

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

    DataDecompressor.validate(dataPb)

    let metadata: Metadata | undefined
    if (dataPb.metadata !== undefined) {
      metadata = MetadataDecompressor.decompress(dataPb.metadata)
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

  /**
   * Validates the internal consistency of the given compressed data object.
   * Ensures that section sizes and durations are structurally valid and match sensor lengths.
   *
   * @param dataPb - The `DataPb` object to validate.
   * @throws {InvalidDataException} If the compressed structure or metadata violates integrity rules.
   */
  private static validate(dataPb: DataPb) {

    if (dataPb.compressedTimestampsContainer !== undefined && dataPb.sensors.length === 0) {
      throw new InvalidDataException("DataDecompressor.validate", "Data must have sensor data if it holds compressed timestamps")
    }

    if (dataPb.compressedTimestampsContainer === undefined && dataPb.sensors.length !== 0) {
      throw new InvalidDataException("DataDecompressor.validate", "Data must hold compressed timestamps if it has sensor data")
    }

    if (dataPb.compressedTimestampsContainer !== undefined && dataPb.sensors.length !== 0) {

      const outerSectionsDurations = dataPb.compressedTimestampsContainer.outerSectionsDurationsMs
      const innerSectionsDurations = dataPb.compressedTimestampsContainer.innerSectionsDurationsMs
      const sectionsSizes = dataPb.compressedTimestampsContainer.sectionsSizes

      const sizeOuter = outerSectionsDurations.length
      const sizeInner = innerSectionsDurations.length
      const sizeSizes = sectionsSizes.length

      if (sizeOuter !== sizeInner || sizeInner !== sizeSizes) {
        throw new InvalidDataException("DataDecompressor.validate", "Vectors in compressed_timestamps_container must have the same length")
      }

      if (sizeSizes === 0) {
        return
      }

      if (outerSectionsDurations[0] !== 0) {
        throw new InvalidDataException("DataDecompressor.validate", "First value in outer_sections_durations_ms must always be 0")
      }
      for (let i = 1; i < sizeSizes; i++ ) {
        if (outerSectionsDurations[i] === 0) {
          throw new InvalidDataException("DataDecompressor.validate", "Any value in outer_sections_durations_ms in pos >= 1 can not be 0")
        }
      }

      for (let i = 0; i < sizeSizes - 1; i++ ) {
        if (innerSectionsDurations[i] === 0) {
          throw new InvalidDataException("DataDecompressor.validate", "Any except the last value in inner_sections_durations_ms can not be 0")
        }
      }

      for (let i = 0; i < sizeSizes; i++ ) {
        if (sectionsSizes[i] === 0) {
          throw new InvalidDataException("DataDecompressor.validate", "Any value in sections_sizes can not be 0")
        }
      }

      let numberOfUnixTimestamps = 0
      for (let i = 0; i < sectionsSizes.length; i++) {
        numberOfUnixTimestamps += sectionsSizes[i]
      }

      if (numberOfUnixTimestamps === 1) {
        if (innerSectionsDurations[0] !== 0) {
          throw new InvalidDataException("DataDecompressor.validate", "inner_sections_durations_ms must equal to 0 if only one unix timestamp is set")
        }
      }

      dataPb.sensors.forEach(sensorPb => {
        if (sensorPb.values.oneofKind === "doubleValuesContainer") {
          if (sensorPb.values.doubleValuesContainer.values.length !== numberOfUnixTimestamps) {
            throw new InvalidDataException("DataDecompressor.validate", "Sensor data must have the same length as unix timestamps")
          }
        }
        if (sensorPb.values.oneofKind === "intValuesContainer") {
          if (sensorPb.values.intValuesContainer.values.length !== numberOfUnixTimestamps) {
            throw new InvalidDataException("DataDecompressor.validate", "Sensor data must have the same length as unix timestamps")
          }
        }
      })
    }
  }
}
