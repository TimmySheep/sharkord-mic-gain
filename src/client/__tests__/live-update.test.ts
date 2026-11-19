import { describe, expect, test, beforeEach } from "bun:test";

/**
 * Slider moves must reach a call that is already running, otherwise the plugin
 * only works after a rejoin.
 */

type TCalls = { targets: number[]; lastNode: { value: number } | undefined };

const calls: TCalls = { targets: [], lastNode: undefined };

class FakeTrack {
  addEventListener() {}
}

const makeContext = () => ({
  state: "running" as AudioContextState,
  currentTime: 0,
  createMediaStreamSource: () => ({ connect() {} }),
  createGain: () => {
    const node = {
      gain: {
        value: 1,
        setTargetAtTime(value: number) {
          calls.targets.push(value);
          node.gain.value = value;
        },
      },
      connect() {},
    };
    calls.lastNode = node.gain;
    return node;
  },
  createMediaStreamDestination: () => ({
    stream: { getAudioTracks: () => [new FakeTrack()] },
  }),
  close: async () => undefined,
  addEventListener() {},
});

const store = new Map<string, string>();

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
  },
});
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: { addEventListener: () => undefined },
});
// @ts-expect-error test double for the browser constructor
globalThis.MediaStream = class {
  constructor(private readonly tracks: FakeTrack[] = []) {}
  getAudioTracks() {
    return this.tracks;
  }
};
// @ts-expect-error test double for the browser constructor
globalThis.AudioContext = function () {
  return makeContext();
};

const fakeMic = new FakeTrack();
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: {
    mediaDevices: {
      getUserMedia: async () => ({ getAudioTracks: () => [fakeMic] }),
    },
  },
});

const { install, getStatus, uninstall } = await import("../interceptor");
const { setEnabled, setGain } = await import("../settings");

beforeEach(() => {
  calls.targets.length = 0;
  calls.lastNode = undefined;
  store.clear();
  setEnabled(false);
  setGain(100);
  uninstall();
});

const capture = () =>
  navigator.mediaDevices.getUserMedia({
    audio: true,
  } as MediaStreamConstraints);

describe("live updates without a rejoin", () => {
  test("a slider move reaches the running chain", async () => {
    setEnabled(true);
    setGain(150);
    install();

    await capture();

    expect(calls.lastNode?.value).toBe(1.5);

    setGain(250);

    expect(calls.targets.at(-1)).toBe(2.5);
    expect(getStatus().reason).toBe("applied");
  });

  test("turning the boost off returns to unity instead of cutting the mic", async () => {
    setEnabled(true);
    setGain(200);
    install();
    await capture();

    setEnabled(false);

    expect(calls.targets.at(-1)).toBe(1);
    expect(getStatus().reason).toBe("unity");
  });

  test("100% still builds the chain, so a later move applies", async () => {
    setEnabled(true);
    setGain(100);
    install();

    await capture();
    expect(calls.lastNode?.value).toBe(1);

    setGain(180);
    expect(calls.targets.at(-1)).toBe(1.8);
  });

  test("enabling while in a call with no chain says a rejoin is needed", async () => {
    setEnabled(false);
    install();

    await capture(); // captured while off: raw track, no chain

    setEnabled(true);

    expect(getStatus().reason).toBe("awaiting-recapture");
  });
});
