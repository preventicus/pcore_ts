/** @type {import("jest").Config} **/
module.exports = {
    testEnvironment: "node",
    transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
            tsconfig: 'tsconfig.test.json'
        }]
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
        "<rootDir>/src/generated/",
        "<rootDir>/src/index",
        "<rootDir>/src/Exception",
        "<rootDir>/src/ProtobufDefinitions",
        "<rootDir>/src/tools/converter/DataForm",
        "<rootDir>/dist/"
    ]
}
