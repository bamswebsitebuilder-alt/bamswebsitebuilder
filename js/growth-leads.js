/* The shared header and mobile navigation already provide the quote and contact actions.
   Do not inject a fixed bottom call-to-action bar over page content. */
(() => {
  'use strict';
  document.querySelectorAll('.bam-mobile-cta').forEach((bar) => bar.remove());
})();
