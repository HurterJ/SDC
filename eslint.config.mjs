import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __dirname = dirname(fileURLToPath(import.meta.url));

// eslint-config-next 15 ne publie que des configs au format .eslintrc :
// FlatCompat les convertit au format plat d'ESLint 9.
const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  {
    // .claude/ contient les worktrees locaux de Claude Code (chacun avec son propre .next/)
    ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts", ".claude/**"],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "react/no-unescaped-entities": "off",
      "@next/next/no-img-element": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];

export default eslintConfig;
