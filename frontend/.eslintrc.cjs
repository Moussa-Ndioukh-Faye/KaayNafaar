module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: ["eslint:recommended", "prettier"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  rules: {
    "no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
    "no-console": "off",
    "no-empty": ["warn", { "allowEmptyCatch": true }],
  },
  overrides: [
    {
      files: ["*.config.js"],
      env: { node: true, commonjs: true },
    },
  ],
  ignorePatterns: ["node_modules/", "dist/"],
};
