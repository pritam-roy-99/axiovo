/* Progressive installation, without external dependencies or tracking. */
(function () {
  "use strict";
  if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("./sw.js", {scope: "./"}).catch(function (error) {
      console.info("ResearchLens offline support unavailable:", error.message || error);
    });
  });
})();
