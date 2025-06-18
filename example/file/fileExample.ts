import {DataPb} from "../../src/ProtobufDefinitions"
import {DataCompressor} from "../../src/compress/DataCompressor"
import {File} from "../../tools/file/File"
import {DataDecompressor} from "../../src/decompress/DataDecompressor"
import {data as dataWrite} from "../ExampleData"

function main() {

    /*
    * Writing Binary
    */
    const dataWritePb = DataCompressor.compress(dataWrite)

    try {
        File.writePcoreBinary(dataWritePb, __dirname + "/dataWrite.pcore")
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Error when writing the file: ", e);
    }

    /*
     * Reading Binary
     */

    let dataReadPb: DataPb | undefined

    try {
        dataReadPb = File.readPcoreBinary(__dirname + "/dataWrite.pcore")
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Error when reading the file: ", e)
        return
    }

    if (dataReadPb === undefined) {
        // eslint-disable-next-line no-console
        console.error("Error when reading the file:")
        return
    }

    const dataRead = DataDecompressor.decompress(dataReadPb)

    /* eslint-disable no-console */
    console.log(JSON.stringify(dataRead, null, 2))
    /* eslint-enable no-console */

}

main()
