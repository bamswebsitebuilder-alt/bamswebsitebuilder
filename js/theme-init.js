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
