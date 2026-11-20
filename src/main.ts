import { createApp } from "vue";
import { createStoragePlugin } from "@vuetify/v0";
import "@fontsource-variable/roboto";
import App from "./App.vue";
import "./style.css";

createApp(App)
  .use(createStoragePlugin({ prefix: "t-platform-rates:" }))
  .mount("#app");
