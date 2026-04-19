import { registerRootComponent } from "expo";

import App from "@/App";

registerRootComponent(App);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js");
  });
}
