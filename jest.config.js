const { createDefaultPreset } = require("ts-jest")

const tsJestTransformCfg = createDefaultPreset().transform

/** @type {import("jest").Config} **/
module.exports = {
    preset: 'ts-jest',
    testEnvironment: "node",
    transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
            tsconfig: 'tsconfig.test.json'
        }],
        ...tsJestTransformCfg,
    },
    moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
        "^@generated/(.*)$": "<rootDir>/src/generated/pcore/$1",
        "^@tools/(.*)$": "<rootDir>/src/tools/$1"
    },
    testMatch: [
        "<rootDir>/tests/**/*.test.ts",
        "<rootDir>/tests/**/*.spec.ts"
    ],
    coveragePathIgnorePatterns: [
        "<rootDir>/src/generated/"
    ]
}
