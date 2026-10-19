const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
module.exports = defineConfig([
  expoConfig,
  { ignores: ["dist/*", ".expo/*"] },
  {
    rules: {
      // Apostrophes inside <Text> are fine in React Native.
      "react/no-unescaped-entities": "off",
      // Forms hydrate local editable state from fetched server data once loaded.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);
