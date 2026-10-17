// === GALLERY — "Behind the lens" ===
// The title sits on one line; as you scroll it splits — "Behind" floats up,
// "the lens" floats down — and a frame opens between them, the two words
// coming to rest on its top and bottom edges. The section then pins and the
// photos flip through the frame like an accordion: the current photo folds
// up while the next one rises from below, with a thin gap between them.
//
// One number drives everything: p (0 -> 1), how far you've scrolled through
// the pinned stretch, eased toward the real scroll position each frame.
(function () {
  const root = document.querySelector('.bts');
  if (!root) return;
  const frame = root.querySelector('.bts-frame');
  const slides = [...root.querySelectorAll('.bts-slide')];
  const imgs = slides.map((s) => s.querySelector('img'));
  const top = root.querySelector('.bts-top');
  const bot = root.querySelector('.bts-bot');
  const meta = root.querySelector('.bts-meta');
  const count = root.querySelector('.bts-count b');
  const N = slides.length;

  if (matchMedia('(prefers-reduced-motion: reduce)').matches || N < 2) {
    root.classList.add('is-static');
    imgs.forEach((img) => (img.loading = 'eager'));
    return;
  }

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const seg = (p, a, b) => clamp((p - a) / (b - a));
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const lerp = (a, b, t) => a + (b - a) * t;

  // Scroll budget, in viewport heights: a beat on the single-line title, the
  // frame opening, then one stretch per photo change.
  const HOLD_VH = 25, OPEN_VH = 60, PER_PHOTO_VH = 32;
  const pinVh = HOLD_VH + OPEN_VH + (N - 1) * PER_PHOTO_VH;
  root.style.height = `${pinVh + 100}vh`;
  const A1 = HOLD_VH / pinVh;              // title starts splitting
  const A2 = (HOLD_VH + OPEN_VH) / pinVh;  // frame fully open, accordion begins

  let L;
  function layout() {
    const vw = innerWidth, vh = innerHeight;
    const phone = vw < 760;
    const W = phone ? vw * 0.9 : Math.min(vw * 0.64, 1120);
    const H = phone ? Math.min(W * 0.8, vh * 0.5) : Math.min(W * 0.58, vh * 0.66);
    const wTop = top.offsetWidth, wBot = bot.offsetWidth;
    const space = parseFloat(getComputedStyle(top).fontSize) * 0.28;
    const lineW = wTop + space + wBot;
    L = {
      W, H, gap: phone ? 8 : 10,
      fontH: top.offsetHeight,
      // one line, centred
      top0: { x: -lineW / 2 + wTop / 2, y: 0 },
      bot0: { x: lineW / 2 - wBot / 2, y: 0 },
      // resting on the frame's edges, offset like the reference
      top1: { x: -W * (phone ? 0.16 : 0.2), y: -H / 2 },
      bot1: { x: W * (phone ? 0.12 : 0.14), y: H / 2 },
    };
    meta.style.width = `${W}px`;
    imgs.forEach((img) => (img.style.height = `${H}px`));
  }

  let target = 0, current = 0, drawn = NaN, lastIdx = -1;

  function measure() {
    const r = root.getBoundingClientRect();
    target = clamp(-r.top / (root.offsetHeight - innerHeight));
  }

  function place(el, from, to, t) {
    el.style.transform =
      `translate(-50%, -50%) translate(${lerp(from.x, to.x, t).toFixed(2)}px, ${lerp(from.y, to.y, t).toFixed(2)}px)`;
  }

  function render(p) {
    // 1. Title splits and the frame opens between the words.
    const split = ease(seg(p, A1, A2 * 0.96));
    const open = ease(seg(p, A1 + (A2 - A1) * 0.12, A2));
    place(top, L.top0, L.top1, split);
    place(bot, L.bot0, L.bot1, split);
    const w = lerp(L.W * 0.6, L.W, open);
    const h = L.H * open;
    frame.style.width = `${w}px`;
    frame.style.height = `${h}px`;
    root.classList.toggle('is-open', open > 0.92);
    meta.style.transform = `translate(-50%, ${(h / 2 + L.fontH * 0.55 + 14).toFixed(1)}px)`;

    // 2. Accordion: photo i folds up while photo i+1 rises.
    const q = seg(p, A2, 0.985) * (N - 1);
    const i = Math.min(Math.floor(q), N - 2);
    const f = q - i;
    // Ease within each change so every photo rests full-frame for a moment.
    const fe = ease(clamp((f - 0.12) / 0.76));
    const g = L.gap * Math.min(1, fe / 0.06, (1 - fe) / 0.06);
    const topH = (h - g) * (1 - fe);
    const botH = (h - g) * fe;

    slides.forEach((s, k) => {
      let y, sh, imgY;
      if (k < i) { y = 0; sh = 0; imgY = 0; }
      else if (k === i) {
        y = 0; sh = topH;
        // While the frame opens, the photo is centred in the slit; once open it
        // is pinned to the slide's bottom, so it rides up as the slide folds away.
        imgY = p < A2 ? (h - L.H) / 2 : topH - L.H;
      } else if (k === i + 1) { y = topH + g; sh = botH; imgY = 0; }
      else { y = h; sh = 0; imgY = 0; }
      s.style.top = `${y.toFixed(2)}px`;
      s.style.height = `${Math.max(0, sh).toFixed(2)}px`;
      s.style.visibility = sh > 0.5 ? 'visible' : 'hidden';
      imgs[k].style.top = `${imgY.toFixed(2)}px`;
    });

    const idx = fe > 0.5 ? i + 2 : i + 1;
    if (idx !== lastIdx) { count.textContent = String(idx).padStart(2, '0'); lastIdx = idx; }
  }

  let lastTime = performance.now();
  function tick(now) {
    const dt = (now - lastTime) / 1000;
    lastTime = now;
    current += (target - current) * (1 - Math.exp(-dt * 8.5));
    if (Math.abs(target - current) < 0.0005) current = target;
    if (current !== drawn) { render(current); drawn = current; }
    requestAnimationFrame(tick);
  }

  // Photos further down the accordion load ahead of time so none pops in late —
  // but only once the section is within a couple of screens, not on page load.
  new IntersectionObserver((entries, io) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    imgs.forEach((img) => (img.loading = 'eager'));
    io.disconnect();
  }, { rootMargin: '200% 0px' }).observe(root);

  layout();
  addEventListener('scroll', measure, { passive: true });
  addEventListener('resize', () => { layout(); drawn = NaN; measure(); });
  // Word widths depend on the web font; re-measure once it has loaded.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { layout(); drawn = NaN; });
  measure();
  current = target;
  requestAnimationFrame(tick);
})();
