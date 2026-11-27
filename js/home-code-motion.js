(() => {
  const section = document.querySelector('.bam-code-motion');
  if (!section) return;

  const tabs = section.querySelector('.bam-motion-tabs');
  const buttons = [...tabs.querySelectorAll('[data-motion-tab]')];
  const panels = buttons.map(button => document.getElementById(button.dataset.motionTab));
  let selected = 0;

  function play(panel) {
    panel.classList.remove('is-playing');
    void panel.offsetWidth;
    panel.classList.add('is-playing');
  }

  function select(index, animate = true) {
    selected = index;
    buttons.forEach((button, i) => {
      const active = i === index;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
      panels[i].hidden = !active;
      panels[i].classList.remove('is-playing');
    });

    if (animate) play(panels[index]);
  }

  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', '3D animation previews');
  buttons.forEach((button, index) => {
    const panel = panels[index];
    button.id = panel.id + '-tab';
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', panel.id);
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', button.id);
    panel.tabIndex = 0;
    button.addEventListener('click', () => select(index));
  });

  tabs.addEventListener('keydown', event => {
    const order = {
      ArrowLeft: (selected + buttons.length - 1) % buttons.length,
      ArrowRight: (selected + 1) % buttons.length,
      Home: 0,
      End: buttons.length - 1
    };
    if (!Object.hasOwn(order, event.key)) return;
    event.preventDefault();
    select(order[event.key]);
    buttons[selected].focus();
  });

  select(0, false);
  tabs.hidden = false;

  if (!('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    observer.disconnect();
    play(panels[selected]);
  }, { threshold: .25 });
  observer.observe(panels[0]);
})();
