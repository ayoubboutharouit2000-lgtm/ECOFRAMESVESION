#!/usr/bin/env python3
"""Assemble dist/, the folder that gets published to Netlify.

Only files the site actually references are copied: index.html, the CSS, and every
asset/script reachable from them (followed through JS and CSS too). Everything else in
the project (raw footage, 4K masters, design references, TEAM/) stays out.

Exits non-zero if the page references a file that doesn't exist, so a broken deploy
never goes out.
"""
import glob, os, re, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = 'dist'
BIG_MB = 100  # anything this large is probably an unencoded master that slipped in
PAGES_MAX_BYTES = 25 * 1024 * 1024  # Cloudflare's per-file limit for static assets

os.chdir(ROOT)
shutil.rmtree(DIST, ignore_errors=True)
os.makedirs(DIST)

# attribute values (src=, href=, poster=, data-*=) and quoted/url() strings pointing into assets/js/css,
# written relative or as a full URL on the site (og:image, JSON-LD)
SITE = 'https://ecoframesvision.com/'
PREFIX = r'(?:\./|/|' + re.escape(SITE) + r')?'
PAT_ATTR = re.compile(r'''(?:src|href|poster|data-[\w-]+)\s*=\s*["'](''' + PREFIX + r'''(?:assets|js|css)/[^"'\s>?#]+)''')
PAT_STR = re.compile(r'''["'`(](''' + PREFIX + r'''(?:assets|js|css)/[^"'`)\s?#]+)''')
# every candidate in a srcset="a.webp 800w, b.webp 1600w" list, not just the first
PAT_SRCSET = re.compile(r'''srcset\s*=\s*["']([^"']+)''')

def srcset_refs(text):
    return [c.split()[0].split('?')[0] for s in PAT_SRCSET.findall(text) for c in s.split(',') if c.strip()]

def norm(path):
    return path.removeprefix(SITE).lstrip('./').lstrip('/')

sources = ['index.html'] + glob.glob('css/*.css')
refs, queue = set(sources), list(sources)
while queue:
    text = open(queue.pop(), errors='ignore').read()
    for m in PAT_ATTR.findall(text) + PAT_STR.findall(text) + srcset_refs(text):
        p = norm(m)
        if os.path.isfile(p) and p not in refs:
            refs.add(p)
            if p.endswith(('.js', '.css', '.html')):
                queue.append(p)

for p in sorted(refs):
    os.makedirs(os.path.join(DIST, os.path.dirname(p)), exist_ok=True)
    shutil.copy2(p, os.path.join(DIST, p))

# Root files crawlers fetch directly (incl. the Search Console verification file); nothing links to them.
for p in ('robots.txt', 'sitemap.xml', 'google80340da017fbbcab.html'):
    shutil.copy2(p, os.path.join(DIST, p))

# Netlify defaults every file to max-age=0 (re-checked on each visit). Media can be cached
# for a week: when replacing one, bump its ?v= in index.html (as the hero video does) so
# returning visitors fetch the new file. JS/CSS are cached for a year, so every <script>/<link>
# to them must carry a ?v= (checked below). HTML keeps Netlify's default.
# The 3D logo gets its real type instead of octet-stream. Netlify still won't brotli it
# (checked 2026-10-19), so the .glb ships at full size (~290 KB of it is compressible).
with open(os.path.join(DIST, '_headers'), 'w') as f:
    f.write('/assets/*\n  Cache-Control: public, max-age=604800\n'
            '/js/*\n  Cache-Control: public, max-age=31536000, immutable\n'
            '/css/*\n  Cache-Control: public, max-age=31536000, immutable\n'
            '/assets/images/brand/3d/*\n  Content-Type: model/gltf-binary\n')

unversioned = re.findall(r'''(?:src|href)\s*=\s*["']((?:js|css)/[^"'?]+)["']''', open('index.html').read())
if unversioned:
    print('error: these JS/CSS links need a ?v= (they are cached for a year):')
    for u in unversioned:
        print('  ' + u)
    sys.exit(1)

missing = sorted({m for f in sources for m in PAT_ATTR.findall(open(f, errors='ignore').read()) + srcset_refs(open(f, errors='ignore').read())
                  if not os.path.isfile(norm(m))})
total = sum(os.path.getsize(p) for p in refs)
print(f'dist/: {len(refs)} files, {total / 1e6:.1f} MB')

big = sorted(((os.path.getsize(p) / 1e6, p) for p in refs if os.path.getsize(p) > BIG_MB * 1e6), reverse=True)
for mb, p in big:
    print(f'  warning: {p} is {mb:.0f} MB — compress it for the web before deploying')

# Cloudflare rejects any single static file over 25 MiB, so catch it here rather than mid-upload.
too_big = sorted(p for p in refs if os.path.getsize(p) > PAGES_MAX_BYTES)
if too_big:
    print('error: Cloudflare caps files at 25 MiB; re-encode these (masters go in video-originals/):')
    for p in too_big:
        print(f'  {p} ({os.path.getsize(p) / 1048576:.1f} MiB)')
    sys.exit(1)

if missing:
    print('error: index.html references files that do not exist:')
    for m in missing:
        print('  ' + m)
    sys.exit(1)
