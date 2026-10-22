let initialized = false;

export default function initDeferredWidgets() {
  const widget = theme.global?.live2d;
  if (initialized || !widget?.enable || !widget.src) return;
  initialized = true;

  const load = () => {
    // Do not start animations or downloads in a background tab.
    if (document.hidden) {
      document.addEventListener("visibilitychange", load, { once: true });
      return;
    }
    if (document.getElementById("redefine-live2d-loader")) return;
    const script = document.createElement("script");
    script.id = "redefine-live2d-loader";
    script.src = widget.src;
    script.async = true;
    document.body.appendChild(script);
  };
  const schedule = () => {
    window.setTimeout(() => {
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(load, { timeout: 2000 });
      } else {
        load();
      }
    }, Math.max(0, Number(widget.delay) || 3000));
  };

  if (document.readyState === "complete") schedule();
  else window.addEventListener("load", schedule, { once: true });
}
