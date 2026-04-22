(function () {
  if (window.__LinguaBotWidgetLoaderActive) return;
  window.__LinguaBotWidgetLoaderActive = true;

  var currentScript = document.currentScript;
  var runtimeUrl = new URL(
    "widget-runtime.js",
    currentScript && currentScript.src ? currentScript.src : "https://linguabot.lovable.app/widget.js"
  );

  runtimeUrl.searchParams.set("t", String(Date.now()));

  var existing = document.querySelector('script[data-linguabot-runtime="true"]');
  if (existing) return;

  var script = document.createElement("script");
  script.src = runtimeUrl.toString();
  script.async = true;
  script.dataset.linguabotRuntime = "true";
  document.head.appendChild(script);
})();
