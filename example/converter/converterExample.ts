import {MetadataBuilder} from "../../src/builder/MetadataBuilder";
import {AccelerometerType, Color, Sensor} from "../../src/ProtobufDefinitions";
import {SensorBuilder} from "../../src/builder/SensorBuilder";
import {DataBuilder} from "../../src/builder/DataBuilder";
import {DataCompressor} from "../../src/compress/DataCompressor";
import {Converter} from "../../tools/converter/Converter";
import {DataForm} from "../../tools/converter/DataForm";
import {data} from "../ExampleData"

function main() {

    const dataPb = DataCompressor.compress(data)

    const decompressedJson = Converter.convertToJson(dataPb, DataForm.Decompressed)
    const compressedJson = Converter.convertToJson(dataPb, DataForm.Compressed)

    /* eslint-disable no-console */
    console.log(decompressedJson)
    console.log("\n")
    console.log(compressedJson)
    /* eslint-enable no-console */

    const dataPbConvertedFromDecompressedJson = Converter.convertFromJson(decompressedJson)
    const dataPbConvertedFromCompressedJson = Converter.convertFromJson(compressedJson)

    /* eslint-disable no-console */
    console.log("\n")
    console.log(JSON.stringify(dataPbConvertedFromDecompressedJson))
    console.log("\n")
    console.log(JSON.stringify(dataPbConvertedFromCompressedJson))
    /* eslint-disable no-console */
}

main()
