### Problem

There is no way to adjust the microphone's input level. The capture path runs `getUserMedia` with `autoGainControl` (toggleable, not tunable), an optional noise gate and optionally RNNoise/DTLN, then encodes with Opus. Nothing in that chain sets a gain.

So when someone's microphone sounds quiet, everyone else has to compensate on their own side. Receive-side volume has been discussed in #201 and #961, but that only helps each listener; it cannot fix what the sender is putting on the wire, and it does nothing for someone whose browser AGC is already at its limit.

Toggling `autoGainControl` is the only lever today, and it is a yes/no: it cannot be aimed, and it is not available on every device.

### Proposed Solution

A microphone gain in Settings → Devices, next to the existing gate and denoiser controls: a 100–300% slider, default 100%, applied to the captured track before the encoder.

Because a mistake in this path is silent — a suspended `AudioContext` still hands out a `live` track that carries nothing, so nobody hears you and no layer reports an error — it should fail open. If the processing graph cannot be shown to be running, the raw track should be sent instead. The worst case is then "no boost", never "nobody can hear you".

One placement detail worth deciding: gain before the noise gate changes what the gate sees, so a voice that used to sit under the threshold may start crossing it. Either the gain sits after the gate, or the gate's threshold needs re-checking when gain is enabled.

### Feasibility evidence

I built this as a plugin to check whether it works before asking: https://github.com/TimmySheep/sharkord-mic-gain

- It wraps `navigator.mediaDevices.getUserMedia` and inserts a gain node before Sharkord sees the track.
- Verified in Chrome: at 200% the captured level doubles; with no user gesture (so the context stays `suspended`) it returns the original track unchanged instead of a silent processed one.
- 14 unit tests cover the settings, the constraint shapes, and the fail-open branches.
- Known limits, also written in its README: it patches `getUserMedia` because the plugin SDK has no capture hook, so it is coupled to the capture implementation; Safari and iOS are unverified; there is no limiter, so an already loud mic can clip.

Would a gain stage in the capture chain fit the project's scope? If it does, I am happy to send a PR for the core path instead, where the state handling and fallback belong. If it does not, the plugin stays available for anyone who wants it, and this issue can be closed.
