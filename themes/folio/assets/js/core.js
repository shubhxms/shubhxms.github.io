// Core's sections: a table beside a pane. At rest the pane is a wall of
// covers; pointing at a line or a cover shows that entry large, and a
// click (or Enter or space on a line) keeps it. A link to a line (#id, as
// from the home page's picks) keeps it too. On a phone the wall is a strip
// above the table and a line opens its note, if it has one.

const phone = window.matchMedia('(max-width: 800px)');

// Shows entry `id` in its section's pane, or the wall when there is none.
function show(section, id) {
  const plate = section.querySelector('.core-plate');
  plate.classList.toggle('is-peeking', Boolean(id));
  plate.querySelectorAll('.core-peek').forEach((peek) => {
    peek.classList.toggle('is-shown', peek.dataset.for === id);
  });
}

function choose(section, id) {
  const row = document.getElementById(id);
  if (phone.matches) {
    row?.querySelector('a')?.click();
    return;
  }
  section.dataset.chosen = id;
  section.querySelectorAll('.core-row').forEach((r) => r.classList.toggle('is-chosen', r.id === id));
  show(section, id);
}

function linked() {
  const id = window.location.hash && decodeURIComponent(window.location.hash.slice(1));
  const row = id && document.getElementById(id);
  if (row?.classList.contains('core-row') && !phone.matches) choose(row.closest('.core-section'), id);
}

function bindSection(section) {
  const idOf = (target) => target.closest?.('.core-row')?.id || target.closest?.('.core-wall-item')?.dataset.for;

  section.addEventListener('mouseover', (event) => {
    const id = idOf(event.target);
    if (id) show(section, id);
  });
  section.addEventListener('mouseleave', () => show(section, section.dataset.chosen));

  section.addEventListener('click', (event) => {
    const item = event.target.closest('.core-wall-item');
    if (item) {
      // Choose its line where it is, without jumping the page to it.
      event.preventDefault();
      if (phone.matches) {
        document.getElementById(item.dataset.for)?.scrollIntoView({ block: 'center' });
        return;
      }
      choose(section, item.dataset.for);
      return;
    }
    const row = event.target.closest('.core-row');
    if (row && !event.target.closest('a')) choose(section, row.id);
  });

  section.addEventListener('keydown', (event) => {
    const row = event.target.closest?.('.core-row');
    if (!row || event.target !== row) return;
    const step = { ArrowDown: 'nextElementSibling', ArrowUp: 'previousElementSibling' }[event.key];
    if (step) {
      let next = row[step];
      while (next && !next.classList.contains('core-row')) next = next[step];
      if (next) {
        event.preventDefault();
        next.focus();
        show(section, next.id);
      }
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      choose(section, row.id);
    }
  });
}

export function bindCore(root) {
  const sections = root.querySelectorAll('.core-section');
  if (!sections.length) return;
  sections.forEach(bindSection);
  window.addEventListener('hashchange', linked);
  linked();
}
