if (window.ResizeObserver && CSS.supports('width', '100cqw')) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  document.querySelectorAll('[data-bam-marquee]').forEach((marquee) => {
    const list = marquee.querySelector('.bam-marquee__list');
    const button = marquee.querySelector('.bam-marquee__button');
    const icon = button.querySelector('span');
    const copy = list.cloneNode(true);
    copy.classList.add('bam-marquee__copy');
    copy.setAttribute('aria-hidden', 'true');
    list.after(copy);

    let userPaused = false;

    function update() {
      const playing = !reducedMotion.matches && !userPaused;
      marquee.toggleAttribute('data-playing', playing);
      button.hidden = reducedMotion.matches;
      button.setAttribute('aria-label', playing ? button.dataset.pause : button.dataset.play);
      icon.textContent = playing ? 'Ⅱ' : '▶';
    }

    // Keep the speed consistent as the available width or label lengths change.
    new ResizeObserver(([entry]) => {
      marquee.style.setProperty('--bam-marquee-duration', `${entry.borderBoxSize[0].inlineSize / 42}s`);
    }).observe(list, { box: 'border-box' });

    button.addEventListener('click', () => {
      userPaused = !userPaused;
      update();
    });
    reducedMotion.addEventListener('change', update);
    update();
  });
}
