import {MetadataBuilder} from "../src/builder/MetadataBuilder"
import {PcoreVersion} from "../generated/pcore/pcoreVersion"
import {MetadataCompressor} from "../src/compress/MetadataCompressor"

describe('MetadataCompressorTest', () => {

    test('test', () => {

        const metaData = new MetadataBuilder()
            .withTimezoneOffset(400)
            .withDeviceId("123")
            .withDeviceName("ABC")
            .withDeviceManufacturer("XYZ")
            .withDeviceFirmwareVersion(3,4,1)
            .build()

        const compressed = MetadataCompressor.compress(metaData)

        expect(compressed.pcoreVersion?.major).toBe(PcoreVersion.major)
        expect(compressed.pcoreVersion?.minor).toBe(PcoreVersion.minor)
        expect(compressed.pcoreVersion?.patch).toBe(PcoreVersion.patch)

        expect(compressed.device?.name).toBe("ABC")
        expect(compressed.device?.manufacturer).toBe("XYZ")
        expect(compressed.device?.id).toBe("123")

        expect(compressed.device?.firmwareVersion?.major).toBe(3)
        expect(compressed.device?.firmwareVersion?.minor).toBe(4)
        expect(compressed.device?.firmwareVersion?.patch).toBe(1)
    })

    test('WrongTimeZoneOffsetPositiveTest', () => {
        const metaData = new MetadataBuilder()
            .withTimezoneOffset(841)
            .build()

        expect(() => MetadataCompressor.compress(metaData)).toThrow(
            "TimezoneOffset must be between -720 and 840"
        )
    })

    test('WrongTimeZoneOffsetNegativeTest', () => {
        const metaData = new MetadataBuilder()
            .withTimezoneOffset(-721)
            .build()

        expect(() => MetadataCompressor.compress(metaData)).toThrow(
            "TimezoneOffset must be between -720 and 840"
        )
    })

})
