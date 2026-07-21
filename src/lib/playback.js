// Shared play/pause interval controller for the Turing machine and Game of
// Life demos. Swaps the button label/colors and starts/stops a setInterval.
export function createPlayback({ button, onTick, interval, playBg, playColor, pauseBg, pauseColor }) {
  let playing = false;
  let timer = null;

  function start() {
    playing = true;
    button.textContent = 'Pause';
    button.style.background = pauseBg;
    button.style.color = pauseColor;
    timer = setInterval(onTick, interval);
  }

  function stop() {
    playing = false;
    button.textContent = 'Play';
    button.style.background = playBg;
    button.style.color = playColor;
    clearInterval(timer);
  }

  return {
    toggle() {
      if (playing) stop();
      else start();
    },
    stop,
    get playing() {
      return playing;
    },
  };
}
