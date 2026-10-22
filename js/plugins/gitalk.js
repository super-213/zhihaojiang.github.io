let libraryPromise = null;
const renderedContainers = new WeakSet();

const loadLibrary = (src) => {
  if (typeof window.Gitalk === "function") return Promise.resolve(window.Gitalk);
  if (libraryPromise) return libraryPromise;

  libraryPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    const timer = window.setTimeout(() => fail(), 15000);
    const fail = () => {
      window.clearTimeout(timer);
      script.remove();
      libraryPromise = null;
      reject(new Error("Gitalk library could not be loaded"));
    };
    script.onerror = fail;
    script.onload = () => {
      window.clearTimeout(timer);
      if (typeof window.Gitalk === "function") resolve(window.Gitalk);
      else fail();
    };
    document.head.appendChild(script);
  });
  return libraryPromise;
};

export default function initGitalk({ signal } = {}) {
  const container = document.getElementById("gitalk-container");
  const settings = document.getElementById("gitalk-settings");
  if (!container || !settings || renderedContainers.has(container)) return;

  let observer = null;
  let pending = false;
  const render = async () => {
    if (pending || signal?.aborted || !container.isConnected
        || renderedContainers.has(container)) return;
    pending = true;
    observer?.disconnect();
    const retry = container.querySelector("[data-gitalk-retry]");
    if (retry) retry.hidden = true;
    try {
      const options = JSON.parse(settings.textContent);
      const Gitalk = await loadLibrary(container.dataset.librarySrc);
      if (signal?.aborted || !container.isConnected) return;
      new Gitalk(options).render(container);
      renderedContainers.add(container);
    } catch {
      if (signal?.aborted || !container.isConnected) return;
      const status = container.querySelector('[role="status"]');
      if (status) status.textContent = container.dataset.errorMessage;
      if (retry) retry.hidden = false;
    } finally {
      pending = false;
    }
  };

  container.querySelector("[data-gitalk-retry]")?.addEventListener("click", render,
    signal ? { signal } : undefined);
  if ("IntersectionObserver" in window) {
    observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) render();
    }, { rootMargin: "400px 0px" });
    observer.observe(container);
  } else {
    render();
  }
  signal?.addEventListener("abort", () => observer?.disconnect(), { once: true });
}
