// Sizes the sheet for the room it has, in whole pixels so rules and type
// stay crisp. Text size is a separate setting: it scales the type, never
// the page.

export const MIN_SHEET = 680;
export const MAX_SHEET = 1120;
export const TEXT_STEPS = [0.85, 0.92, 1, 1.08, 1.16, 1.25, 1.35];

// Shares of the sheet's width.
const PAD_LEFT = 0.06;
const PAD_RIGHT = 0.05;
const GUTTER = 0.034;
const NOTE = 0.21;
// Text column in ems: about 85 characters of Crimson Text a line, set
// close, the way reference books are.
const MEASURE = 35;

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

export function geometry(room, textScale = 1) {
  const sheet = Math.round(clamp(room, MIN_SHEET, MAX_SHEET));
  const padLeft = Math.round(sheet * PAD_LEFT);
  const padRight = Math.round(sheet * PAD_RIGHT);
  const gutter = Math.round(sheet * GUTTER);
  const note = Math.round(sheet * NOTE);
  const text = sheet - padLeft - padRight - gutter - note;
  const base = clamp(Math.round(text / MEASURE), 14, 20);
  const type = Math.round(base * textScale);
  return { sheet, padLeft, padRight, gutter, note, text, type };
}
