import {Device, Metadata, Version} from "@/ProtobufDefinitions"
import {PcoreVersion} from "@generated/pcoreVersion"

export class MetadataBuilder {

  private readonly metadata: Metadata
  private readonly device: Device
  private readonly deviceFirmwareVersion: Version
  private readonly pcoreVersion: Version

  constructor() {
    this.device = Device.create()
    this.metadata = Metadata.create()
    this.deviceFirmwareVersion = Version.create()
    this.pcoreVersion = Version.create()
    this.pcoreVersion.major = PcoreVersion.major
    this.pcoreVersion.minor = PcoreVersion.minor
    this.pcoreVersion.patch = PcoreVersion.patch
  }

  withTimezoneOffset(offsetMin: number): this {
    this.metadata.timezoneOffsetMin = offsetMin
    return this
  }

  withDeviceName(name: string): this {
    this.device.name = name
    return this
  }

  withDeviceId(id: string): this {
    this.device.id = id
    return this
  }

  withDeviceManufacturer(manufacturer: string): this {
    this.device.manufacturer = manufacturer
    return this
  }

  withDeviceFirmwareVersion(major: number, minor: number, patch: number): this {
    this.deviceFirmwareVersion.major = major
    this.deviceFirmwareVersion.minor = minor
    this.deviceFirmwareVersion.patch = patch
    return this
  }

  build(): Metadata {
    this.device.firmwareVersion = this.deviceFirmwareVersion
    this.metadata.device = this.device
    this.metadata.pcoreVersion = this.pcoreVersion
    return this.metadata
  }
}
