const STORAGE_KEY = "ecoboty-games-muted";

const getInitialMuted = () => {
  if (!import.meta.client) return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

export const useGameAudio = () => {
  const muted = useState("ecoboty-games-muted", () => getInitialMuted());
  let audioCtx = null;

  const persistMute = (value) => {
    muted.value = Boolean(value);
    if (!import.meta.client) return;
    try {
      localStorage.setItem(STORAGE_KEY, muted.value ? "1" : "0");
    } catch {
      // ignore storage errors
    }
  };

  const toggleMute = () => persistMute(!muted.value);

  const getContext = () => {
    if (!import.meta.client || muted.value) return null;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  };

  const playTone = ({ frequency, duration = 0.18, type = "sine", gain = 0.08, delay = 0, slideTo }) => {
    const ctx = getContext();
    if (!ctx) return;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), start + duration);
    }
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain, start + 0.02);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(amp);
    amp.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  };

  const playCoin = () => {
    playTone({ frequency: 740, duration: 0.08, type: "triangle", gain: 0.07 });
    playTone({ frequency: 1180, duration: 0.14, type: "sine", gain: 0.05, delay: 0.06 });
  };

  const playTick = () => {
    playTone({ frequency: 420, duration: 0.05, type: "square", gain: 0.03 });
  };

  const playWin = () => {
    playTone({ frequency: 523.25, duration: 0.12, type: "triangle", gain: 0.07 });
    playTone({ frequency: 659.25, duration: 0.12, type: "triangle", gain: 0.07, delay: 0.1 });
    playTone({ frequency: 783.99, duration: 0.14, type: "triangle", gain: 0.08, delay: 0.2 });
    playTone({ frequency: 1046.5, duration: 0.28, type: "sine", gain: 0.09, delay: 0.32 });
    playTone({ frequency: 1318.5, duration: 0.22, type: "sine", gain: 0.04, delay: 0.42 });
  };

  const playLose = () => {
    playTone({ frequency: 220, duration: 0.22, type: "sawtooth", gain: 0.05, slideTo: 110 });
    playTone({ frequency: 164.81, duration: 0.34, type: "triangle", gain: 0.06, delay: 0.12, slideTo: 90 });
  };

  return {
    muted,
    persistMute,
    toggleMute,
    playCoin,
    playTick,
    playWin,
    playLose
  };
};
