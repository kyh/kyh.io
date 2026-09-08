/// <reference types="./types.d.ts" />

import * as fs from "node:fs";
import path from "node:path";
import { includeIgnoreFile } from "@eslint/compat";
import eslint from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import turboPlugin from "eslint-plugin-turbo";
import tseslint from "typescript-eslint";

/**
 * Walk up from `startDir` to the nearest `.gitignore`.
 * @param {string} startDir The directory to start searching from.
 * @returns {Promise<string>} The path to the `.gitignore` file, or "" if none.
 */
const findGitignorePath = async (startDir) => {
  const gitignorePath = path.join(startDir, ".gitignore");

  try {
    await fs.promises.access(gitignorePath, fs.constants.F_OK);
    return gitignorePath;
  } catch {
    const parentDir = path.dirname(startDir);
    if (parentDir === startDir) {
      return "";
    }
    return findGitignorePath(parentDir);
  }
};

export default tseslint.config(
  // Ignore files not tracked by VCS and any config files
  includeIgnoreFile(await findGitignorePath(import.meta.dirname)),
  { ignores: ["**/*.config.*"] },
  {
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    files: ["**/*.js", "**/*.ts", "**/*.tsx"],
    plugins: {
      import: importPlugin,
      turbo: turboPlugin,
    },
    rules: {
      ...turboPlugin.configs.recommended.rules,
      "@typescript-eslint/consistent-type-definitions": ["warn", "type"],
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { fixStyle: "separate-type-imports", prefer: "type-imports" },
      ],
      "@typescript-eslint/no-misused-promises": [2, { checksVoidReturn: { attributes: false } }],
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-unnecessary-condition": [
        "error",
        {
          allowConstantLoopConditions: true,
        },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "import/consistent-type-specifier-style": ["error", "prefer-top-level"],
    },
  },
  {
    languageOptions: { parserOptions: { projectService: true } },
    linterOptions: { reportUnusedDisableDirectives: true },
  },
);
