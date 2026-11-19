import { memo, type ChangeEvent } from "react";
import { MAX_GAIN, MIN_GAIN } from "../constants";
import { setEnabled, setGain } from "../settings";
import { useSettings, useStatus } from "./hooks";
import { heading, hint, warning } from "./styles";

const section = { display: "grid", gap: 12, maxWidth: 480 } as const;

const STATUS_TEXT: Record<string, string> = {
  idle: "Not applied yet. Join a voice channel to see it work.",
  applied: "Boosting your microphone.",
  unity: "On, but at 100%, so your microphone is sent as captured.",
  skipped: "Off, so your microphone is sent as captured.",
  "awaiting-recapture":
    "Turned on while already in a call. Leave and rejoin the voice channel once to apply it; after that, moving the slider applies immediately.",
  "not-running":
    "The audio context did not start, so your microphone was sent unboosted. Nothing is broken: you were still heard.",
  interrupted:
    "The audio context stopped while in use. Your next capture will be sent unboosted.",
  "no-track": "No microphone track was found, so nothing was applied.",
  error: "The microphone could not be processed. Nothing was changed.",
};

/** MicGain's entry in the user settings */
const SettingsPage = memo(() => {
  const settings = useSettings();
  const status = useStatus();

  const onEnabledChange = (event: ChangeEvent<HTMLInputElement>) =>
    setEnabled(event.target.checked);

  const onGainChange = (event: ChangeEvent<HTMLInputElement>) =>
    setGain(Number(event.target.value));

  return (
    <div style={{ display: "grid", gap: 24, color: "var(--foreground)" }}>
      <div style={section}>
        <h2 style={{ ...heading, fontSize: 18 }}>MicGain</h2>
        <p style={hint}>
          Raises your microphone before it is sent, for microphones that sound
          quiet to everyone else. It is off by default and does nothing at{" "}
          {MIN_GAIN}%.
        </p>
      </div>

      <label
        style={{ ...section, display: "flex", alignItems: "flex-start", gap: 10 }}
      >
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={onEnabledChange}
          style={{ marginTop: 2, accentColor: "var(--primary)" }}
        />
        <span style={{ display: "grid", gap: 2 }}>
          <span style={{ fontSize: 14 }}>Boost my microphone</span>
          <span style={hint}>
            Only you can change this, and only for the device you are on.
          </span>
        </span>
      </label>

      <label style={section}>
        <span style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 14 }}>Gain</span>
          <span style={{ fontSize: 14, color: "var(--muted-foreground)" }}>
            {settings.gain}%
          </span>
        </span>
        <input
          type="range"
          min={MIN_GAIN}
          max={MAX_GAIN}
          step={5}
          value={settings.gain}
          disabled={!settings.enabled}
          onChange={onGainChange}
          aria-label="Microphone gain"
          style={{ width: "100%", accentColor: "var(--primary)" }}
        />
        <span style={hint}>
          Above {MIN_GAIN}% your microphone is routed through a gain node. Loud
          microphones may clip when boosted.
        </span>
      </label>

      <div style={section}>
        <p style={warning}>
          This changes what other people hear, and it is not verified by this
          page. Before relying on it in a call, open the microphone test under
          Settings → Devices and confirm the level moves while you speak.
        </p>
        <p style={hint}>{STATUS_TEXT[status.reason] ?? STATUS_TEXT.idle}</p>
      </div>
    </div>
  );
});

export { SettingsPage };
