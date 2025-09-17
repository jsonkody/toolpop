import { createPop, type PopOptions } from "./pop";
import type { App } from "vue";

export default {
  install(app: App, options?: Partial<PopOptions>) {
    const configuredPopDirective = createPop(options);
    app.directive("pop", configuredPopDirective);
  },
};