(() => {
  const player = document.querySelector('.bam-project-player');
  if (!player) return;
  const video = player.querySelector('video');
  const button = player.querySelector('.bam-project-play');

  if (!video.canPlayType('video/mp4')) return;
  video.controls = false;
  video.tabIndex = -1;
  button.hidden = false;

  button.addEventListener('click', () => {
    video.controls = true;
    video.tabIndex = 0;
    video.play().catch(() => video.focus());
  });

  video.addEventListener('play', () => {
    if (document.activeElement === button) video.focus();
    button.hidden = true;
  });

  video.addEventListener('ended', () => {
    button.setAttribute('aria-label', 'Replay the Scottie Bonding Agency video');
    button.hidden = false;
  });
})();
