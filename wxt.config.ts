import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    permissions: ["activeTab", "storage", "tabs", "windows"],
    commands: {
      _execute_action: {
        suggested_key: {
          default: "Alt+K",
          mac: "Command+K",
        },
      },
    },
  },
  modules: ["@wxt-dev/module-react"],
});
