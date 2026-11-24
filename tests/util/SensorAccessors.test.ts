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
import {
  getAccelerometerChannel,
  getAccelerometerType,
  getDoubleValues,
  getElectrocardiogramChannel,
  getIntValues,
  getPhotoplethysmographChannel,
  getPhotoplethysmographColor,
  getPhotoplethysmographWavelength,
  getValues,
  SensorBuilder
} from "@/index"

describe("SensorAccessorsTest", () => {
  const ppgColor = new SensorBuilder().withIntValues([1, 2]).withPhotoplethysmographColor(Color.GREEN, 3).build()
  const ppgWavelength = new SensorBuilder().withDoubleValues([1.5, 2.5]).withPhotoplethysmographWavelength(530, 4).build()
  const acc = new SensorBuilder().withIntValues([3]).withAccelerometerType(AccelerometerType.Y_COORDINATE, 2).build()
  const ecg = new SensorBuilder().withDoubleValues([0.1]).withElectrocardiogramChannel(5).build()
  const empty: Sensor = new SensorBuilder().build()

  test("ValuesTest", () => {
    expect(getIntValues(ppgColor)).toEqual([1, 2])
    expect(getIntValues(ppgWavelength)).toBeUndefined()
    expect(getDoubleValues(ppgWavelength)).toEqual([1.5, 2.5])
    expect(getDoubleValues(ppgColor)).toBeUndefined()
    expect(getValues(ppgColor)).toEqual([1, 2])
    expect(getValues(ppgWavelength)).toEqual([1.5, 2.5])
    expect(getValues(empty)).toBeUndefined()
  })

  test("AccelerometerTest", () => {
    expect(getAccelerometerType(acc)).toBe(AccelerometerType.Y_COORDINATE)
    expect(getAccelerometerChannel(acc)).toBe(2)
    expect(getAccelerometerType(ecg)).toBeUndefined()
    expect(getAccelerometerChannel(ecg)).toBeUndefined()
  })

  test("ElectrocardiogramTest", () => {
    expect(getElectrocardiogramChannel(ecg)).toBe(5)
    expect(getElectrocardiogramChannel(acc)).toBeUndefined()
  })

  test("PhotoplethysmographTest", () => {
    expect(getPhotoplethysmographColor(ppgColor)).toBe(Color.GREEN)
    expect(getPhotoplethysmographWavelength(ppgColor)).toBeUndefined()
    expect(getPhotoplethysmographChannel(ppgColor)).toBe(3)
    expect(getPhotoplethysmographWavelength(ppgWavelength)).toBe(530)
    expect(getPhotoplethysmographColor(ppgWavelength)).toBeUndefined()
    expect(getPhotoplethysmographChannel(ppgWavelength)).toBe(4)
    expect(getPhotoplethysmographColor(acc)).toBeUndefined()
    expect(getPhotoplethysmographWavelength(acc)).toBeUndefined()
    expect(getPhotoplethysmographChannel(acc)).toBeUndefined()
  })
})
