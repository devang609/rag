import { FlatCompat } from "@eslint/eslintrc";
import nextVitals from "eslint-config-next/core-web-vitals.js";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

const config = [
  {
    ignores: [".next/**", "node_modules/**", "coverage/**", "dist/**", "playwright-report/**", "test-results/**"],
  },
  ...compat.config(nextVitals),
];

export default config;
