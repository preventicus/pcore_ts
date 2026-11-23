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

import { AccelerometerType, Color, Sensor } from "@/ProtobufDefinitions"

/*
 * Accessors that unwrap the protobuf `oneof` unions of a sensor. They are the only place in the
 * library that distinguishes the cases of `Sensor.values` and the light of a photoplethysmograph,
 * and they return `undefined` if the sensor holds a different case.
 */

/**
 * Returns the integer values of a sensor.
 * @param sensor - The sensor.
 * @returns The integer values, or `undefined` if the sensor does not hold integer values.
 */
export function getIntValues(sensor: Sensor): number[] | undefined {
  return sensor.values.oneofKind === "intValuesContainer" ? sensor.values.intValuesContainer.values : undefined
}

/**
 * Returns the double values of a sensor.
 * @param sensor - The sensor.
 * @returns The double values, or `undefined` if the sensor does not hold double values.
 */
export function getDoubleValues(sensor: Sensor): number[] | undefined {
  return sensor.values.oneofKind === "doubleValuesContainer" ? sensor.values.doubleValuesContainer.values : undefined
}

/**
 * Returns the values of a sensor, regardless of whether they are integer or double values.
 * @param sensor - The sensor.
 * @returns The values, or `undefined` if the sensor holds no values container.
 */
export function getValues(sensor: Sensor): number[] | undefined {
  return getIntValues(sensor) ?? getDoubleValues(sensor)
}

/**
 * Returns the type of an accelerometer.
 * @param sensor - The sensor.
 * @returns The accelerometer type, or `undefined` if the sensor is not an accelerometer.
 */
export function getAccelerometerType(sensor: Sensor): AccelerometerType | undefined {
  return sensor.type.oneofKind === "accelerometer" ? sensor.type.accelerometer.type : undefined
}

/**
 * Returns the channel of an accelerometer.
 * @param sensor - The sensor.
 * @returns The channel, or `undefined` if the sensor is not an accelerometer.
 */
export function getAccelerometerChannel(sensor: Sensor): number | undefined {
  return sensor.type.oneofKind === "accelerometer" ? sensor.type.accelerometer.channel : undefined
}

/**
 * Returns the channel of an electrocardiogram.
 * @param sensor - The sensor.
 * @returns The channel, or `undefined` if the sensor is not an electrocardiogram.
 */
export function getElectrocardiogramChannel(sensor: Sensor): number | undefined {
  return sensor.type.oneofKind === "electrocardiogram" ? sensor.type.electrocardiogram.channel : undefined
}

/**
 * Returns the color of a camera-based photoplethysmograph.
 * @param sensor - The sensor.
 * @returns The color, or `undefined` if the sensor is not a photoplethysmograph with a color.
 */
export function getPhotoplethysmographColor(sensor: Sensor): Color | undefined {
  if (sensor.type.oneofKind !== "photoplethysmograph") {
    return undefined
  }
  const light = sensor.type.photoplethysmograph.light
  return light.oneofKind === "color" ? light.color : undefined
}

/**
 * Returns the wavelength of an LED-based photoplethysmograph.
 * @param sensor - The sensor.
 * @returns The wavelength in nanometers, or `undefined` if the sensor is not a photoplethysmograph with a wavelength.
 */
export function getPhotoplethysmographWavelength(sensor: Sensor): number | undefined {
  if (sensor.type.oneofKind !== "photoplethysmograph") {
    return undefined
  }
  const light = sensor.type.photoplethysmograph.light
  return light.oneofKind === "wavelengthNm" ? light.wavelengthNm : undefined
}

/**
 * Returns the channel of a photoplethysmograph.
 * @param sensor - The sensor.
 * @returns The channel, or `undefined` if the sensor is not a photoplethysmograph.
 */
export function getPhotoplethysmographChannel(sensor: Sensor): number | undefined {
  return sensor.type.oneofKind === "photoplethysmograph" ? sensor.type.photoplethysmograph.channel : undefined
}
