export class Exception extends Error {
    constructor(functionName: string, message: string) {
        super(`${functionName}: ${message}`);
        this.name = new.target.name;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class InvalidDataException extends Exception {
    constructor(functionName: string, variableName: string) {
        super(functionName, `Invalid value in variable '${variableName}'.`);
    }
}

export class WrongValueException extends Exception {
    constructor(functionName: string, description: string) {
        super(functionName, `Unexpected value: ${description}`);
    }
}
