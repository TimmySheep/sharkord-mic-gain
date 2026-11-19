# MicGain

Sharkord plugin that raises your own microphone before it is sent, for microphones that sound quiet to everyone else.

Sharkord captures the mic, optionally gates and denoises it, and sends it as Opus. There is no input gain anywhere in that chain: if your mic is quiet, the only lever today is the browser's own `autoGainControl`, which you can toggle but not tune. MicGain adds a gain stage in the browser, between the captured stream and everything Sharkord does with it.

## Safety model

A boosted microphone is worth nothing if the other side cannot hear it, so this plugin is built to fail open:

- **Off by default**, and 100% does nothing at all. Install it and nothing changes until you turn it on.
- **The boost is only applied when the audio graph provably runs.** A suspended `AudioContext` still hands out a live track that carries silence, and silence is invisible to every layer above it. If the context does not reach `running` within 800 ms, the **raw microphone track is passed through instead**. The worst case is "no boost", never "nobody can hear you".
- **The state is visible.** Settings → MicGain says whether the boost is applied, skipped, or fell back, and why.
- **A context that stops running later is reported**, not silently ignored. The track already handed to the call cannot be repaired from here, so the next capture is sent unboosted.

This is a real limit, not a disclaimer: the plugin cannot prove that audio reaches your listeners, only that the graph it built is running. Verify once with Settings → Devices → microphone test before relying on it in a call.

## Where it sits

```
getUserMedia ─► gain node ─► (Sharkord's noise gate) ─► (RNNoise / DTLN) ─► Opus
```

The gain runs **before** Sharkord's own gate and denoiser, because that is where the capture is. Boosting first changes what the gate sees: a voice that used to sit under the threshold may now cross it. If you use the noise gate, re-check its threshold after enabling gain.

## Install

Requires a Sharkord server with plugin SDK version 2.

1. Download `mic-gain-<version>.zip` from Releases.
2. Extract it into the `plugins` folder of the Sharkord data directory, so the result is `plugins/mic-gain/manifest.json`. On a default install that is `~/.config/sharkord/plugins`.
3. Server settings → General: enable **Plugins**.
4. Server settings → Plugins: enable **MicGain**.
5. Settings → MicGain: turn the boost on and pick a gain.

It coexists with plugins that process playback, such as GainShark: this one only touches capture.

## Build

The Sharkord plugin SDK is not on npm yet, so it is linked from local clones.

```bash
git clone https://github.com/Sharkord/sharkord.git
cd sharkord && bun install && cd packages/plugin-sdk && bun link && cd ../../..
git clone https://github.com/Sharkord/plugin-builder.git
cd plugin-builder && bun install && bun link && cd ..
```

Then:

```bash
bun install
bun link @sharkord/plugin-sdk
bun link @sharkord/plugin-builder
bun test
bun run build   # -> dist/mic-gain
```

## Tests

`bun test` covers the settings defaults and clamping, the two `getUserMedia` constraint shapes, `resumeWithin` in four states (running, hangs, rejects, resolves but stays suspended), and the fail-open branch of the chain builder.

Verified by hand on Chrome: with a gesture the output is a different, processed track and the level doubles at 200%; without a gesture the plugin returns the original track unchanged.

## Limitations

- It patches `navigator.mediaDevices.getUserMedia`, because the plugin SDK has no capture hook. A Sharkord change to how the mic is captured can break it; when it breaks, the raw mic is what gets used.
- Boosting can clip an already loud mic, and it makes room noise louder too. There is no limiter on the capture path.
- Only Chrome (desktop and Electron) has been exercised by hand. Safari and iOS behave differently around audio session interruption; treat them as unverified.
- Per browser, per device. It is your own microphone, sent to everyone, so it is never stored on the server.

## License

[MIT](LICENSE)

Parts of this project were created with AI assistance.
