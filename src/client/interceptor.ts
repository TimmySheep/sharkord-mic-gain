import { RESUME_TIMEOUT_MS } from "./constants";
import { getSettings, shouldApplyGain } from "./settings";

/**
 * Wraps `navigator.mediaDevices.getUserMedia` so the microphone can be boosted
 * before Sharkord hands the track to its encoder.
 *
 * Sharkord captures once per call (and again on device changes or reconnects),
 * so the wrapper has to make its decision every time, and it has to fail open:
 * a track that is louder is worth nothing if the other side cannot hear it.
 */

type TStatusReason =
  | "idle"
  | "applied"
  | "skipped"
  | "not-running"
  | "interrupted"
  | "no-track"
  | "error";

type TStatus = {
  reason: TStatusReason;
  gain: number;
  at: number;
  detail?: string;
};

let status: TStatus = { reason: "idle", gain: 100, at: 0 };
const statusListeners = new Set<() => void>();

const setStatus = (reason: TStatusReason, gain: number, detail?: string) => {
  status = { reason, gain, at: Date.now(), detail };
  statusListeners.forEach((listener) => listener());
};

const getStatus = () => status;

const subscribeStatus = (listener: () => void) => {
  statusListeners.add(listener);

  return () => {
    statusListeners.delete(listener);
  };
};

/** does this getUserMedia call ask for audio at all */
const wantsAudio = (constraints: MediaStreamConstraints | undefined): boolean => {
  if (!constraints) return false;

  const { audio } = constraints;

  if (typeof audio === "boolean") return audio;

  return !!audio;
};

/**
 * Waits for the context to actually run. A suspended context still hands out a
 * live track, but that track carries silence, which is the failure this plugin
 * must never ship: silence is invisible to every layer above.
 */
const resumeWithin = async (
  context: AudioContext,
  timeoutMs: number,
): Promise<boolean> => {
  if (context.state === "running") return true;

  try {
    await Promise.race([
      context.resume(),
      new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
    ]);
  } catch {
    return false;
  }

  return context.state === "running";
};

type TGainChain = {
  stream: MediaStream;
  context: AudioContext;
};

/**
 * Builds the graph and hands back the processed stream, or `undefined` when
 * the graph cannot be proven to work. The caller passes the raw stream through
 * in that case.
 */
const buildGainChain = async (
  raw: MediaStream,
  gainPercent: number,
  timeoutMs = RESUME_TIMEOUT_MS,
): Promise<TGainChain | undefined> => {
  const track = raw.getAudioTracks()[0];

  if (!track) {
    setStatus("no-track", gainPercent);
    return undefined;
  }

  let context: AudioContext | undefined;

  try {
    context = new AudioContext();

    const source = context.createMediaStreamSource(raw);
    const gain = context.createGain();
    const destination = context.createMediaStreamDestination();

    gain.gain.value = gainPercent / 100;
    source.connect(gain);
    gain.connect(destination);

    const running = await resumeWithin(context, timeoutMs);
    const processed = destination.stream.getAudioTracks()[0];

    if (!running || context.state !== "running" || !processed) {
      throw new Error(`context ${context.state}, track ${processed?.readyState}`);
    }

    track.addEventListener(
      "ended",
      () => {
        void context?.close().catch(() => undefined);
      },
      { once: true },
    );

    setStatus("applied", gainPercent);

    return { stream: new MediaStream([processed]), context };
  } catch (error) {
    if (context) void context.close().catch(() => undefined);

    setStatus("not-running", gainPercent, String(error));

    return undefined;
  }
};

/**
 * Notices a context that stops running later (the system interrupts audio, the
 * device disappears). The track already handed to Sharkord cannot be repaired
 * from here, so this only makes the state visible and stops applying the boost
 * to the next capture.
 */
const watchContext = (context: AudioContext, gainPercent: number) => {
  const timer = setInterval(() => {
    if (context.state === "running") return;

    clearInterval(timer);
    setStatus("interrupted", gainPercent, context.state);
  }, 1000);

  context.addEventListener("statechange", () => {
    if (context.state === "running") return;

    clearInterval(timer);
    setStatus("interrupted", gainPercent, context.state);
  });
};

let installed = false;
let original: typeof navigator.mediaDevices.getUserMedia | undefined;

const install = () => {
  if (installed) return;

  const devices = navigator.mediaDevices;

  if (!devices?.getUserMedia) {
    setStatus("error", 100, "getUserMedia is not available");
    return;
  }

  original = devices.getUserMedia.bind(devices);

  devices.getUserMedia = async (constraints?: MediaStreamConstraints) => {
    const raw = await original!(constraints);

    if (!wantsAudio(constraints)) return raw;

    const settings = getSettings();

    if (!shouldApplyGain(settings)) {
      setStatus("skipped", settings.gain);
      return raw;
    }

    const chain = await buildGainChain(raw, settings.gain);

    if (!chain) return raw;

    watchContext(chain.context, settings.gain);

    return chain.stream;
  };

  installed = true;
};

const uninstall = () => {
  if (!installed || !original) return;

  navigator.mediaDevices.getUserMedia = original;
  original = undefined;
  installed = false;
  setStatus("idle", 100);
};

export {
  buildGainChain,
  getStatus,
  install,
  resumeWithin,
  subscribeStatus,
  uninstall,
  wantsAudio,
};
export type { TStatus, TStatusReason };
