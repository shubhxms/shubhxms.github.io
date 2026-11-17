# Draws base.png, the blank 1200x630 link-preview card that the og-image
# partial writes each page's text onto: paper, a rule under the site
# name, and the printer's marks. Run from the repo root after a design
# change: python3 themes/folio/assets/og/make-base.py
from PIL import Image, ImageDraw
W, H, M = 1200, 630, 72
S = 2  # drawn at twice the size, then scaled down, for smooth circles
paper, ink = (252, 253, 255), (0, 0, 0)
im = Image.new('RGB', (W * S, H * S), paper)
d = ImageDraw.Draw(im)
d.line([(M * S, 108 * S), ((W - M) * S, 108 * S)], fill=ink, width=2 * S)
# Registration mark, then full, half and empty tone dots.
r, gap, y = 11, 34, H - M - 4
x0 = W - M - r - 3 * gap
for i, kind in enumerate(['reg', 'full', 'half', 'empty']):
    cx = x0 + i * gap
    box = [(cx - r) * S, (y - r) * S, (cx + r) * S, (y + r) * S]
    if kind == 'full':
        d.ellipse(box, fill=ink)
    elif kind == 'half':
        d.ellipse(box, outline=ink, width=2 * S)
        d.pieslice(box, 90, 270, fill=ink)
    else:
        d.ellipse(box, outline=ink, width=2 * S)
    if kind == 'reg':
        d.line([(cx * S, (y - r) * S), (cx * S, (y + r) * S)], fill=ink, width=2 * S)
        d.line([((cx - r) * S, y * S), ((cx + r) * S, y * S)], fill=ink, width=2 * S)
im.resize((W, H), Image.LANCZOS).save('themes/folio/assets/og/base.png', optimize=True)
print('ok')
