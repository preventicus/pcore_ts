import {MetadataBuilder} from "../../src/builder/MetadataBuilder"
import {PcoreVersion} from "../../generated/pcore/pcoreVersion"
import {MetadataDecompressor} from "../../src/decompress/MetadataDecompressor"

describe("MetadataDecompressorTest", () => {

  test("test", () => {

    const metaData = new MetadataBuilder()
      .withTimezoneOffset(400)
      .withDeviceId("123")
      .withDeviceName("ABC")
      .withDeviceManufacturer("XYZ")
      .withDeviceFirmwareVersion(3,4,1)
      .build()

    const decompressed = MetadataDecompressor.decompress(metaData)

    expect(decompressed.pcoreVersion?.major).toBe(PcoreVersion.major)
    expect(decompressed.pcoreVersion?.minor).toBe(PcoreVersion.minor)
    expect(decompressed.pcoreVersion?.patch).toBe(PcoreVersion.patch)

    expect(decompressed.device?.name).toBe("ABC")
    expect(decompressed.device?.manufacturer).toBe("XYZ")
    expect(decompressed.device?.id).toBe("123")

    expect(decompressed.device?.firmwareVersion?.major).toBe(3)
    expect(decompressed.device?.firmwareVersion?.minor).toBe(4)
    expect(decompressed.device?.firmwareVersion?.patch).toBe(1)
  })

  test("WrongTimeZoneOffsetPositiveTest", () => {
    const metaData = new MetadataBuilder()
      .withTimezoneOffset(841)
      .build()

    expect(() => MetadataDecompressor.decompress(metaData)).toThrow(
      "TimezoneOffset must be between -720 and 840"
    )
  })

  test("WrongTimeZoneOffsetNegativeTest", () => {
    const metaData = new MetadataBuilder()
      .withTimezoneOffset(-721)
      .build()

    expect(() => MetadataDecompressor.decompress(metaData)).toThrow(
      "TimezoneOffset must be between -720 and 840"
    )
  })

})
