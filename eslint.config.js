import js from "@eslint/js";

export default [
  {
    ignores: [
      "node_modules/",
      "dist/",
      ".git/",
      "public/",
      "*.config.js",
      "**/*.config.js",
    ],
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      globals: {
        console: "readonly",
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        fetch: "readonly",
        Blob: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        FormData: "readonly",
        File: "readonly",
        FileReader: "readonly",
        Uint8Array: "readonly",
        ArrayBuffer: "readonly",
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["**/*.html"],
    rules: {
      // Skip HTML files - they would need special parser
    },
  },
];
