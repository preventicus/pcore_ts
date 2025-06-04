import {AccelerometerType, Color, Sensor} from "../../src/ProtobufDefinitions";

export function getIntValues(sensor: Sensor): number[] | undefined {
    if (sensor.values.oneofKind === "intValuesContainer") {
        return sensor.values.intValuesContainer.values;
    }
    return undefined;
}

export function getDoubleValues(sensor: Sensor): number[] | undefined {
    if (sensor.values.oneofKind === "doubleValuesContainer") {
        return sensor.values.doubleValuesContainer.values;
    }
    return undefined;
}

export function getAccelerometerType(sensor: Sensor): AccelerometerType | undefined {
    if (sensor.type.oneofKind === "accelerometer") {
        return sensor.type.accelerometer.type;
    }
    return undefined;
}

export function getElectrocardiogramChannel(sensor: Sensor): number | undefined {
    if (sensor.type.oneofKind === "electrocardiogram") {
        return sensor.type.electrocardiogram.channel;
    }
    return undefined;
}

export function getPhotoplethysmographColor(sensor: Sensor): Color | undefined {
    if (sensor.type.oneofKind === "photoplethysmograph") {
        if (sensor.type.photoplethysmograph.light.oneofKind === "color") {
            return sensor.type.photoplethysmograph.light.color;
        }
        return undefined;
    }
    return undefined;
}

export function getPhotoplethysmographWavelength(sensor: Sensor): Color | undefined {
    if (sensor.type.oneofKind === "photoplethysmograph") {
        if (sensor.type.photoplethysmograph.light.oneofKind === "wavelengthNm") {
            return sensor.type.photoplethysmograph.light.wavelengthNm;
        }
        return undefined;
    }
    return undefined;
}
