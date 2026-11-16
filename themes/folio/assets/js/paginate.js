// Splits a document's flowing sheet into fixed-size sheets, like a PDF.
//
// Breaks fall only between top-level blocks (paragraphs, lists, figures…),
// never inside one. A block taller than a sheet gets a sheet of its own and
// stretches it.

// Plans which blocks go on which sheet.
//   blocks:   [{ height, extent?, lead?, section?, heading?, pagebreak? }]
//             extent  – how far the block reaches, counting its marginalia
//             lead    – the document's title block; the first section joins it
//             section – an h2; starts a new sheet in 'section' mode
//             heading – kept on the same sheet as the block after it
//   capacity: the height available on one sheet
//   mode:     'section' (each h2 starts a sheet) or 'flow' (break when full)
// Returns a list of sheets, each a list of block indices.
export function planPages(blocks, capacity, mode = 'section') {
  const pages = [];
  let page = [];
  let used = 0;

  blocks.forEach((block, i) => {
    const next = blocks[i + 1];
    const reach = Math.max(block.height, block.extent ?? 0);
    const needed = block.heading && next ? block.height + next.height : reach;

    const onlyLead = page.every((j) => blocks[j].lead);
    const newSection = block.section && mode === 'section' && !onlyLead;
    const overflows = used + needed > capacity;

    if (page.length > 0 && (block.pagebreak || newSection || overflows)) {
      pages.push(page);
      page = [];
      used = 0;
    }
    page.push(i);
    used += block.height;
  });

  if (page.length > 0) pages.push(page);
  return pages;
}

// Reads the layout of a flowing sheet's blocks.
function measure(body) {
  const children = Array.from(body.children);
  const tops = children.map((el) => el.offsetTop);
  const end = body.scrollHeight;

  return children.map((el, i) => {
    const top = tops[i];
    const bottom = i + 1 < tops.length ? tops[i + 1] : end;
    const notes = el.querySelectorAll('.sidenote, .marginnote, .marginfigure');
    const noteBottom = Math.max(
      el.offsetTop + el.offsetHeight,
      ...Array.from(notes, (note) => noteOffset(note, body) + note.offsetHeight),
    );
    return {
      height: bottom - top,
      extent: noteBottom - top,
      lead: el.classList.contains('doc-head'),
      section: el.tagName === 'H2',
      heading: /^H[2-4]$/.test(el.tagName),
      pagebreak: el.classList.contains('pagebreak'),
    };
  });
}

function noteOffset(el, body) {
  let top = 0;
  for (let node = el; node && node !== body; node = node.offsetParent) top += node.offsetTop;
  return top;
}

// Height a sheet's body may fill, taken from the sheet's own CSS.
function sheetCapacity(sheet) {
  const style = getComputedStyle(sheet);
  return parseFloat(style.minHeight) - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
}

function emptySheetLike(sheet) {
  const clone = sheet.cloneNode(false);
  clone.removeAttribute('data-flow');
  clone.removeAttribute('id');
  clone.append(...Array.from(sheet.children, (part) => part.cloneNode(false)));
  return clone;
}

// Splits every flowing sheet inside `folio` into sheets of fixed size.
export function paginate(folio) {
  folio.classList.add('is-paged');
  const mode = folio.dataset.pages || 'section';

  folio.querySelectorAll('.sheet[data-flow]').forEach((flow) => {
    const body = flow.querySelector('.sheet-body');
    const blocks = Array.from(body.children);
    const plan = planPages(measure(body), sheetCapacity(flow), mode);

    let anchor = flow;
    plan.slice(1).forEach((indices) => {
      const sheet = emptySheetLike(flow);
      sheet.dataset.continued = '';
      sheet.querySelector('.sheet-body').append(...indices.map((i) => blocks[i]));
      anchor.after(sheet);
      anchor = sheet;
    });
  });

  label(folio);
}

// Gathers all continuation sheets back into their flowing sheet.
export function unpaginate(folio) {
  folio.querySelectorAll('.sheet[data-flow]').forEach((flow) => {
    const body = flow.querySelector('.sheet-body');
    let next = flow.nextElementSibling;
    while (next && next.hasAttribute('data-continued')) {
      body.append(...next.querySelector('.sheet-body').children);
      const done = next;
      next = next.nextElementSibling;
      done.remove();
    }
  });
  folio.classList.remove('is-paged');
  label(folio);
}

// Numbers the sheets and gives each its running head: the current section.
function label(folio) {
  const title = folio.dataset.title || '';
  let section = '';

  const paged = folio.classList.contains('is-paged');

  folio.querySelectorAll('.sheet').forEach((sheet, i) => {
    const headings = Array.from(sheet.querySelectorAll('.sheet-body > h2'));
    const blocks = Array.from(sheet.querySelector('.sheet-body')?.children ?? []);
    const opener = blocks.find((el) => !el.classList.contains('pagebreak'));
    if (opener && opener.tagName === 'H2') section = opener.textContent.trim();

    sheet.dataset.number = String(i + 1);
    sheet.dataset.section = section;
    const head = sheet.querySelector('.sheet-head');
    const foot = sheet.querySelector('.sheet-foot');
    if (head) head.textContent = paged && i > 0 ? [title, section].filter(Boolean).join(' · ') : '';
    if (foot) foot.textContent = paged ? String(i + 1) : '';

    // A section that starts mid-sheet is the running head of the sheets after it.
    if (headings.length) section = headings[headings.length - 1].textContent.trim();
  });
}
