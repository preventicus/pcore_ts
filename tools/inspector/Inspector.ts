import {DataPb} from "@/ProtobufDefinitions"
import {UnixTimestamp} from "@/models/UnixTimestamp"

export class Inspector {

  static getFirstUnixTimestamp( dataPb: DataPb): UnixTimestamp {
    if (dataPb.compressedTimestampsContainer === undefined) {
      return 0
    }
    return dataPb.compressedTimestampsContainer.firstUnixTimestampMs
  }

  static getLastUnixTimestamp(dataPb: DataPb): UnixTimestamp {
    if (dataPb.compressedTimestampsContainer === undefined) {
      return 0
    }

    const compressedTimestampsContainer = dataPb.compressedTimestampsContainer
    let lastUnixTimestamp = compressedTimestampsContainer.firstUnixTimestampMs
    for (let i = 1; i < compressedTimestampsContainer.outerSectionsDurationsMs.length; i++) {
      lastUnixTimestamp += compressedTimestampsContainer.outerSectionsDurationsMs[i]
    }

    const size = compressedTimestampsContainer.innerSectionsDurationsMs.length
    lastUnixTimestamp += compressedTimestampsContainer.innerSectionsDurationsMs[size-1] * (compressedTimestampsContainer.sectionsSizes[size-1] - 1)
    return lastUnixTimestamp
  }

  static getNumberOfSections( dataPb: DataPb ): number {
    if (dataPb.compressedTimestampsContainer === undefined) {
      return 0
    }
    return dataPb.compressedTimestampsContainer.sectionsSizes.length
  }

  static getNumberOfElements(dataPb: DataPb) : number {
    if (dataPb.sensors.length === 0) {
      return 0
    }
    switch (dataPb.sensors[0].values.oneofKind) {
        case "intValuesContainer": {
          return dataPb.sensors[0].values.intValuesContainer.values.length
        }
        case "doubleValuesContainer": {
          return dataPb.sensors[0].values.doubleValuesContainer.values.length
        }
        default: {
          return 0
        }
    }
  }
}
