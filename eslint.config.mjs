import { defineConfig, globalIgnores } from "eslint/config"
import eslint from "@eslint/js"
import stylistic from "@stylistic/eslint-plugin"
import tseslint from "typescript-eslint"

export default defineConfig(
  // the generated protobuf code is never edited by hand
  globalIgnores(["src/generated/", "dist/", "coverage/"]),
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    plugins: {
      "@stylistic": stylistic
    },
    rules: {
      // code quality
      "no-console": "error",
      "eqeqeq": "error",
      "no-empty": ["error", { "allowEmptyCatch": false }],
      "no-restricted-imports": ["error", {
        "patterns": [{
          "group": ["./*", "../*"],
          "message": "Use the path aliases @/, @tools/ and @generated/ instead of relative imports."
        }]
      }],
      "@typescript-eslint/no-extraneous-class": "off",
      "no-useless-constructor": "off",
      "@typescript-eslint/no-useless-constructor": "error",

      // formatting: the rules of @stylistic also cover TypeScript-only syntax such as type aliases, interfaces and enums
      "@stylistic/indent": ["error", 2, { "SwitchCase": 1 }],
      "@stylistic/linebreak-style": ["error", "unix"],
      "@stylistic/quotes": ["error", "double"],
      "@stylistic/semi": ["error", "never"],
      "@stylistic/member-delimiter-style": ["error", {
        "multiline": { "delimiter": "none" },
        "singleline": { "delimiter": "comma", "requireLast": false }
      }],
      "@stylistic/type-annotation-spacing": "error",
      "@stylistic/comma-dangle": ["error", "never"],
      // "catch (error)" keeps its space, which the rule also covers since @stylistic 5
      "@stylistic/space-before-function-paren": ["error", { "anonymous": "never", "named": "never", "asyncArrow": "never", "catch": "always" }],
      "@stylistic/object-curly-spacing": ["error", "always"],
      "@stylistic/comma-spacing": ["error", { "before": false, "after": true }],
      "@stylistic/arrow-parens": ["error", "as-needed"],
      "@stylistic/space-in-parens": ["error", "never"],
      "@stylistic/space-infix-ops": "error",
      "@stylistic/space-before-blocks": ["error", "always"],
      "@stylistic/array-bracket-spacing": ["error", "never"],
      "@stylistic/computed-property-spacing": ["error", "never"],
      "@stylistic/no-multi-spaces": "error",
      "@stylistic/no-trailing-spaces": "error",
      "@stylistic/no-whitespace-before-property": "error",
      "@stylistic/no-multiple-empty-lines": ["error", { "max": 1, "maxEOF": 1, "maxBOF": 0 }],
      "@stylistic/padded-blocks": ["error", "never"]
    }
  }
)
