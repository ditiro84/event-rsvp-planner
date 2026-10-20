module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: 2022, sourceType: "module", ecmaFeatures: { jsx: true } },
  plugins: ["@typescript-eslint", "react-hooks", "react-refresh"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  env: { browser: true, es2022: true },
  settings: { react: { version: "detect" } },
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
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "react-refresh/only-export-components": "off",
  },
  ignorePatterns: ["dist", "node_modules", "*.cjs", "*.config.ts", "*.config.js"],
};
