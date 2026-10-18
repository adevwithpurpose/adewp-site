/* A Dev With Purpose - motion bootstrap (ES module).
   Progressive enhancement: no JS / reduced-motion / mobile = readable static page.
   Desktop: GSAP pinned scenes + lazy Three.js hero (imported only when used). */

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

  // nodes
  const N = 70;
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
  const points = new THREE.Points(pGeo, new THREE.PointsMaterial({
    color: 0x4ade80, size: 0.14, transparent: true, opacity: 0.9, sizeAttenuation: true
  }));

  // edges between near nodes
  const linePos = [];
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
    if (pts[i].distanceTo(pts[j]) < 4.2) linePos.push(pts[i].x, pts[i].y, pts[i].z, pts[j].x, pts[j].y, pts[j].z);
  }
  const lGeo = new THREE.BufferGeometry();
  lGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(linePos), 3));
  const lines = new THREE.LineSegments(lGeo, new THREE.LineBasicMaterial({
    color: 0x22d3ee, transparent: true, opacity: 0.16
  }));

  const group = new THREE.Group();
  group.add(points); group.add(lines);
  scene.add(group);

  let mx = 0, my = 0;
  window.addEventListener('pointermove', (e) => {
    mx = (e.clientX / window.innerWidth - 0.5);
    my = (e.clientY / window.innerHeight - 0.5);
  }, { passive: true });

  let scrollT = 0; // 0 = top of hero, 1 = hero scrolled past
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
    camera.position.z = 16 - scrollT * 6; // dive into the network on scroll
    group.position.y = Math.sin(t * 0.4) * 0.25;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }
  tick();

  // pause when hero off-screen (battery/perf)
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

/* ---------- GSAP scenes ---------- */
function initMotion() {
  if (reduced || !window.gsap) return;
  gsap.registerPlugin(ScrollTrigger);

  // hero content intro
  gsap.from('.hero-content > *', { y: 28, autoAlpha: 0, duration: 0.9, stagger: 0.12, ease: 'power3.out', delay: 0.15 });

  if (wide) {
    // pinned scenes: pin the scene, scrub its internal timeline
    document.querySelectorAll('.scene').forEach((sceneEl) => {
      const pin = sceneEl.querySelector('.scene-pin');
      const tl = gsap.timeline({
        scrollTrigger: { trigger: sceneEl, start: 'top top', end: '+=140%', pin: pin, scrub: 0.6 }
      });
      tl.from(sceneEl.querySelector('.scene-copy'), { y: 40, autoAlpha: 0, ease: 'power2.out' }, 0);

      if (sceneEl.id === 'scene-memory') {
        const frags = sceneEl.querySelectorAll('[data-frag]');
        const status = sceneEl.querySelector('[data-memory-status]');
        tl.from(frags, { y: 18, autoAlpha: 0, stagger: 0.08 }, 0.1)
          .to(frags, { opacity: 0.15, stagger: 0.05, duration: 0.4 }, 0.9)          // the forgetting
          .add(() => status.classList.remove('ok'), 0.9)
          .to(frags, { opacity: 1, stagger: 0.08, duration: 0.5 }, 1.6)             // memory restored
          .add(() => { frags.forEach(f => f.classList.add('lit')); status.textContent = 'memory restored after restart'; status.classList.add('ok'); }, 1.7);
      }

      if (sceneEl.id === 'scene-auto') {
        const stages = sceneEl.querySelectorAll('[data-stage]');
        const token = sceneEl.querySelector('[data-token]');
        const track = sceneEl.querySelector('.pipe-track');
        const w = () => track.clientWidth - 10;
        tl.from(stages, { y: 16, autoAlpha: 0, stagger: 0.1 }, 0.1);
        for (let i = 0; i < 4; i++) {
          tl.to(token, { x: () => (w() / 3) * i, duration: 0.5, ease: 'power1.inOut' }, 0.6 + i * 0.55)
            .add(() => stages.forEach((s, j) => s.classList.toggle('lit', j <= i)), 0.6 + i * 0.55);
        }
        tl.from(sceneEl.querySelector('[data-pipe-log]'), { autoAlpha: 0 }, 2.8);
      }

      if (sceneEl.id === 'scene-dev') {
        const lines = sceneEl.querySelectorAll('[data-devline]');
        tl.from(sceneEl.querySelector('.dev-window'), { y: 30, autoAlpha: 0 }, 0.1)
          .from(lines, { autoAlpha: 0, x: -14, stagger: 0.35 }, 0.5);
      }
    });

    // chat finale: bubbles type in on enter
    gsap.from('[data-msg]', {
      y: 22, autoAlpha: 0, stagger: 0.25, duration: 0.5, ease: 'power2.out',
      scrollTrigger: { trigger: '#chat-window', start: 'top 75%' }
    });

    // generic reveals
    gsap.utils.toArray('.steps li, .about p, .about .cta-row').forEach((el) => {
      gsap.from(el, { y: 24, autoAlpha: 0, duration: 0.6, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 88%' } });
    });
  } else {
    // mobile: light fades only
    gsap.utils.toArray('.scene-copy, .scene-visual, .steps li, [data-msg]').forEach((el) => {
      gsap.from(el, { autoAlpha: 0, y: 14, duration: 0.5, ease: 'power1.out',
        scrollTrigger: { trigger: el, start: 'top 92%' } });
    });
  }
}

initMotion();
initHero();
