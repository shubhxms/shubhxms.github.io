// localStorage that tolerates being unavailable (private windows, blocked
// site data): reads fall back to null and writes last for this page only.
export function stored(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function store(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Nothing to do: the setting still applies until the page is left.
  }
}
