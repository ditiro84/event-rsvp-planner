module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  env: {
    node: true,
    es2022: true,
  },
  rules: {
    // Text shown to users should use a proper dash, never a typed "--".
    "no-restricted-syntax": [
      "error",
      { selector: "Literal[value=/\\s--\\s/]", message: 'Use a real dash (–) instead of " -- " in user-facing text.' },
      { selector: "JSXText[value=/\\s--\\s/]", message: 'Use a real dash (–) instead of " -- " in user-facing text.' },
      { selector: "TemplateElement[value.raw=/\\s--\\s/]", message: 'Use a real dash (–) instead of " -- " in user-facing text.' },
    ],
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/no-explicit-any": "warn",
    "no-console": "off",
  },
  ignorePatterns: ["node_modules", "playwright-report", "test-results", "*.js"],
};
