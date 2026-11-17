// Core's tables: a click on a line (anywhere but a link), or Enter or
// space on it, shows that entry in the section's preview pane. On a
// phone, where there is no pane, it opens the entry's note if it has one.
// A link to a line (#id, as from the home page's picks) shows it too.

function choose(row) {
  const section = row.closest('.core-section');
  const plate = section.querySelector('.core-plate');
  if (!plate.offsetParent) {
    row.querySelector('a')?.click();
    return;
  }
  section.querySelectorAll('.is-shown').forEach((el) => el.classList.remove('is-shown'));
  row.classList.add('is-shown');
  plate.querySelector(`.core-peek[data-for="${CSS.escape(row.id)}"]`)?.classList.add('is-shown');
}

function linked() {
  const id = window.location.hash && decodeURIComponent(window.location.hash.slice(1));
  const row = id && document.getElementById(id);
  if (row?.classList.contains('core-row')) choose(row);
}

export function bindCore(root) {
  if (!root.querySelector('.core-section')) return;
  const rowOf = (target) => target.closest?.('.core-row');
  root.addEventListener('click', (event) => {
    const row = rowOf(event.target);
    if (row && !event.target.closest('a')) choose(row);
  });
  root.addEventListener('keydown', (event) => {
    const row = rowOf(event.target);
    if (!row || event.target !== row) return;
    const step = { ArrowDown: 'nextElementSibling', ArrowUp: 'previousElementSibling' }[event.key];
    if (step) {
      let next = row[step];
      while (next && !next.classList.contains('core-row')) next = next[step];
      if (next) {
        event.preventDefault();
        next.focus();
      }
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      choose(row);
    }
  });
  window.addEventListener('hashchange', linked);
  linked();
}
