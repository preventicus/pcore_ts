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

import { Sensor } from "@/ProtobufDefinitions"

/**
 * Provides functionality to decompress sensor data.
 * Reconstructs original values from delta-encoded integer sequences or clones raw floating-point data.
 */
export class SensorDecompressor {
  /**
   * Decompresses a `Sensor` object from its compressed protobuf form.
   *
   * - If the sensor uses integer values, it performs delta decoding.
   * - If the sensor uses double values, it returns a deep clone.
   *
   * @param sensorPb - The compressed protobuf sensor object.
   * @returns A fully decompressed `Sensor` object.
   */
  static decompress(sensorPb: Sensor): Sensor {
    const sensor = Sensor.create()
    sensor.type = structuredClone(sensorPb.type)

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
