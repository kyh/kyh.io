/// <reference types="./types.d.ts" />

import * as fs from "node:fs";
import * as path from "node:path";
import { includeIgnoreFile } from "@eslint/compat";
import eslint from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import turboPlugin from "eslint-plugin-turbo";
import tseslint from "typescript-eslint";

/**
 * Recursively search for a `.gitignore` file starting from the given directory.
 * @param {string} startDir The directory to start searching from.
 * @returns {Promise<string>} The path to the `.gitignore` file or `null` if not found.
 */
async function findGitignorePath(startDir) {
  const gitignorePath = path.join(startDir, ".gitignore");

  try {
    await fs.promises.access(gitignorePath, fs.constants.F_OK);
    return gitignorePath;
  } catch {
    // .gitignore not found in current directory
    const parentDir = path.dirname(startDir);

    // Check if we've reached the root directory
    if (parentDir === startDir) {
      return ""; // .gitignore not found
    }

    // Recursively search in the parent directory
    return findGitignorePath(parentDir);
  }
}

export default tseslint.config(
  // Ignore files not tracked by VCS and any config files
  includeIgnoreFile(await findGitignorePath(import.meta.dirname)),
  { ignores: ["**/*.config.*"] },
  {
    files: ["**/*.js", "**/*.ts", "**/*.tsx"],
    plugins: {
      import: importPlugin,
      turbo: turboPlugin,
    },
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    rules: {
      ...turboPlugin.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],
      "@typescript-eslint/no-misused-promises": [
        2,
        { checksVoidReturn: { attributes: false } },
      ],
      "@typescript-eslint/no-unnecessary-condition": [
        "error",
        {
          allowConstantLoopConditions: true,
        },
      ],
      "@typescript-eslint/no-non-null-assertion": "error",
      "import/consistent-type-specifier-style": ["error", "prefer-top-level"],
      // "prefer-arrow-functions/prefer-arrow-functions": [
      //   "warn",
      //   {
      //     classPropertiesAllowed: false,
      //     disallowPrototype: false,
      //     returnStyle: "unchanged",
      //     singleReturnOnly: false,
      //   },
      // ],
      "@typescript-eslint/consistent-type-definitions": ["warn", "type"],
    },
  },
  {
    linterOptions: { reportUnusedDisableDirectives: true },
    languageOptions: { parserOptions: { projectService: true } },
  },
);
