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

import {Metadata, Sensor} from "@/ProtobufDefinitions"
import {UnixTimestamps} from "@/models/UnixTimestamp"
import {Data} from "@/models/Data"

/**
 * A builder class for constructing a Data object step-by-step.
 */
export class DataBuilder {

  private timestamps: UnixTimestamps = []
  private metadata?: Metadata
  private sensors: Sensor[] = []

  /**
   * Sets the metadata for the Data object.
   * @param metadata - The metadata to assign
   * @returns The current builder instance for method chaining
   */
  withMetadata(metadata: Metadata): this {
    this.metadata = metadata
    return this
  }

  /**
   * Sets the timestamps for the Data object.
   * @param timestamps - An array of Unix timestamps
   * @returns The current builder instance for method chaining
   */
  withTimestamps(timestamps: UnixTimestamps): this {
    this.timestamps = timestamps
    return this
  }

  /**
   * Replaces the current list of sensors with the provided list.
   * @param sensors - An array of Sensor objects
   * @returns The current builder instance for method chaining
   */
  withSensors(sensors: Sensor[]): this {
    this.sensors = sensors
    return this
  }

  /**
   * Adds a single sensor to the Data object.
   * @param sensor - A Sensor object to add
   * @returns The current builder instance for method chaining
   */
  withSensor(sensor: Sensor): this {
    this.sensors.push(sensor)
    return this
  }

  /**
   * Builds the final Data object using the provided components.
   * @returns A fully constructed Data object
   */
  build(): Data {
    return {
      metadata: this.metadata,
      timestamps: this.timestamps,
      sensors: this.sensors
    }
  }
}
