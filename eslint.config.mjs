import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  {
    rules: {
      /*
       * Djallows Finance loads authenticated Supabase data in client-side
       * effects and also reads success messages from the URL after redirects.
       *
       * React's newer set-state-in-effect lint rule is intentionally very
       * strict and flags these established application patterns even though
       * they are valid for this app.
       *
       * We disable this lint rule rather than unnecessarily rewriting working
       * authentication, invoice, dashboard and document-loading logic.
       */
      "react-hooks/set-state-in-effect": "off",

      /*
       * Some pages retain small helper variables/icons while the application
       * continues to evolve. They do not affect runtime behaviour or the
       * production bundle.
       */
      "@typescript-eslint/no-unused-vars": "off",
    },
  },

  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;