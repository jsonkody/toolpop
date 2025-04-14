import { pop } from "./pop";
import type { App } from "vue";

export default {
  install(app: App) {
    app.directive("pop", pop);
  },
};
