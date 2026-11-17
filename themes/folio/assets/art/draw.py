# Draws the sidebar's three line illustrations as SVG, into themes/folio/assets/art/.
# Run from the repository root: python3 themes/folio/assets/art/draw.py
# Each is 160x150, stroked in currentColor, so it takes the theme's ink.
import os

OUT = os.path.join(os.environ.get('ROOT', '.'), 'themes/folio/assets/art')
os.makedirs(OUT, exist_ok=True)

HEAD = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 150" fill="none" '
        'stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" '
        'role="img" aria-label="{label}">\n<title>{label}</title>\n')


def svg(name, label, body):
    with open(os.path.join(OUT, name + '.svg'), 'w') as f:
        f.write(HEAD.format(label=label) + body.strip() + '\n</svg>\n')


def p(d, **attrs):
    extra = ''.join(f' {k.replace("_", "-")}="{v}"' for k, v in attrs.items())
    return f'<path d="{d}"{extra}/>\n'


def circle(cx, cy, r, **attrs):
    extra = ''.join(f' {k.replace("_", "-")}="{v}"' for k, v in attrs.items())
    return f'<circle cx="{cx}" cy="{cy}" r="{r}"{extra}/>\n'


# ---- A pol house: carved doorway, a jharokha above, a chabutro beside ----
b = ''
b += p('M4 140h152')
# Chabutro: a bird-feeder on a pole, with a little pavilion top.
b += p('M20 139V64M16 140h8')
b += p('M9 64h22l-2.5-6h-17z')
b += p('M13 58V46h14v12')
b += p('M17 58v-5a3 3 0 0 1 6 0v5')
b += p('M10 46h20l-10-11z')
b += p('M20 35v-4')
b += p('M33 28q2.5-3 5 0q2.5-3 5 0')
b += p('M7 21q2-2.4 4 0q2-2.4 4 0')
# The house.
b += p('M44 139V28h104v111')
b += p('M40 28h112M42 23h108v5')
b += ''.join(p(f'M{x} 28v3') for x in range(47, 148, 5))
# Upper floor: the jharokha, on brackets, under a sloped chhajja.
b += p('M68 45l6-7h44l6 7z')
b += p('M80 66V55q16-13 32 0v11')
b += p('M84 66V57q12-9.5 24 0v9')
b += p('M74 74V66h44v8')
b += ''.join(p(f'M{x} 66v8') for x in range(78, 117, 4))
b += p('M70 74h52M72 74v3h48v-3')
b += p('M77 77q0 6 5 8M115 77q0 6-5 8')
# Side windows, upstairs and down.
b += p('M54 66V56a6 6 0 0 1 12 0v10zM126 66V56a6 6 0 0 1 12 0v10z')
b += p('M44 89h26M122 89h26')
b += p('M54 120v-15h12v15zM126 120v-15h12v15z')
b += ''.join(p(f'M{x} 105v15') for x in (58, 62, 130, 134))
# The doorway: a carved frame round an arched door of two studded leaves.
b += p('M73 139V101q23-22 46 0v38')
b += p('M78 139V104q18-16 36 0v35')
b += p('M96 139V95')
b += ''.join(circle(x, y, 0.8) for y in (110, 118, 126, 134) for x in (85, 90, 102, 107))
b += p('M69 139v-3h54v3')
svg('pol', 'A pol house in old Ahmedabad: a carved doorway, a jharokha above, a chabutro beside', b)


# ---- A cutting-chai stall ----
b = ''
b += p('M4 140h152')
# Awning on two poles, with a scalloped edge.
b += p('M22 40l10-14h86l10 14z')
b += p('M22 40' + ''.join('q2.65 5 5.3 0' for _ in range(20)))
b += p('M32 40v52M118 40v52')
# The sign: tea, in Gujarati.
b += p('M84 45h30v15h-30z')
b += p('M99 40v5')
b += '<text x="99" y="56.5" text-anchor="middle" font-family="serif" font-size="11" fill="currentColor" stroke="none">ચા</text>\n'
# Counter.
b += p('M26 92h98M30 92v47h90V92')
b += p('M30 104h90M30 116h90M30 128h90', opacity='0.55')
# Stove, and the kettle on it, steaming.
b += p('M42 92v-7h22v7')
b += p('M41 85h24')
b += p('M45 85q-3-15 8-17q11 2 8 17')
b += p('M49 68q4-4 8 0')
b += circle(53, 62.8, 1.2)
b += p('M46 74q-6 2-2 9')
b += p('M60.5 79q8-1 10-10')
b += p('M72 64q-3-4 0-8q3-4 0-8M77 66q-3-4 0-8q3-4 0-8', opacity='0.7')
# Glasses of cutting chai, half full.
for x in (82, 91, 100, 109):
    b += p(f'M{x} 92l-1-10h7l-1 10z')
    b += p(f'M{x - 0.6} 86.5h6.2')
# A bench, and a crate.
b += p('M6 122h20M8 122v17M24 122v17')
b += p('M128 122h18v17h-18zM128 122l18 17M146 122l-18 17', opacity='0.8')
svg('chai', 'A cutting-chai stall: a kettle steaming on its stove, glasses on the counter', b)


# ---- Louis Kahn at IIM Ahmedabad: brick, a great circle, arches tied in concrete ----
walls = 'M20 30h120v110H20z'
hole = 'M100 64a20 20 0 1 0 -40 0a20 20 0 1 0 40 0z'
arches = 'M28 140V110q17-16 34 0v30zM98 140V110q17-16 34 0v30z'
b = ''
b += '<defs><clipPath id="kahn-brick"><path clip-rule="evenodd" d="' + walls + hole + arches + '"/></clipPath></defs>\n'
b += p('M4 140h152')
b += p('M16 30h128M16 25h128v5')
b += p(walls)
# Brick coursing, kept out of the openings.
b += '<g clip-path="url(#kahn-brick)" opacity="0.45" stroke-dasharray="5 2">\n'
b += ''.join(p(f'M20 {y}h120') for y in range(35, 140, 5))
b += '</g>\n'
b += circle(80, 64, 20)
b += circle(80, 64, 22.5, opacity='0.6')
# The arches, each tied across by a concrete beam.
b += p(arches)
b += p('M28 110h34M28 114h34M98 110h34M98 114h34')
b += p('M24 108q21-21 42 0M94 108q21-21 42 0', opacity='0.6')
# Steps up to it, and a neem.
b += p('M64 140v-3h32v3M68 137v-3h24v3')
b += p('M150 140v-30')
b += p('M150 118q-8-2-8-10q-3-8 4-12q2-8 9-5q8-2 9 6q5 5 0 11q-2 7-14 10', opacity='0.8')
svg('kahn', 'Louis Kahn at IIM Ahmedabad: brick walls, a great circle, arches tied in concrete', b)

print('ok')
