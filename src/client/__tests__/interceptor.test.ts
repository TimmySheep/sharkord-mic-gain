import { describe, expect, test, beforeEach } from "bun:test";

type TBehavior = {
  initial: AudioContextState;
  resume?: "resolve-running" | "resolve-suspended" | "hang" | "reject";
};

class FakeTrack {
  ended = false;
  addEventListener() {}
}

class FakeNode {
  connect() {
    return this;
  }
  disconnect() {}
}

const makeContext = (behavior: TBehavior, tracks: FakeTrack[]) => {
  const context = {
    state: behavior.initial,
    closed: false,
    createMediaStreamSource: () => new FakeNode(),
    createGain: () => ({ gain: { value: 1 }, connect() {}, disconnect() {} }),
    createMediaStreamDestination: () => ({
      stream: { getAudioTracks: () => tracks },
    }),
    async resume() {
      switch (behavior.resume) {
        case "resolve-running":
          context.state = "running";
          return;
        case "resolve-suspended":
          return;
        case "reject":
          throw new Error("not allowed");
        case "hang":
        default:
          return new Promise<void>(() => undefined);
      }
    },
    async close() {
      context.closed = true;
    },
    addEventListener() {},
  };

  return context;
};

let created: ReturnType<typeof makeContext>[] = [];

const installAudioContext = (behavior: TBehavior, tracks = [new FakeTrack()]) => {
  created = [];

  // @ts-expect-error test double for the browser constructor
  globalThis.AudioContext = function () {
    const context = makeContext(behavior, tracks);
    created.push(context);
    return context;
  };
};

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: { getItem: () => null, setItem: () => undefined },
});
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: { addEventListener: () => undefined },
});

// bun has no MediaStream; the chain only needs to wrap one track
// @ts-expect-error test double for the browser constructor
globalThis.MediaStream = class {
  private readonly tracks: FakeTrack[];

  constructor(tracks: FakeTrack[] = []) {
    this.tracks = tracks;
  }

  getAudioTracks() {
    return this.tracks;
  }
};

const { buildGainChain, getStatus, resumeWithin, wantsAudio } = await import(
  "../interceptor"
);

const rawStream = (tracks = [new FakeTrack()]) =>
  ({ getAudioTracks: () => tracks }) as unknown as MediaStream;

beforeEach(() => {
  installAudioContext({ initial: "running" });
});

describe("wantsAudio", () => {
  test("reads both constraint shapes", () => {
    expect(wantsAudio({ audio: true })).toBe(true);
    expect(wantsAudio({ audio: { echoCancellation: true } })).toBe(true);
    expect(wantsAudio({ audio: false, video: true })).toBe(false);
    expect(wantsAudio({ video: true })).toBe(false);
    expect(wantsAudio(undefined)).toBe(false);
  });
});

describe("resumeWithin", () => {
  test("returns true when already running", async () => {
    const context = makeContext({ initial: "running" }, []);

    expect(await resumeWithin(context as unknown as AudioContext, 50)).toBe(true);
  });

  test("returns false when resume never settles", async () => {
    const context = makeContext({ initial: "suspended", resume: "hang" }, []);

    expect(await resumeWithin(context as unknown as AudioContext, 20)).toBe(false);
  });

  test("returns false when resume rejects", async () => {
    const context = makeContext({ initial: "suspended", resume: "reject" }, []);

    expect(await resumeWithin(context as unknown as AudioContext, 50)).toBe(false);
  });

  test("returns false when resume resolves but the context stays suspended", async () => {
    const context = makeContext(
      { initial: "suspended", resume: "resolve-suspended" },
      [],
    );

    expect(await resumeWithin(context as unknown as AudioContext, 50)).toBe(false);
  });
});

describe("buildGainChain fails open", () => {
  test("returns a processed stream when the context runs", async () => {
    const processed = new FakeTrack();
    installAudioContext({ initial: "running" }, [processed]);

    const chain = await buildGainChain(rawStream(), 200);

    expect(chain).toBeDefined();
    expect(chain!.stream.getAudioTracks()[0]).toBe(processed as never);
    expect(getStatus().reason).toBe("applied");
  });

  test("returns undefined, and closes the context, when it never starts", async () => {
    installAudioContext({ initial: "suspended", resume: "hang" });

    const chain = await buildGainChain(rawStream(), 200, 20);

    expect(chain).toBeUndefined();
    expect(created[0]?.closed).toBe(true);
    expect(getStatus().reason).toBe("not-running");
  });

  test("returns undefined when there is no audio track to process", async () => {
    installAudioContext({ initial: "running" });

    const chain = await buildGainChain(rawStream([]), 200);

    expect(chain).toBeUndefined();
    expect(getStatus().reason).toBe("no-track");
  });
});
