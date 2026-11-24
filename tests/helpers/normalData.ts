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

import { AccelerometerType, Color } from "@/ProtobufDefinitions"
import { Data, DataBuilder, MetadataBuilder, SensorBuilder } from "@/index"

/**
 * Builds the decompressed example data shared by the tests of `Converter` and `PcoreFile`:
 * complete metadata, three timestamps and one sensor of every kind (an electrocardiogram, a
 * photoplethysmograph with a color, one with a wavelength and double values, and an accelerometer).
 * Every call returns a new object.
 */
export function buildNormalData(): Data {
  const metadata = new MetadataBuilder()
    .withTimezoneOffset(400)
    .withDeviceFirmwareVersion(3, 2, 1)
    .withDeviceManufacturer("ABC")
    .withDeviceName("xyz")
    .withDeviceId("123")
    .build()

  const sensorECG = new SensorBuilder()
    .withIntValues([1, 2, 3])
    .withElectrocardiogramChannel(1)
    .build()

  const sensorPPGBlue = new SensorBuilder()
    .withIntValues([1, 2, 3])
    .withPhotoplethysmographColor(Color.BLUE, 1)
    .build()

  const sensorPPG700 = new SensorBuilder()
    .withDoubleValues([1.0, 2.0, 3.0])
    .withPhotoplethysmographWavelength(700)
    .build()

  const sensorACC = new SensorBuilder()
    .withIntValues([1, 2, 3])
    .withAccelerometerType(AccelerometerType.Z_COORDINATE, 2)
    .build()

  return new DataBuilder()
    .withMetadata(metadata)
    .withSensor(sensorECG)
    .withSensor(sensorPPGBlue)
    .withSensor(sensorPPG700)
    .withSensor(sensorACC)
    .withTimestamps([10, 20, 30])
    .build()
}
