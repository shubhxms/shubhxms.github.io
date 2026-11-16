// Sizes the sheet for the room it has, in whole pixels so rules and type
// stay crisp. Text size is a separate setting: it scales the type, never
// the page.
//
// Left to right: padding | side column (section heads) | gap, with a dotted
// rule | text | gutter | margin notes | padding.

export const MIN_SHEET = 680;
export const MAX_SHEET = 1180;
export const TEXT_STEPS = [0.85, 0.92, 1, 1.08, 1.16, 1.25, 1.35];

// Shares of the sheet's width.
const PAD_LEFT = 0.035;
const PAD_RIGHT = 0.035;
const SIDE = 0.09;
const SIDE_GAP = 0.018;
const GUTTER = 0.03;
const NOTE = 0.2;
// Text column in ems: about 85 characters of Crimson Text a line, set
// close, the way reference books are.
const MEASURE = 34;

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

export function geometry(room, textScale = 1) {
  const sheet = Math.round(clamp(room, MIN_SHEET, MAX_SHEET));
  const padLeft = Math.round(sheet * PAD_LEFT);
  const padRight = Math.round(sheet * PAD_RIGHT);
  const side = clamp(Math.round(sheet * SIDE), 64, 110);
  const sideGap = Math.max(12, Math.round(sheet * SIDE_GAP));
  const gutter = Math.round(sheet * GUTTER);
  const note = Math.round(sheet * NOTE);
  const text = sheet - padLeft - side - sideGap - padRight - gutter - note;
  const base = clamp(Math.round(text / MEASURE), 14, 20);
  const type = Math.round(base * textScale);
  return { sheet, padLeft, side, sideGap, text, gutter, note, padRight, type };
}
