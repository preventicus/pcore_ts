import {data} from "../ExampleData"
import {Inspector} from "../../tools/Inspector/Inspector";
import {DataCompressor} from "../../src/compress/DataCompressor";

function main() {

    const dataPb = DataCompressor.compress(data)

    /* eslint-disable no-console */
    console.log("Number of Elements: " + Inspector.getNumberOfElements(dataPb))
    console.log("Number of Sections: " + Inspector.getNumberOfSections(dataPb))
    console.log("First Unix Timestamp: " + Inspector.getFirstUnixTimestamp(dataPb))
    console.log("Last Unix Timestamp: " + Inspector.getLastUnixTimestamp(dataPb))
    /* eslint-disable no-console */
}

main()
