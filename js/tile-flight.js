// === TILE FLIGHT — statement -> Showcase ===
// The little footage tiles set into the "Made by people who love the craft"
// sentence break out of the text as the Showcase scrolls in, tumble down and
// land in the image window of the Showcase card for the film they came from
// (data-fly-to names that film). While a tile is in the air its card's window
// waits empty; the photo fades back in as the tile settles.
//
// Scrubbed by scroll, so it plays backwards too: scroll up and the tiles lift
// out of the cards and return to their words.
(function () {
  const tiles = [...document.querySelectorAll('.ink-tile[data-fly-to]')];
  const stage = document.querySelector('.scatter-stage');
  if (!tiles.length || !stage || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); // in-out cubic

  // Flight window, in viewport heights of the stage's top edge: take-off as it
  // enters the bottom of the screen, every tile landed by the time it is 30% down.
  const START = 1, END = 0.3;
  const STAGGER = 0.07; // each tile leaves a little after the one before
  // Each tile's own timeline: it flies for the first 78%, comes to rest on its
  // card, then holds still for the rest while it dissolves into the photo, so
  // the two images never slide over each other.
  const ARRIVE = 0.78;
  const smooth = (t) => t * t * (3 - 2 * t); // smoothstep

  const layer = document.createElement('div');
  layer.className = 'fly-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);

  const flights = tiles.map((tile, i) => {
    const btn = stage.querySelector(`.scatter-btn[data-video$="/${tile.dataset.flyTo}.mp4"]`);
    if (!btn) return null;
    const win = btn.querySelector('.scatter-imgwrap');
    const el = document.createElement('div');
    el.className = 'fly-tile';
    const video = tile.querySelector('video').cloneNode();
    video.removeAttribute('data-tile');
    video.preload = 'auto';
    el.appendChild(video);
    layer.appendChild(el);
    return {
      tile, win, el, video,
      img: win.querySelector('img'),
      tilt0: parseFloat(tile.style.getPropertyValue('--tilt')) || 0,
      tilt1: parseFloat(btn.closest('.scatter-card').style.getPropertyValue('--rot')) || 0,
      spin: i % 2 ? -1 : 1,
      state: 'home',
      px: NaN, py: NaN, blur: 0, // last drawn position + current motion blur
    };
  }).filter(Boolean);
  if (!flights.length) return;

  const lead = STAGGER * (flights.length - 1);

  function setState(f, state) {
    if (f.state === state) return;
    f.state = state;
    f.px = f.py = NaN; f.blur = 0;
    f.el.style.display = state === 'air' ? 'block' : 'none';
    f.tile.style.visibility = state === 'home' ? '' : 'hidden';
    if (state === 'air') f.video.play().catch(() => {});
    else f.video.pause();
    if (state === 'home') f.img.style.opacity = '';
    if (state === 'landed') f.img.style.opacity = '1';
  }

  // Motion blur: a tile blurs in proportion to its speed, so it smears while
  // it rushes and sharpens as it slows to land.
  const BLUR_PER_PX_S = 0.0035, MAX_BLUR = 5;

  function render(q, dt) {
    const vh = innerHeight;
    let flying = false;

    flights.forEach((f, i) => {
      const t = clamp((q - i * STAGGER) / (1 - lead));
      if (t <= 0) return setState(f, 'home');
      if (t >= 1) return setState(f, 'landed');
      setState(f, 'air');
      flying = true;

      // Centres come from the bounding boxes (unaffected by rotation); sizes
      // from offsetWidth/Height, which ignore the tilt that inflates a box.
      const a = f.tile.getBoundingClientRect(), b = f.win.getBoundingClientRect();
      const e = ease(clamp(t / ARRIVE));
      const land = clamp((t - ARRIVE) / (1 - ARRIVE));
      const w = lerp(f.tile.offsetWidth, f.win.offsetWidth, e);
      const h = lerp(f.tile.offsetHeight, f.win.offsetHeight, e);
      const x = lerp(a.left + a.width / 2, b.left + b.width / 2, e) - w / 2;
      const y = lerp(a.top + a.height / 2, b.top + b.height / 2, e) - h / 2 - Math.sin(Math.PI * e) * vh * 0.05;
      const rot = lerp(f.tilt0, f.tilt1, e) + Math.sin(Math.PI * e) * 22 * f.spin;
      const r = lerp(f.tile.offsetWidth * 0.28, 12, e);

      f.el.style.width = `${w.toFixed(1)}px`;
      f.el.style.height = `${h.toFixed(1)}px`;
      f.el.style.borderRadius = `${r.toFixed(1)}px`;
      f.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${rot.toFixed(2)}deg)`;
      const speed = Number.isNaN(f.px) || dt <= 0 ? 0 : Math.hypot(x - f.px, y - f.py) / dt;
      f.px = x; f.py = y;
      f.blur += (Math.min(MAX_BLUR, speed * BLUR_PER_PX_S) - f.blur) * 0.35; // soften on/off
      f.el.style.filter = f.blur > 0.3 ? `blur(${f.blur.toFixed(2)}px)` : '';
      // touchdown: once at rest, the photo comes up under the tile, then the
      // tile melts away on top of it (staggered so the pair never dips dark)
      f.img.style.opacity = smooth(clamp(land / 0.7)).toFixed(3);
      f.el.style.opacity = (1 - smooth(clamp((land - 0.3) / 0.7))).toFixed(3);
    });
    return flying;
  }

  // Progress eases toward the real scroll position each frame (time-based, the
  // same at 60 or 120 Hz), so a jumpy mouse wheel still gives a smooth flight.
  // Keep drawing while catching up or while a tile is airborne, since the
  // cards it is heading for float and settle on their own.
  const target = () => clamp((START - stage.getBoundingClientRect().top / innerHeight) / (START - END));
  let current = target(), raf = 0, last = 0;
  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 1 / 60;
    last = now;
    const goal = target();
    current += (goal - current) * (1 - Math.exp(-dt * 6));
    if (Math.abs(goal - current) < 0.0005) current = goal;
    const flying = render(current, dt);
    if (flying || current !== goal) raf = requestAnimationFrame(tick);
    else { raf = 0; last = 0; }
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', kick);
  kick();
})();
