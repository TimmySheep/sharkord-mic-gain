import { describe, expect, test } from "bun:test";

// the module reads storage at import time and listens for storage events
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
  },
});

Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: { addEventListener: () => undefined },
});

const { parseSettings, shouldApplyGain, clampGain } = await import("../settings");

describe("settings", () => {
  test("defaults to off, so installing the plugin changes nothing", () => {
    const settings = parseSettings(null);

    expect(settings.enabled).toBe(false);
    expect(settings.gain).toBe(100);
    expect(shouldApplyGain(settings)).toBe(false);
  });

  test("a record written by an older version keeps its known fields", () => {
    const settings = parseSettings(JSON.stringify({ enabled: true }));

    expect(settings.enabled).toBe(true);
    expect(settings.gain).toBe(100);
  });

  test("malformed json falls back to the defaults", () => {
    expect(parseSettings("{not json")).toEqual({ enabled: false, gain: 100 });
  });

  test("a gain that is not a number falls back to 100", () => {
    expect(parseSettings(JSON.stringify({ gain: "loud" })).gain).toBe(100);
  });

  test("gain is clamped to 100-300", () => {
    expect(clampGain(20)).toBe(100);
    expect(clampGain(900)).toBe(300);
    expect(clampGain(147.6)).toBe(148);
  });

  test("100% counts as no processing at all", () => {
    expect(shouldApplyGain({ enabled: true, gain: 100 })).toBe(false);
    expect(shouldApplyGain({ enabled: true, gain: 150 })).toBe(true);
    expect(shouldApplyGain({ enabled: false, gain: 150 })).toBe(false);
  });
});
