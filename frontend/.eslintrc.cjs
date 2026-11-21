module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react/jsx-runtime",
    "plugin:react-hooks/recommended",
    // Accessibilité (WCAG 2.2) : règles vérifiées à chaque lint
    "plugin:jsx-a11y/recommended",
    "prettier",
  ],
  plugins: ["react", "react-hooks", "jsx-a11y"],
  settings: {
    react: { version: "detect" },
  },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  rules: {
    "no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
    "no-console": "off",
    "no-empty": ["warn", { "allowEmptyCatch": true }],
    // Le projet n'utilise pas PropTypes
    "react/prop-types": "off",
    "react/no-unescaped-entities": "off",
    // Signalées en avertissement pour corriger progressivement l'existant
    "jsx-a11y/no-autofocus": "warn",
    "jsx-a11y/click-events-have-key-events": "warn",
    "jsx-a11y/no-static-element-interactions": "warn",
    "jsx-a11y/no-noninteractive-element-interactions": "warn",
    "jsx-a11y/label-has-associated-control": "warn",
    "jsx-a11y/anchor-is-valid": "warn",
    "jsx-a11y/heading-has-content": "warn",
    "jsx-a11y/media-has-caption": "warn",
  },
  overrides: [
    {
      files: ["*.config.js", "*.cjs"],
      env: { node: true, commonjs: true },
    },
  ],
  ignorePatterns: ["node_modules/", "dist/"],
};
