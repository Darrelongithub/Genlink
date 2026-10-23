// Central place for reader design tokens so every block stays visually consistent.
// Colors intentionally use direct hex rather than semantic tokens because the
// reader is a premium editorial surface with its own warm cream palette.

export const READER = {
  cream: "#F8F3E7",
  paper: "#FDFAF3",
  ink: "#1B1B1E",
  inkSoft: "#3A3A3F",
  gold: "#C9A84C",
  goldSoft: "#E4CE85",
  navy: "#0D2B55",
  navySoft: "#1B3D74",
  green: "#3E7C57",
  greenSoft: "#E7F1EA",
  amber: "#B8791E",
  amberSoft: "#FDF3DD",
  blue: "#3E5F8A",
  blueSoft: "#E6EEF9",
  serif: '"Playfair Display", "PT Serif", Georgia, serif',
  mono: '"JetBrains Mono", "SFMono-Regular", Menlo, monospace',
} as const;