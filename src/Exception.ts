
/**
 * Base class for all custom exceptions in the compression/decompression module.
 * Stores the function name and error message.
 */
class Exception extends Error {
  constructor(functionName: string, message: string) {
    super(`${functionName}: ${message}`)
    this.name = new.target.name
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/**
 * Exception indicating that provided data is structurally incorrect or inconsistent.
 */
export class InvalidDataException extends Exception {
  constructor(functionName: string, variableName: string) {
    super(functionName, `Invalid value in variable '${variableName}'.`)
  }
}

/**
 * Exception indicating that a value is outside the expected or allowed range.
 */
export class WrongValueException extends Exception {
  constructor(functionName: string, description: string) {
    super(functionName, `Unexpected value: ${description}`)
  }
}
