/**
 * Microphone gain, applied inside the browser before Sharkord hands the track
 * to the encoder.
 *
 * The rule this plugin is built around: never trade a working microphone for a
 * louder one. If anything about the processing graph is not provably working,
 * the raw track is passed through instead, so the worst case is "no boost"
 * rather than "nobody can hear you".
 */

const PLUGIN_ID = "mic-gain";

/** 100 is the microphone as captured, nothing applied */
const MIN_GAIN = 100;
const MAX_GAIN = 300;

const STORAGE_KEY = "mic-gain-settings";

/** how long to wait for the audio context to start before giving up */
const RESUME_TIMEOUT_MS = 800;

export {
  MAX_GAIN,
  MIN_GAIN,
  PLUGIN_ID,
  RESUME_TIMEOUT_MS,
  STORAGE_KEY,
};
