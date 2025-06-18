import {Device, Metadata, Version} from "@/ProtobufDefinitions"
import {PcoreVersion} from "@generated/pcoreVersion"

/**
 * A builder class to create and configure a Metadata object.
 */
export class MetadataBuilder {

  private readonly metadata: Metadata
  private readonly device: Device
  private readonly deviceFirmwareVersion: Version
  private readonly pcoreVersion: Version

  /**
   * Initializes a new instance of the MetadataBuilder.
   * Sets up default device and version structures.
   */
  constructor() {
    this.device = Device.create()
    this.metadata = Metadata.create()
    this.deviceFirmwareVersion = Version.create()
    this.pcoreVersion = Version.create()
    this.pcoreVersion.major = PcoreVersion.major
    this.pcoreVersion.minor = PcoreVersion.minor
    this.pcoreVersion.patch = PcoreVersion.patch
  }

  /**
   * Sets the timezone offset (in minutes).
   * @param offsetMin - Timezone offset in minutes from UTC.
   * @returns The current builder instance for method chaining.
   */
  withTimezoneOffset(offsetMin: number): this {
    this.metadata.timezoneOffsetMin = offsetMin
    return this
  }

  /**
   * Sets the device name.
   * @param name - The name of the device.
   * @returns The current builder instance for method chaining.
   */
  withDeviceName(name: string): this {
    this.device.name = name
    return this
  }

  /**
   * Sets the device ID.
   * @param id - The identifier of the device.
   * @returns The current builder instance for method chaining.
   */
  withDeviceId(id: string): this {
    this.device.id = id
    return this
  }

  /**
   * Sets the device manufacturer.
   * @param manufacturer - The name of the device manufacturer.
   * @returns The current builder instance for method chaining.
   */
  withDeviceManufacturer(manufacturer: string): this {
    this.device.manufacturer = manufacturer
    return this
  }

  /**
   * Sets the device firmware version.
   * @param major - Major version number.
   * @param minor - Minor version number.
   * @param patch - Patch version number.
   * @returns The current builder instance for method chaining.
   */
  withDeviceFirmwareVersion(major: number, minor: number, patch: number): this {
    this.deviceFirmwareVersion.major = major
    this.deviceFirmwareVersion.minor = minor
    this.deviceFirmwareVersion.patch = patch
    return this
  }

  /**
   * Finalizes and returns the constructed Metadata object.
   * @returns A fully constructed Metadata object.
   */
  build(): Metadata {
    this.device.firmwareVersion = this.deviceFirmwareVersion
    this.metadata.device = this.device
    this.metadata.pcoreVersion = this.pcoreVersion
    return this.metadata
  }
}
