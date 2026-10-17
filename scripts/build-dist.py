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

os.chdir(ROOT)
shutil.rmtree(DIST, ignore_errors=True)
os.makedirs(DIST)

# attribute values (src=, href=, poster=, data-*=) and quoted/url() strings pointing into assets/js/css
PAT_ATTR = re.compile(r'''(?:src|href|poster|data-[\w-]+)\s*=\s*["']((?:\./|/)?(?:assets|js|css)/[^"'\s>?#]+)''')
PAT_STR = re.compile(r'''["'`(]((?:\./|/)?(?:assets|js|css)/[^"'`)\s?#]+)''')
# every candidate in a srcset="a.webp 800w, b.webp 1600w" list, not just the first
PAT_SRCSET = re.compile(r'''srcset\s*=\s*["']([^"']+)''')

def srcset_refs(text):
    return [c.split()[0].split('?')[0] for s in PAT_SRCSET.findall(text) for c in s.split(',') if c.strip()]

def norm(path):
    return path.lstrip('./').lstrip('/')

# every page of the site; assets are found by following what each one references
sources = ['index.html', 'event-videographer-marrakech/index.html'] + glob.glob('css/*.css')
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
# returning visitors fetch the new file. HTML/JS/CSS keep Netlify's default.
with open(os.path.join(DIST, '_headers'), 'w') as f:
    f.write('/assets/*\n  Cache-Control: public, max-age=604800\n')

missing = sorted({m for f in sources for m in PAT_ATTR.findall(open(f, errors='ignore').read()) + srcset_refs(open(f, errors='ignore').read())
                  if not os.path.isfile(norm(m))})
total = sum(os.path.getsize(p) for p in refs)
print(f'dist/: {len(refs)} files, {total / 1e6:.1f} MB')

big = sorted(((os.path.getsize(p) / 1e6, p) for p in refs if os.path.getsize(p) > BIG_MB * 1e6), reverse=True)
for mb, p in big:
    print(f'  warning: {p} is {mb:.0f} MB — compress it for the web before deploying')

if missing:
    print('error: index.html references files that do not exist:')
    for m in missing:
        print('  ' + m)
    sys.exit(1)
