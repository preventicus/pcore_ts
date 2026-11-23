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

import { IntValuesContainer, Sensor } from "@/ProtobufDefinitions"
import { getIntValues } from "@/util/utils"

/**
 * Provides compression utilities for sensor data, including delta encoding for integer sequences.
 */
export class SensorCompressor {
  /**
   * Compresses a `Sensor` object by applying delta encoding to integer value sequences.
   *
   * If the sensor contains integer values, each value (after the first) is replaced
   * by the difference from the previous value. Double values are returned unmodified.
   *
   * @param sensor - The original `Sensor` object to be compressed.
   * @returns A new compressed `Sensor` object.
   */
  static compress(sensor: Sensor): Sensor {
    const sensorPb = Sensor.create()

    sensorPb.type = structuredClone(sensor.type)

    const values = getIntValues(sensor)
    if (values === undefined) {
      // double values are stored unchanged
      sensorPb.values = structuredClone(sensor.values)
      return sensorPb
    }

    // CompressIntegerValues: the first value is stored as difference to zero
    const compressedValues: number[] = []
    if (values.length > 0) {
      compressedValues.push(values[0])
      for (let i = 1; i < values.length; i++) {
        compressedValues.push(values[i] - values[i - 1])
      }
    }
    sensorPb.values = {
      oneofKind: "intValuesContainer",
      intValuesContainer: IntValuesContainer.create({ values: compressedValues })
    }
    return sensorPb
  }
}
