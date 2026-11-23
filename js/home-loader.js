/* Home loader: always clear quickly, regardless of image/network status. */
(() => {
  const loader = document.getElementById('bam-loader');
  if (!loader) return;
  let done = false;
  function dismiss() {
    if (done) return;
    done = true;
    loader.classList.add('is-hidden');
    loader.setAttribute('aria-hidden', 'true');
    window.setTimeout(() => loader.remove(), 320);
  }
  // Hard stop: the overlay must never trap visitors.
  const timer = window.setTimeout(dismiss, 2500);
  function begin() {
    const logo = loader.querySelector('.bam-loader-logo-image');
    const showBriefly = () => window.setTimeout(() => {
      window.clearTimeout(timer);
      dismiss();
    }, 850);
    if (!logo || logo.complete) showBriefly();
    else {
      logo.addEventListener('load', showBriefly, {once:true});
      logo.addEventListener('error', showBriefly, {once:true});
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', begin, {once:true});
  else begin();
})();
