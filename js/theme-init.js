/* Apply the saved appearance before page styles render. */
(() => {
  try {
    const theme = localStorage.getItem('bam-theme') === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch {
    // Existing page controls still work when browser storage is unavailable.
  }
})();

/* Metricool website analytics: load once without blocking page rendering. */
(() => {
  if (window.__bamMetricoolLoaded) return;
  window.__bamMetricoolLoaded = true;
  const tracker = document.createElement('script');
  tracker.src = 'https://tracker.metricool.com/resources/be.js';
  tracker.async = true;
  tracker.onload = () => {
    if (window.beTracker && typeof window.beTracker.t === 'function') {
      window.beTracker.t({ hash: '16d50785686d47a87829e526c5d592ab' });
    }
  };
  document.head.appendChild(tracker);
})();
