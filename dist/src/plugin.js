import { pop } from "./pop";
export default {
    install(app) {
        app.directive("pop", pop);
    },
};
