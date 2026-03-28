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
