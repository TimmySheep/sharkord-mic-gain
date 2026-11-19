import { MAX_GAIN, MIN_GAIN, STORAGE_KEY } from "./constants";

/**
 * Per-browser settings. They live next to Sharkord's own settings in
 * localStorage and are never sent to the server.
 */
type TSettings = {
  /** the microphone is only processed while this is on */
  enabled: boolean;
  /** percent, 100 leaves the microphone as captured */
  gain: number;
};

const DEFAULT_SETTINGS: TSettings = { enabled: false, gain: 100 };

const clampGain = (value: number) =>
  Math.min(MAX_GAIN, Math.max(MIN_GAIN, Math.round(value)));

/**
 * Anything missing or malformed falls back to its default, so a record written
 * by an older version keeps working.
 */
const parseSettings = (raw: string | null): TSettings => {
  if (!raw) return DEFAULT_SETTINGS;

  try {
    const parsed = JSON.parse(raw) as Partial<TSettings>;

    return {
      enabled:
        typeof parsed.enabled === "boolean"
          ? parsed.enabled
          : DEFAULT_SETTINGS.enabled,
      gain:
        typeof parsed.gain === "number" && Number.isFinite(parsed.gain)
          ? clampGain(parsed.gain)
          : DEFAULT_SETTINGS.gain,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

/** true only when the microphone should actually be routed through the graph */
const shouldApplyGain = (settings: TSettings) =>
  settings.enabled && settings.gain > MIN_GAIN;

let state: TSettings = parseSettings(localStorage.getItem(STORAGE_KEY));
const listeners = new Set<() => void>();

const commit = (next: TSettings) => {
  state = next;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // storage full or blocked, the value still applies for this session
  }

  listeners.forEach((listener) => listener());
};

const getSettings = () => state;

const subscribeSettings = (listener: () => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

const setEnabled = (enabled: boolean) => commit({ ...state, enabled });

const setGain = (gain: number) => commit({ ...state, gain: clampGain(gain) });

// keep several open tabs in sync
window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY) return;

  state = parseSettings(event.newValue);
  listeners.forEach((listener) => listener());
});

export {
  clampGain,
  getSettings,
  parseSettings,
  setEnabled,
  setGain,
  shouldApplyGain,
  subscribeSettings,
};
export type { TSettings };
