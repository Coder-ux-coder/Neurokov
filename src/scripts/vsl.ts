/**
 * The home page video (Vsl.astro). The big play button starts it with sound and steps aside for the
 * player's own controls. Until then the player's controls stay hidden behind the button.
 */

export function startVsl() {
  const host = document.querySelector<HTMLElement>('[data-vsl]');
  if (host) {
    const video = host.querySelector('video')!;
    const start = host.querySelector<HTMLButtonElement>('[data-vsl-play]')!;
    video.controls = false;
    start.hidden = false;
    start.addEventListener('click', () => {
      start.hidden = true;
      video.controls = true;
      host.classList.add('is-started');
      video.focus();
      video.play().catch(() => {
        /* playback refused (a power saver, say): the controls are there to try again */
      });
    });
  }
}
