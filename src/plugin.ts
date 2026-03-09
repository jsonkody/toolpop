// plugin.ts
import type { App, Plugin } from "vue";
import { createPop, type PopOptions } from "./pop";

const plugin: Plugin = {
  install(app: App, global_options?: Partial<PopOptions>) {
    app.directive("pop", createPop(global_options));
  },
};

export default plugin;
