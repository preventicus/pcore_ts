import {MetadataBuilder} from "../src/builder/MetadataBuilder";
import {AccelerometerType, Color, Sensor} from "../src/ProtobufDefinitions";
import {SensorBuilder} from "../src/builder/SensorBuilder";
import {DataBuilder} from "../src/builder/DataBuilder";

const metadata = new MetadataBuilder()
    .withTimezoneOffset(300)
    .withDeviceName("deviceName")
    .withDeviceManufacturer("deviceManufacturer")
    .withDeviceId("A123GBH")
    .withDeviceFirmwareVersion(1,3,2)
    .build()

const sensors: Sensor[] = []

sensors.push(new SensorBuilder()
    .withPhotoplethysmographWavelength(400)
    .withIntValues([1,2,3,4,5,6,7,8,9,-1,-2,-3,-4,-5,-6,-7,-8,-9])
    .build()
)

sensors.push(new SensorBuilder()
    .withPhotoplethysmographColor(Color.RED)
    .withIntValues([9,8,7,6,5,4,3,2,1,9,1,8,2,7,3,6,4,5])
    .build()
)

sensors.push(new SensorBuilder()
    .withAccelerometerType(AccelerometerType.X_COORDINATE)
    .withIntValues([0,0,0,0,10,0,0,0,10,10,0,0,0,0,0,0,-90,0])
    .build()
)

sensors.push(new SensorBuilder()
    .withAccelerometerType(AccelerometerType.EUCLIDEAN_DIFFERENCES_NORM)
    .withDoubleValues([1.2,2.4,3,4.0,5.6,6.7,7.8,8.9,9.0,0,0,0,0,0,0,0,0,0])
    .build()
)

export const data = new DataBuilder()
    .withTimestamps([1,2,3,4,5,6,7,8,9,10,20,30,40,50,60,70,80,90])
    .withMetadata(metadata)
    .withSensors(sensors)
    .build()
