/* A Dev With Purpose - v5 motion bootstrap (ES module).
   Lean: Three.js hero constellation (desktop, motion-allowed) + IO reveals +
   header state + copy-address + integrated demo players (muted autoplay in view, tap for sound).
   No GSAP. Static page fully readable without JS. */

document.documentElement.classList.add('js');

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const wide = window.matchMedia('(min-width: 900px)').matches;

/* ---------- Three.js hero: agent constellation (desktop only) ---------- */
async function initHero() {
  if (reduced || !wide) return;
  const mount = document.getElementById('hero-canvas');
  if (!mount) return;
  let THREE;
  try {
    THREE = await import('./vendor/three.module.min.js');
  } catch (e) { return; } // static fallback stays visible

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 100);
  camera.position.z = 16;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(mount.clientWidth, mount.clientHeight);
  mount.appendChild(renderer.domElement);

  const N = 90;
  const positions = new Float32Array(N * 3);
  const pts = [];
  for (let i = 0; i < N; i++) {
    const p = new THREE.Vector3(
      (Math.random() - 0.5) * 26,
      (Math.random() - 0.5) * 15,
      (Math.random() - 0.5) * 8
    );
    pts.push(p);
    positions.set([p.x, p.y, p.z], i * 3);
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const sc = document.createElement('canvas'); sc.width = sc.height = 64;
  const sg = sc.getContext('2d');
  const grad = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(140,255,205,0.85)');
  grad.addColorStop(1, 'rgba(99,102,241,0)');
  sg.fillStyle = grad; sg.fillRect(0, 0, 64, 64);
  const sprite = new THREE.CanvasTexture(sc);
  const points = new THREE.Points(pGeo, new THREE.PointsMaterial({
    color: 0x818cf8, size: 0.55, map: sprite, transparent: true, opacity: 0.95,
    sizeAttenuation: true, blending: THREE.AdditiveBlending, depthWrite: false
  }));

  const linePos = [];
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
    if (pts[i].distanceTo(pts[j]) < 4.6) linePos.push(pts[i].x, pts[i].y, pts[i].z, pts[j].x, pts[j].y, pts[j].z);
  }
  const lGeo = new THREE.BufferGeometry();
  lGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(linePos), 3));
  const lines = new THREE.LineSegments(lGeo, new THREE.LineBasicMaterial({
    color: 0x6366f1, transparent: true, opacity: 0.22,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));

  const group = new THREE.Group();
  group.add(points); group.add(lines);
  scene.add(group);

  let mx = 0, my = 0;
  window.addEventListener('pointermove', (e) => {
    mx = (e.clientX / window.innerWidth - 0.5);
    my = (e.clientY / window.innerHeight - 0.5);
  }, { passive: true });

  let scrollT = 0;
  function onScroll() {
    const h = window.innerHeight;
    scrollT = Math.min(1, Math.max(0, window.scrollY / h));
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const clock = new THREE.Clock();
  let raf = 0;
  function tick() {
    const t = clock.getElapsedTime();
    group.rotation.y = t * 0.05 + mx * 0.35 + scrollT * 1.1;
    group.rotation.x = my * 0.2 + scrollT * 0.25;
    camera.position.z = 16 - scrollT * 6;
    group.position.y = Math.sin(t * 0.4) * 0.25;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }
  tick();

  const io = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) { if (!raf) tick(); }
    else { cancelAnimationFrame(raf); raf = 0; }
  });
  io.observe(mount);

  window.addEventListener('resize', () => {
    camera.aspect = mount.clientWidth / mount.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(mount.clientWidth, mount.clientHeight);
  });
}

/* ---------- reveal on scroll ---------- */
function initReveals() {
  if (reduced) return;
  const targets = document.querySelectorAll('[data-reveal], [data-reveal-group] > *');
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  targets.forEach((el, i) => {
    el.style.transitionDelay = `${Math.min((i % 6) * 60, 300)}ms`;
    io.observe(el);
  });
}

/* ---------- header state ---------- */
function initHeader() {
  const header = document.querySelector('[data-header]');
  if (!header) return;
  const set = () => header.toggleAttribute('data-scrolled', window.scrollY > 24);
  window.addEventListener('scroll', set, { passive: true });
  set();
}

/* ---------- demo videos: muted autoplay in view, tap for sound ---------- */
function initDemoVideos() {
  const slots = document.querySelectorAll('[data-demo]');
  if (!slots.length) return;
  slots.forEach((slot) => {
    const v = slot.querySelector('video');
    if (!v) return;
    const soundBtn = slot.querySelector('.demo-sound');
    const playBtn = slot.querySelector('.demo-play');

    v.addEventListener('canplay', () => slot.classList.add('is-ready'), { once: true });
    if (v.readyState >= 3) slot.classList.add('is-ready');

    const syncPaused = () => slot.classList.toggle('is-paused', v.paused);
    const syncSound = () => {
      slot.classList.toggle('is-sound', !v.muted);
      if (soundBtn) soundBtn.setAttribute('aria-pressed', String(!v.muted));
    };
    v.addEventListener('play', syncPaused);
    v.addEventListener('pause', syncPaused);
    v.addEventListener('volumechange', syncSound);
    syncPaused(); syncSound();

    const tryPlay = () => {
      const p = v.play();
      if (p && p.catch) p.catch(() => slot.classList.add('is-paused'));
    };

    // autoplay muted while in view; pause (and re-mute) when scrolled away
    if (!reduced) {
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (e.isIntersecting) { tryPlay(); }
          else if (!v.paused) { v.pause(); v.muted = true; }
        }
      }, { threshold: 0.25 });
      io.observe(slot);
    }

    // tap the video: play if paused, otherwise toggle sound
    v.addEventListener('click', () => {
      if (v.paused) { tryPlay(); return; }
      v.muted = !v.muted;
    });

    // explicit controls: a blocked/paused start or the sound button = gesture, so sound on
    const startWithSound = (e) => {
      e.stopPropagation();
      if (v.paused) { v.muted = false; tryPlay(); }
      else { v.muted = !v.muted; }
    };
    if (playBtn) playBtn.addEventListener('click', startWithSound);
    if (soundBtn) soundBtn.addEventListener('click', startWithSound);
  });
}

/* ---------- copyable address ---------- */
function initCopyAddr() {
  document.querySelectorAll('.copy-addr').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const addr = btn.getAttribute('data-copy') || btn.textContent.trim();
      try {
        await navigator.clipboard.writeText(addr);
        btn.setAttribute('data-copied', '');
        const old = btn.textContent;
        btn.textContent = 'copied';
        setTimeout(() => { btn.removeAttribute('data-copied'); btn.textContent = old; }, 1400);
      } catch (e) {
        const r = document.createRange(); r.selectNodeContents(btn);
        const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
      }
    });
  });
}

initHero();
initReveals();
initHeader();
initCopyAddr();
initDemoVideos();
