(() => {
  const section = document.querySelector('.bam-cinematic');
  if (!section) return;

  const stage = section.querySelector('.bam-cinematic-stage');
  const image = stage.querySelector('img');
  const replay = section.querySelector('.bam-cinematic-replay');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let observer;

  function play() {
    if (reducedMotion.matches || !image.complete || !image.naturalWidth) return;

    observer?.disconnect();
    stage.classList.remove('is-ready', 'is-playing');
    // Restart the typing animation from its first line.
    void image.offsetWidth;
    stage.classList.add('is-playing');
    replay.textContent = replay.dataset.replayLabel;
  }

  stage.addEventListener('animationend', (event) => {
    if (event.animationName === 'bam-cinematic-reveal') {
      stage.classList.remove('is-playing');
    }
  });

  replay.addEventListener('click', play);
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
      stage.classList.remove('is-ready', 'is-playing');
      observer?.disconnect();
    }
  });

  function enablePreview() {
    if (!image.naturalWidth) return;

    replay.hidden = false;
    if (reducedMotion.matches || !('IntersectionObserver' in window)) return;

    stage.classList.add('is-ready');
    observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.6) play();
    }, { threshold: 0.6 });
    observer.observe(stage);
  }

  if (image.complete) enablePreview();
  else image.addEventListener('load', enablePreview, { once: true });
})();
