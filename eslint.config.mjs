import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "app/generated/**",
      "docs/**/*.js",
    ],
  },
  {
    rules: {
      // Allow 'any' during active development with mock data
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow empty interfaces for component prop types
      "@typescript-eslint/no-empty-object-type": "warn",
      // Allow unused vars during development
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
];

export default eslintConfig;
