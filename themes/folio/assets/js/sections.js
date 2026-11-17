// Where the reader is among a document's numbered sections.

// Index of the last section whose heading top is at or above `line`, or -1
// while the reader is still above the first one.
export function sectionAt(tops, line) {
  let index = -1;
  for (const top of tops) {
    if (top > line) break;
    index += 1;
  }
  return index;
}

const pad = (n) => String(n).padStart(2, '0');

// "02 / 05" for the second of five sections; "—" when there are none.
export function position(index, count) {
  return count ? `${pad(index + 1)} / ${pad(count)}` : '—';
}
