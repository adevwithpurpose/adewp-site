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

  const N = 120;
  const aspect = mount.clientWidth / Math.max(1, mount.clientHeight);
  const spreadX = 15 * Math.max(1, aspect * 0.85);
  const positions = new Float32Array(N * 3);
  const pts = [];
  for (let i = 0; i < N; i++) {
    const p = new THREE.Vector3(
      (Math.random() - 0.5) * spreadX * 2,
      (Math.random() - 0.5) * 17,
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
  let lastFrame = 0;
  function tick(now = 0) {
    raf = requestAnimationFrame(tick);
    if (document.hidden || now - lastFrame < 32) return;
    lastFrame = now;
    const t = clock.getElapsedTime();
    group.rotation.y = t * 0.05 + mx * 0.35 + scrollT * 1.1;
    group.rotation.x = my * 0.2 + scrollT * 0.25;
    camera.position.z = 16 - scrollT * 6;
    group.position.y = Math.sin(t * 0.4) * 0.25;
    renderer.render(scene, camera);
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

    let loaded = false;
    let inView = false;
    let slowTimer = 0;
    const status = document.createElement('span');
    status.className = 'demo-status';
    status.setAttribute('role', 'status');
    slot.appendChild(status);
    const clearStatus = () => {
      clearTimeout(slowTimer); slowTimer = 0;
      slot.classList.remove('is-loading');
      status.textContent = '';
    };
    // Only say "loading" while playback is genuinely waiting for data, and say so honestly if it drags.
    const showBuffering = () => {
      if (v.paused || v.readyState >= 3) return;
      slot.classList.add('is-loading');
      status.textContent = 'Loading demo\u2026';
      if (!slowTimer) slowTimer = setTimeout(() => {
        slowTimer = 0;
        if (!v.paused && v.readyState < 3) status.textContent = 'Slow connection. Still buffering\u2026';
      }, 6000);
    };
    const loadVideo = () => {
      if (loaded) return;
      loaded = true;
      v.preload = 'auto'; // the source only attaches in view, so fetch it fully (iOS ignores "none" until a gesture)
      if (v.dataset.src) v.src = v.dataset.src;
      v.load();
    };
    v.addEventListener('canplay', () => { slot.classList.add('is-ready'); slot.classList.remove('is-error'); clearStatus(); });
    v.addEventListener('waiting', showBuffering);
    v.addEventListener('playing', () => { slot.classList.remove('is-error'); clearStatus(); });
    v.addEventListener('pause', () => { if (!slot.classList.contains('is-error')) clearStatus(); });
    v.addEventListener('error', () => { clearStatus(); slot.classList.add('is-error', 'is-paused'); status.textContent = 'Video unavailable. Tap play to retry.'; loaded = false; });
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

    // Scrolled past a video that is still downloading: abort it so it cannot compete for
    // bandwidth with the video now on screen. Fully buffered videos are kept.
    const releaseIfPartial = () => {
      if (!loaded || !v.dataset.src || !v.src) return;
      const b = v.buffered;
      const done = b.length && isFinite(v.duration) && b.end(b.length - 1) >= v.duration - 0.5;
      if (done) return;
      v.removeAttribute('src');
      v.load();
      loaded = false;
      clearStatus();
      slot.classList.remove('is-ready');
      slot.classList.add('is-paused');
    };

    // Frame watchdog: a video whose clock runs while no new picture is presented looks frozen
    // (timeline bar moves, image stuck). Presented frames are counted with requestVideoFrameCallback
    // (static scenes still present frames); after 3s with none, reattach the source at the same time.
    let lastPresented = performance.now(), recoveries = 0;
    if (v.requestVideoFrameCallback) {
      const onFrame = () => { lastPresented = performance.now(); v.requestVideoFrameCallback(onFrame); };
      v.requestVideoFrameCallback(onFrame);
      setInterval(() => {
        if (v.paused || document.hidden || !v.src || v.readyState < 3 || recoveries >= 3) { lastPresented = performance.now(); return; }
        if (performance.now() - lastPresented < 3000) return;
        recoveries++;
        lastPresented = performance.now();
        const t = v.currentTime, wasMuted = v.muted;
        v.load();
        v.addEventListener('loadedmetadata', () => { try { v.currentTime = t; } catch (e) {} v.muted = wasMuted; const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}); }, { once: true });
      }, 1000);
    }

    const tryPlay = () => {
      loadVideo();
      const p = v.play();
      if (p && p.catch) p.catch(() => { slot.classList.add('is-paused'); if (!slot.classList.contains('is-error')) clearStatus(); });
    };

    // No source is attached until the video itself enters the viewport.
    // Observing the video (not the tall service row) prevents early downloads.
    const io = new IntersectionObserver(([e]) => {
      inView = e.isIntersecting && e.intersectionRatio > 0;
      if (inView) {
        loadVideo();
        if (!reduced && !document.hidden && !navigator.connection?.saveData) tryPlay();
      } else if (!modalOpen && document.fullscreenElement !== v) {
        v.pause(); v.muted = true;
        releaseIfPartial();
      }
    }, { threshold: [0, 0.05], rootMargin: '0px' });
    io.observe(v);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { v.pause(); v.muted = true; }
      else if (inView && !reduced && !navigator.connection?.saveData) tryPlay();
    });

    // tap the video: play if paused, otherwise open fullscreen (sound stays on the buttons)
    const exitCleanup = () => {
      v.controls = false;
      v.muted = true;
      slot.classList.remove('is-fullscreen');
    };
    const enterFullscreen = async () => {
      let native = false;
      if (v.requestFullscreen) {
        try { await v.requestFullscreen(); native = true; }
        catch (e) { native = false; } // refused (iframe policy, browser rules) - fall through to modal
      } else if (v.webkitEnterFullscreen) { // iOS Safari native player
        try { v.webkitEnterFullscreen(); native = true; } catch (e) { native = false; }
      }
      if (!native) { openExpanded(); return; } // larger view still delivered, inside the page
      slot.classList.add('is-fullscreen');
      v.controls = true;
      v.muted = false;
      tryPlay();
      // landscape where the platform supports it (Chrome/Android); elsewhere the viewer rotates
      try {
        if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape');
      } catch (e) { /* unsupported or refused - fine */ }
    };

    // expanded modal: accessible larger view when native fullscreen is unavailable
    let modalOpen = false;
    const openExpanded = () => {
      if (modalOpen) return;
      modalOpen = true;
      const prevFocus = document.activeElement;
      const home = v.parentNode, next = v.nextSibling;
      const overlay = document.createElement('div');
      overlay.className = 'demo-modal';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', 'Expanded demo video');
      const stage = document.createElement('div');
      stage.className = 'demo-modal-stage';
      const closeBtn = document.createElement('button');
      closeBtn.className = 'demo-modal-close';
      closeBtn.type = 'button';
      closeBtn.setAttribute('aria-label', 'Close expanded video');
      closeBtn.innerHTML = '&times;';
      // anchor the modal to the video being expanded: File previews and some
      // embeds give fixed elements a document-height viewport, so fixed
      // centering can land off-screen; expanding in place is always visible
      const before = v.getBoundingClientRect();
      stage.appendChild(v);
      stage.appendChild(closeBtn);
      overlay.appendChild(stage);
      overlay.style.position = 'absolute';
      overlay.style.left = '0'; overlay.style.right = '0'; overlay.style.top = '0';
      const docTop = before.top + (window.scrollY || 0);
      const scrollY = window.scrollY || 0;
      const viewH = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      const saneViewport = viewH < 2500; // File-preview iframes report document-height viewports
      overlay.style.height = Math.max(docTop + before.height, scrollY + viewH) + 240 + 'px';
      stage.style.position = 'absolute';
      stage.style.left = '50%';
      stage.style.transform = 'translateX(-50%)';
      // fit the expanded video inside the visible window on normal viewports
      const fitW = saneViewport ? Math.min(window.innerWidth * 0.92, 1120, (viewH - 140) * 16 / 9) : Math.min(window.innerWidth * 0.92, 1120);
      stage.style.width = Math.max(280, Math.round(fitW)) + 'px';
      document.body.appendChild(overlay);
      const stageH = stage.getBoundingClientRect().height || before.height;
      let stageTop = docTop + before.height / 2 - stageH / 2;
      if (saneViewport) {
        stageTop = Math.max(scrollY + 56, Math.min(stageTop, scrollY + viewH - stageH - 16));
      } else {
        stageTop = Math.max(60, Math.min(stageTop, overlay.offsetHeight - stageH - 12));
      }
      stage.style.top = Math.round(stageTop) + 'px';
      document.documentElement.classList.add('modal-open');
      v.controls = true;
      v.muted = false;
      tryPlay();
      closeBtn.focus();
      const close = () => {
        overlay.removeEventListener('click', onOverlayClick);
        window.removeEventListener('keydown', onKey);
        stage.removeChild(v);
        home.insertBefore(v, next);
        overlay.remove();
        document.documentElement.classList.remove('modal-open');
        v.controls = false;
        v.muted = true;
        modalOpen = false;
        if (prevFocus && prevFocus.focus) try { prevFocus.focus(); } catch (e) {}
      };
      const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); close(); } };
      const onOverlayClick = (e) => { if (e.target === overlay) close(); };
      window.addEventListener('keydown', onKey);
      overlay.addEventListener('click', onOverlayClick);
      closeBtn.addEventListener('click', (e) => { e.stopPropagation(); close(); });
    };
    document.addEventListener('fullscreenchange', () => {
      if (document.fullscreenElement !== v && slot.classList.contains('is-fullscreen')) {
        if (screen.orientation && screen.orientation.unlock) { try { screen.orientation.unlock(); } catch (e) {} }
        exitCleanup();
      }
    });
    v.addEventListener('webkitendfullscreen', exitCleanup);
    v.addEventListener('click', () => {
      if (v.paused) { tryPlay(); return; }
      enterFullscreen();
    });

    // explicit controls: a blocked/paused start or the sound button = gesture, so sound on
    const startWithSound = (e) => {
      e.stopPropagation();
      if (v.paused) { v.muted = false; tryPlay(); }
      else { v.muted = !v.muted; }
    };
    if (playBtn) playBtn.addEventListener('click', startWithSound);
    if (soundBtn) soundBtn.addEventListener('click', startWithSound);
    const expandBtn = slot.querySelector('.demo-expand');
    if (expandBtn) expandBtn.addEventListener('click', (e) => { e.stopPropagation(); if (v.paused) tryPlay(); enterFullscreen(); });
  });
}

/* ---------- easter egg: type "sudo" ---------- */
function initSudoEgg() {
  let buf = '';
  let toast = null;
  let timer = 0;
  window.addEventListener('keydown', (e) => {
    if (e.key && e.key.length === 1) {
      buf = (buf + e.key.toLowerCase()).slice(-8);
      if (buf.endsWith('sudo')) {
        if (!toast) {
          toast = document.createElement('div');
          toast.className = 'sudo-toast';
          toast.setAttribute('role', 'status');
          toast.textContent = 'permission granted - this page runs on vanilla JS, Three.js and one very patient developer';
          document.body.appendChild(toast);
        }
        toast.classList.add('is-on');
        clearTimeout(timer);
        timer = setTimeout(() => toast.classList.remove('is-on'), 3600);
        buf = '';
      }
    }
  }, { passive: true });
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

/* ---------- busywork estimator: pure arithmetic on the visitor's own numbers ---------- */
function initBusywork() {
  const root = document.querySelector('[data-bw]');
  if (!root) return;
  const grid = root.querySelector('[data-grid]');
  const cells = [];
  for (let i = 0; i < 40; i++) { const s = document.createElement('span'); s.style.transitionDelay = reduced ? '0ms' : (i * 12) + 'ms'; grid.appendChild(s); cells.push(s); }
  const val = (k) => Number(root.querySelector('[data-in="' + k + '"]').value);
  const yearEl = root.querySelector('[data-num="year"]');
  const line = root.querySelector('[data-line]');
  let shown = 0, raf = 0;
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  const countTo = (target) => {
    cancelAnimationFrame(raf);
    if (reduced) { shown = target; yearEl.textContent = fmt(target); return; }
    const from = shown, t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / 500);
      shown = from + (target - from) * (1 - Math.pow(1 - p, 3));
      yearEl.textContent = fmt(shown);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  };
  const update = () => {
    const people = val('people'), hours = val('hours'), share = val('share');
    root.querySelector('[data-out="people"]').textContent = people;
    root.querySelector('[data-out="hours"]').textContent = hours;
    root.querySelector('[data-out="share"]').textContent = share + '%';
    const back = hours * share / 100;           // hours per person per week
    const week = back * people;                 // team hours per week
    const year = week * 48;                     // 48 working weeks
    const busyCells = Math.min(40, hours);
    const sysCells = Math.min(busyCells, Math.round(busyCells * share / 100));
    cells.forEach((c, i) => { c.className = i < sysCells ? 'sys' : (i < busyCells ? 'busy' : ''); });
    countTo(year);
    const weeks = year / 40;
    line.textContent = (week >= 10 ? fmt(week) : week.toFixed(1)) + ' hours a week across ' + people + (people === 1 ? ' person' : ' people') + ', about ' + (weeks >= 10 ? fmt(weeks) : weeks.toFixed(1)) + ' working weeks of 40 hours a year.';
  };
  root.addEventListener('input', update);
  update();
}

/* ---------- booking calendar: embedded only when the contact section nears view ---------- */
/* An iframe "load" event also fires for browser error pages, so the calendar only counts as
   usable once cal.com itself reports that availability loaded. Otherwise it collapses to a
   compact fallback card with the direct booking link. */
function initCalEmbed() {
  const box = document.querySelector('[data-cal-embed]');
  if (!box) return;
  const note = box.querySelector('.cal-embed-note');
  const BOOK = 'https://cal.com/adevwithpurpose/hello-with-a-dev';
  let started = false, ready = false, failed = false, timer = 0, slowNote = 0;
  const fail = () => {
    if (ready || failed) return;
    failed = true;
    clearTimeout(timer); clearTimeout(slowNote);
    box.querySelectorAll('.cal-host').forEach((n) => n.remove());
    box.classList.remove('is-loading');
    box.classList.add('is-failed');
    note.hidden = false;
    note.innerHTML = '<span class="cal-fail-msg">The booking calendar could not load in this browser.</span><a class="btn btn-primary cal-fallback-btn" href="' + BOOK + '" target="_blank" rel="noopener">Open the booking page</a>';
  };
  const markReady = () => {
    if (ready || failed) return;
    ready = true;
    clearTimeout(timer); clearTimeout(slowNote);
    box.classList.remove('is-loading');
    box.classList.add('is-ready', 'is-loaded');
    note.hidden = true;
  };
  const start = () => {
    if (started) return;
    started = true;
    box.classList.add('is-loading');
    note.hidden = false;
    note.innerHTML = 'Loading the calendar\u2026 <a href="' + BOOK + '" target="_blank" rel="noopener">Open the booking page</a> instead.';
    // Cal's official inline embed. embed.js is the same file on cal.com and app.cal.com; some
    // networks/browsers block one host's script, so try cal.com first, then app.cal.com, then a
    // plain frame of the booking page. Readiness is always Cal's own event or a validated Cal message.
    const host = document.createElement('div');
    host.className = 'cal-host';
    box.appendChild(host);
    const w = window;
    const attempt = (origin) => {
      delete w.Cal;
      host.innerHTML = '';
      w.Cal = function () {
        const cal = w.Cal, ar = arguments;
        if (!cal.loaded) {
          cal.ns = {}; cal.q = cal.q || [];
          const sc = document.createElement('script');
          sc.src = origin + '/embed/embed.js';
          sc.async = true;
          sc.onerror = () => {
            if (ready || failed) return;
            if (origin === 'https://cal.com') attempt('https://app.cal.com');
            else fail();
          };
          document.head.appendChild(sc);
          cal.loaded = true;
        }
        (cal.q = cal.q || []).push(ar);
      };
      w.Cal('init', { origin });
      w.Cal('inline', { elementOrSelector: host, calLink: 'adevwithpurpose/hello-with-a-dev', layout: 'month_view', config: { theme: 'dark' } });
      w.Cal('ui', { theme: 'dark', layout: 'month_view' });
      // official Cal embed events: linkReady / linkFailed (cal.com/help/embedding/embed-events)
      w.Cal('on', { action: 'linkReady', callback: markReady });
      w.Cal('on', { action: 'linkFailed', callback: (ev) => { fail(); } });
    };
    attempt('https://cal.com');
    // The booker is a heavy app (about 80 requests). On a slow connection it can take well over
    // 20s, so do not give up early: say it is slow, keep loading, and only give up after 90s.
    slowNote = setTimeout(() => { if (!ready && !failed) note.innerHTML = 'Taking longer than expected\u2026 <a href="' + BOOK + '" target="_blank" rel="noopener">Open the booking page</a> instead.'; }, 12000);
    timer = setTimeout(() => fail(), 90000);
  };
  if (!('IntersectionObserver' in window)) { fail(); return; }
  const io = new IntersectionObserver((es) => {
    if (es.some((e) => e.isIntersecting)) { io.disconnect(); start(); }
  }, { rootMargin: '0px 0px 500px 0px' });
  io.observe(box);
}

if ('requestIdleCallback' in window) requestIdleCallback(() => initHero(), { timeout: 2000 });
else setTimeout(initHero, 600);
initReveals();
initHeader();
initCopyAddr();
initDemoVideos();
initCalEmbed();
initBusywork();
initSudoEgg();
