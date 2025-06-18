import {Sensor, Color, AccelerometerType} from "@/ProtobufDefinitions"

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
