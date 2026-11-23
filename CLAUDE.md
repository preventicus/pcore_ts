# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`@preventicus/pcore` — TypeScript library for reading, writing, compressing and decompressing biomedical time-series data (PPG, ECG, accelerometer) in the Pcore protobuf format. Published as a library (`dist/index.js` + `dist/index.d.ts`); there is no application entry point.

This repo is **one implementation of a language-agnostic format spec**. The spec lives in the companion repo `preventicus/pcore` (expected as a sibling checkout at `../pcore`) — see "The spec repo" below. When behaviour is in question, that repo is the normative source, not this code.

## Commands

```bash
npm run generate:proto        # regenerate src/generated/pcore/ from the upstream .proto (see below)
npm run build                 # generate:proto → lint → test → tsc → tsc-alias
npm test                      # jest
npm run test:coverage         # jest --coverage
npm run lint                  # eslint over src/ and tests/
npm run lint:fix

npx jest tests/compress/TimestampsCompressor.test.ts # single test file
npx jest -t "PcoreEmptyDataTest"                     # single test by name

npm run example:file          # ts-node runs of src/example/*
npm run example:converter
npm run example:inspector
```

`npm run build` runs `generate:proto` first, which clones `github.com/preventicus/pcore` over the network and **deletes and recreates `src/generated/pcore/`**. For a normal edit-test cycle use `npm test` / `npx tsc` directly rather than `npm run build`. `npm run clean` empties `dist/`; `build` and `prepare` run it before `tsc`, so no stale files from removed sources survive. The `prepare` script (`clean`, `tsc`, `tsc-alias`, no proto generation) runs on every `npm install`, so a type error breaks installs too. The `files` field in `package.json` publishes only `dist/` without the compiled examples (`dist/example`); check the package contents with `npm pack --dry-run`.

## The spec repo (`../pcore`)

`github.com/preventicus/pcore` is the format definition, shared by all language implementations. It contains no code — only:

- `protobuf_definitions/pcore.proto` — the single normative schema (proto3, package `com.preventicus.pcore`). Note the `reserved 3 to 5` (further value containers) and `reserved 9 to 15` (further sensor types) ranges: new sensor types get those field numbers, never a reused one.
- `README.md` — the prose spec (scope, sensor identification, legacy files without `channel`), **pseudocode for every algorithm** (`FindSectionIndices`, `CompressTimestamps`, `CompressIntegerValues`, `DecompressTimestamps`, `DecompressIntegerValues`, …), the numbered compress/decompress validation rules with the exception type per rule, a worked example and the description of the JSON test format. `TimestampsCompressor` (`findSectionIdxs`, `compress`) and `TimestampsDecompressor` are close transliterations of that pseudocode — when changing an algorithm, change the pseudocode upstream first and keep the structure recognisable.
- `unittest/**/*.json` — the **cross-language test specification**: `compression/compressionTimestamps.json`, `compressionValues.json`, `decompression/decompressionTimestamps.json`, `decompressionValues.json`, `validation/dataValidation.json`. Each case has `name`, `operation`, `purpose`, `input` and `expected` or `expected_error` (`InvalidDataException`, `WrongValueException` or `null`); ~126 cases total.

The suites in `tests/` implement these cases and **reuse the spec's test names verbatim** (`EmptyTimestampsTest`, `OneSectionTest`, `MaxValueTest`, `OverlappingSectionsTest`, …) and keep the spec's order, so a spec case can be located by grepping for its name. The `dataValidation.json` cases live in `tests/compress/DataCompressor.test.ts` (`compress_data`) and `tests/decompress/DataDecompressor.test.ts` (`decompress_data`). Tests without a spec counterpart (JavaScript-specific checks, legacy behaviour) sit next to them with a comment saying why. **Adding a behaviour means adding the case upstream in `unittest/` first, then implementing it here** — otherwise the other language implementations silently diverge.

`.pcore-version` (`v2.1.0`) pins which tag of that repo this library targets; the local `../pcore` checkout is on `main`, which is currently exactly that tag. If `main` moves on, read the pinned spec with `git -C ../pcore show v2.1.0:README.md` (or `v2.1.0:unittest/...`). It is a *sibling checkout, not a submodule* — `generate:proto` ignores it and clones a fresh copy from GitHub into a temporary `./tmp-pcore`, so editing `../pcore` locally has no effect on generation until the change is pushed and tagged.

Spec quirks worth knowing: integer compression stores deltas "starting from zero", which is why decompression is a plain cumulative sum with no special-casing of the first element; the timezone offset range `[-720, 840]` is inclusive (the spec tests use -721 and 841 as invalid values); and the sensor type and sensor-identification uniqueness are checked only when compressing, never when decompressing, so that files written before the `channel` fields existed stay readable.

**Deliberate deviation — 64-bit integers are `number`:** protobuf code is generated with `long_type_number`, so `first_unix_timestamp_ms` and the `sint64` integer values are JS `number`s. Instead of the spec's int64 limits the validation requires `Number.isSafeInteger` (±(2^53−1)) for timestamps, integer values and their differences and throws `WrongValueException` otherwise; `File.readPcoreBinary` maps protobuf-ts' `"cannot convert to safe number"` error to `WrongValueException`. The spec cases `MaxIntValueDeltaTest`, `IntValueDeltaOverflowTest` and `IntValueOverflowTest` are therefore implemented with the safe-integer limits instead of the int64 limits. Switching to `bigint` was considered and rejected (breaking API, JSON handling).

## Generated protobuf code

`src/generated/pcore/pcore.ts` and `pcoreVersion.ts` are generated by `scripts/INSTALL_PROTOBUF.sh` (protobuf-ts `protoc` plugin) from the tag named in `.pcore-version` (currently `v2.1.0`). They are committed but must never be hand-edited — bump `.pcore-version` and re-run `generate:proto` instead. (Inside Claude Code's sandbox the clone into `./tmp-pcore` fails with "Operation not permitted" on `.git/config`; it has to run outside the sandbox.) `PcoreVersion` is stamped into every compressed payload's metadata by `MetadataCompressor`, so a format bump propagates from that one file.

`src/ProtobufDefinitions.ts` is the single seam between generated and hand-written code: it re-exports the deeply nested generated types under short names (`Data` → `DataPb`, `Data_Sensor` → `Sensor`, `Data_Metadata_Device` → `Device`, …). **Always import protobuf types from `@/ProtobufDefinitions`, never from `@generated/pcore` directly** — that keeps regeneration from rippling through the codebase. Note `DataPb` (protobuf, compressed) and `Data` (`src/models/Data.ts`, decompressed) are different types with confusingly similar names.

## Architecture

The library is a symmetric pair of pipelines around one validation gate:

```
Data (models/Data.ts)  --DataCompressor.compress-->    DataPb (protobuf)
Data                   <--DataDecompressor.decompress-- DataPb
DataPb <--> .pcore binary / JSON string                 (File, Converter)
```

- **`src/models/`** — the decompressed domain shape: `Data { metadata?, timestamps: UnixTimestamps, sensors: Sensor[] }`. `UnixTimestamp` is ms-since-epoch; `SectionIdx(s)` indexes timestamp sections.
- **`src/builder/`** — fluent builders (`DataBuilder`, `MetadataBuilder`, `SensorBuilder`) for constructing valid `Data`/`Metadata`/`Sensor` objects; the intended public construction path. `build()` always returns a deep copy (`structuredClone`), so a builder can be reused without changing objects built earlier; `MetadataBuilder` only sets `device` if a device property was given.
- **`src/compress/`** — `DataCompressor` orchestrates `MetadataCompressor` + `TimestampsCompressor` + `SensorCompressor`.
- **`src/decompress/`** — the exact inverses. Round-trip fidelity (`decompress(compress(x)) === x`) is the core invariant every test suite exercises; any change on one side needs the mirror change on the other.
- **`src/tools/inspector/Inspector.ts`** — two roles: (a) read compressed data *without* decompressing (`getFirstUnixTimestamp`, `getLastUnixTimestamp`, `getNumberOfSections`, `getNumberOfElements`, `getSensorTypes`), and (b) the validation gate — `validateDecompressed(Data)` and `validateCompressed(DataPb)`.
- **`src/tools/converter/Converter.ts`** — `DataPb` ⟷ JSON string, in either `DataForm.Compressed` (raw protobuf JSON) or `DataForm.Decompressed` (human-readable, sensor unions flattened to `{ valuesType, values, <sensorType>: {...} }`). `convertFromJson` sniffs the form by testing for a `compressedTimestampsContainer` key and checks the JSON structure first with `JsonStructure` (`src/tools/converter/JsonStructure.ts` — shape of this library's JSON forms, deliberately not in `Inspector`, which only checks spec rules on typed data), so malformed input throws `InvalidDataException` instead of `SyntaxError`/`TypeError`; unknown enum names become `UNSPECIFIED` and are then rejected by the sensor value rules.
- **`src/tools/file/File.ts`** — thin `node:fs` wrappers. `writePcoreBinary` validates with `Inspector.validateCompressed`, so no invalid (e.g. empty) `.pcore` file is written; `readPcoreBinary` does not validate (decompressing does), and the JSON functions only read/write strings.
- **`src/util/utils.ts`** — accessors that unwrap protobuf `oneof` unions (`getIntValues`, `getAccelerometerType`, `getPhotoplethysmographColor`, …), returning `undefined` on a mismatched variant.

### Validation is centralized, and callers rely on it

`DataCompressor.compress` calls `Inspector.validateDecompressed` and `DataDecompressor.decompress` calls `Inspector.validateCompressed` as their first statement. `Converter` calls `Inspector.validateCompressed` itself only on the `DataForm.Compressed` / compressed-JSON paths, and deliberately skips it where it delegates to `compress`/`decompress` (see its `// validation is done in … method` comments). So: add new structural rules to `Inspector`, not to the compressors, and do not remove those leading validate calls.

Validation failures throw `InvalidDataException` (structurally inconsistent data) or `WrongValueException` (a single value out of range), both from `src/Exception.ts`, exactly as the spec assigns them per rule. `validateDecompressed` and `validateCompressed` implement the numbered "Validation → Compression / Decompression" rule lists of `../pcore/README.md` **in the listed order** (each rule is marked with a `// Rule n` comment), plus the JavaScript safe-integer checks described above. Empty data is invalid in both directions. Rules 11 and 12 (PPG light set with color RED/GREEN/BLUE or wavelength 350–1000 nm, accelerometer type not `UNSPECIFIED`, ECG channel ≤ 22) apply in both directions; sensor type and identification uniqueness only when compressing. These sensor rules originated in this implementation and were added to the spec afterwards — the spec is the place to change them.

### Compression scheme

Timestamps are split into *sections* of constant sampling interval (`TimestampsCompressor.findSectionIdxs` cuts wherever the step changes). Each section stores its `sectionsSizes[i]`, its intra-section step `innerSectionsDurationsMs[i]`, and its offset from the previous section `outerSectionsDurationsMs[i]` (index 0 is always 0). Integer sensor values are delta-encoded against the previous sample (first value kept verbatim); double values are copied unchanged. A section with a single timestamp gets inner duration 0; the compressor only produces that for the last section. The full rationale, pseudocode and a worked example are in `../pcore/README.md` under "Compress"/"Decompress".

## Conventions

- **ESLint (`.eslintrc.json`) is strict and unusual**: double quotes, **no semicolons**, 2-space indent, `space-before-function-paren: never`, `arrow-parens: as-needed`, `no-console: error`, `eqeqeq`. Match the surrounding style exactly; `npm run lint` gates the build.
- **Path aliases**: `@/*` → `src/*`, `@generated/*` → `src/generated/pcore/*`, `@tools/*` → `src/tools/*`. These are declared in three places that must stay in sync — `tsconfig.json` (note its `baseUrl` is `src`, so the mappings are written relative to `src`, and `@generated` is mapped only as the two exact names `@generated/pcore` and `@generated/pcoreVersion`, not as a wildcard), `tsconfig.test.json` (`baseUrl` `.`), and `jest.config.js` `moduleNameMapper`. Runtime resolution comes from `tsc-alias` at build time and `tsconfig-paths/register` for `ts-node` examples. Tests use only aliases (`@/index` for the public API); some `src/` files still use relative imports — prefer aliases in new code.
- Every source file carries the BSD-3-Clause header comment (~32 lines) — copy it into new files.
- Public classes are static-only utility classes (`@typescript-eslint/no-extraneous-class` is off deliberately); mutation is avoided via `structuredClone` when copying protobuf sub-objects.
- Genuinely unreachable branches are marked `/* istanbul ignore next */` rather than deleted, since validation already excludes them.
- Anything exported for consumers must be re-exported from `src/index.ts`.

## Tests

`tests/` mirrors `src/` (`tests/compress/`, `tests/decompress/`, `tests/tools/`) and runs under `tsconfig.test.json` (which includes `tests/**` — the main `tsconfig.json` excludes them). Coverage ignores `src/generated/`, `index`, `Exception`, `ProtobufDefinitions`, `DataForm`. Test names are inherited from the spec repo's `unittest/` files — see "The spec repo" above before adding or renaming cases.

File tests write `.pcore`/`.json` fixtures next to the test file — both patterns are gitignored. Import `PcoreVersion` in tests from `@generated/pcoreVersion`, never from `dist/` (a stale local `dist/` silently yields an old version).
