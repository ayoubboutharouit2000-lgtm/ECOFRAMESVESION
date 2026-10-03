// === FOUNDERS — two-card split ===
// The two founders' photos start stacked like a small deck (Ayoub in front,
// Mohamed tucked behind at an angle). As you scroll they slide out from each
// other to the edges, tilt apart and grow into tall portraits, revealing the
// copy between them. While the section is pinned the copy steps through three
// beats (intro -> Ayoub -> Mohamed), and the founder being introduced takes focus.
//
// Everything is driven by one number, p (0 -> 1): how far you have scrolled
// through the section's pinned stretch. It is eased toward the real scroll
// position each frame, so the motion stays smooth even with a jumpy wheel.
(function () {
  const root = document.querySelector('.fsplit');
  if (!root) return;
  const left = root.querySelector('.fsplit-card[data-side="left"]');
  const right = root.querySelector('.fsplit-card[data-side="right"]');
  const beats = [...root.querySelectorAll('.fsplit-beat')];
  const bar = root.querySelector('.fsplit-progress span');

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.classList.add('is-static');
    return;
  }

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const seg = (p, a, b) => clamp((p - a) / (b - a)); // progress through [a, b]
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); // in-out cubic
  const lerp = (a, b, t) => a + (b - a) * t;

  // Timeline (fractions of the pinned scroll).
  const RISE = [0, 0.16];     // the stack rises to centre
  const SPLIT = [0.1, 0.42];  // the cards slide apart, tilt and grow
  const BEATS = [0.3, 0.56, 0.77]; // where each beat of copy takes over

  // How the deck sits at the start: the front card leans left, the one behind
  // it leans right and peeks out a little.
  const STACK = {
    left: { x: -6, y: 0, rot: -3 },  // front card (Ayoub)
    right: { x: 16, y: 8, rot: 5 },  // behind it (Mohamed)
  };

  // Start (stacked) and end (split) geometry for the current viewport, in px.
  function layout() {
    const vw = innerWidth;
    const vh = innerHeight;
    if (vw < 760) {
      // Phones: the split cards share the top half; the copy sits below them.
      const w0 = vw * 0.46;
      const w1 = vw * 0.42;
      return {
        w0, h0: w0 * 1.3, y0: vh * 0.08, yMid: -vh * 0.18, // start near centre so the first screen isn't empty
        w1, h1: vh * 0.4, x1: w1 / 2 + vw * 0.012, y1: -vh * 0.17, tilt: 2, drift: 0.6, // clears the nav
      };
    }
    const w0 = Math.min(vw * 0.24, 340);
    // Split: big portraits that bleed just past the screen edges, like the reference.
    const w1 = Math.max(vw * 0.365, 280);
    return {
      w0, h0: w0 * 1.32, y0: vh * 0.3, yMid: 0,
      w1, h1: vh * 0.9, x1: vw / 2 - w1 / 2 + vw * 0.012, y1: vh * 0.035, tilt: 2.5, drift: 2,
    };
  }

  let L = layout();
  let target = 0;
  let current = 0;
  let lastBeat = -1;

  function measure() {
    const r = root.getBoundingClientRect();
    const pinLength = root.offsetHeight - innerHeight;
    target = clamp(-r.top / pinLength);
  }

  function placeCard(card, side, p) {
    const s = side === 'left' ? -1 : 1;
    const rise = ease(seg(p, ...RISE));
    const split = ease(seg(p, ...SPLIT));
    const hold = seg(p, SPLIT[1], 1); // slow drift while the copy plays

    // Stacked: both cards at the centre, fanned slightly like a deck.
    const st = STACK[side];
    const w = lerp(L.w0, L.w1, split);
    const h = lerp(L.h0, L.h1, split);
    const x = lerp(st.x, s * L.x1, split);
    const y = lerp(lerp(L.y0, L.yMid, rise) + st.y, L.y1, split) - hold * L.drift * 6;
    const rot = lerp(st.rot, s * L.tilt, split) + s * L.drift * hold;
    const scale = 1 + hold * 0.025;

    card.style.width = `${w}px`;
    card.style.height = `${h}px`;
    card.style.transform =
      `translate(-50%, -50%) translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${rot.toFixed(3)}deg) scale(${scale.toFixed(4)})`;
  }

  function render(p) {
    placeCard(left, 'left', p);
    placeCard(right, 'right', p);

    root.classList.toggle('is-split', p >= SPLIT[1] - 0.06);

    // Which beat of copy is showing (none until the cards have mostly parted).
    let beat = -1;
    for (let i = BEATS.length - 1; i >= 0; i--) if (p >= BEATS[i]) { beat = i; break; }
    if (beat !== lastBeat) {
      beats.forEach((b, i) => b.classList.toggle('is-on', i === beat));
      left.classList.toggle('is-dim', beat === 2);
      right.classList.toggle('is-dim', beat === 1);
      lastBeat = beat;
    }
    bar.style.transform = `scaleX(${seg(p, BEATS[0], 0.98).toFixed(4)})`;
  }

  let drawn = NaN;
  let lastTime = performance.now();
  function frame(now) {
    // Time-based easing (~90% of the way in 0.27 s), the same at 60 or 120 Hz.
    const dt = (now - lastTime) / 1000;
    lastTime = now;
    current += (target - current) * (1 - Math.exp(-dt * 8.5));
    if (Math.abs(target - current) < 0.0005) current = target;
    if (current !== drawn) { render(current); drawn = current; } // idle when nothing moves
    requestAnimationFrame(frame);
  }

  addEventListener('scroll', measure, { passive: true });
  addEventListener('resize', () => { L = layout(); measure(); });
  measure();
  current = target; // no catch-up animation if the page loads mid-section
  requestAnimationFrame(frame);
})();
