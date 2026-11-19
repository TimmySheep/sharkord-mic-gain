import type { CSSProperties } from "react";

// Sharkord only ships the Tailwind classes it uses itself, so the plugin styles
// inline with the host's theme variables.

const heading: CSSProperties = {
  margin: 0,
  fontSize: 14,
  fontWeight: 600,
  color: "var(--foreground)",
};

const hint: CSSProperties = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.4,
  color: "var(--muted-foreground)",
};

const warning: CSSProperties = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.4,
  color: "var(--foreground)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius, 8px)",
  padding: 10,
  background: "color-mix(in srgb, var(--primary) 8%, transparent)",
};

export { heading, hint, warning };
