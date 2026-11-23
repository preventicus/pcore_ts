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

import { Sensor, Color, AccelerometerType } from "@/ProtobufDefinitions"

/**
 * A builder class for constructing a Sensor object with different value types and sensor kinds.
 */
export class SensorBuilder {
  private sensor: Sensor = {
    values: { oneofKind: undefined },
    type: { oneofKind: undefined },
  }

  /**
   * Sets the sensor's values to an integer array.
   * @param values - An array of integer values.
   * @returns The current builder instance for chaining.
   */
  withIntValues(values: number[]): this {
    this.sensor.values = {
      oneofKind: "intValuesContainer",
      intValuesContainer: { values },
    }
    return this
  }

  /**
   * Sets the sensor's values to a double array.
   * @param values - An array of double values.
   * @returns The current builder instance for chaining.
   */
  withDoubleValues(values: number[]): this {
    this.sensor.values = {
      oneofKind: "doubleValuesContainer",
      doubleValuesContainer: { values },
    }
    return this
  }

  /**
   * Sets the sensor type to Photoplethysmograph with a specific color.
   * @param color - The light color used by the photoplethysmograph.
   * @returns The current builder instance for chaining.
   */
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

  /**
   * Sets the sensor type to Photoplethysmograph with a specific wavelength.
   * @param wavelengthNm - The wavelength in nanometers used by the photoplethysmograph.
   * @returns The current builder instance for chaining.
   */
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

  /**
   * Sets the sensor type to Accelerometer with a specific coordinate type.
   * @param type - The accelerometer type (e.g. X, Y, Z coordinate or norm).
   * @returns The current builder instance for chaining.
   */
  withAccelerometerType(type: AccelerometerType): this {
    this.sensor.type = {
      oneofKind: "accelerometer",
      accelerometer: {
        type: type
      }
    }
    return this
  }

  /**
   * Sets the sensor type to Electrocardiogram with a specific channel number.
   * @param channel - The ECG channel number.
   * @returns The current builder instance for chaining.
   */
  withElectrocardiogramChannel(channel: number): this {
    this.sensor.type = {
      oneofKind: "electrocardiogram",
      electrocardiogram: {
        channel: channel
      }
    }
    return this
  }

  /**
   * Finalizes and returns the constructed Sensor object.
   * @returns A fully configured Sensor object.
   */
  build(): Sensor {
    return this.sensor
  }
}
