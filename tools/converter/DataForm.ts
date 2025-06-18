/**
 * Enum representing the state or format of the data.
 */
export enum DataForm {
    /**
     * Data is in compressed format (protobuf with delta/gap encoding).
     */
    Compressed = "Compressed",

    /**
     * Data is in decompressed format (fully expanded, human-readable form).
     */
    Decompressed = "Decompressed"
}
