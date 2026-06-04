const authStyles = `
        body {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            overflow: hidden;
            background: radial-gradient(circle at center, #121214 0%, #0a0a0b 100%);
        }

        #bgCanvas {
            position: fixed;
            inset: 0;
            z-index: 0;
            pointer-events: none;
            opacity: 0.8;
        }

        .auth-container {
            position: relative;
            z-index: 10;
            width: 100%;
            max-width: 440px;
            padding: 40px;
        }

        .auth-card {
            padding: 48px;
            border-radius: var(--radius-lg);
        }

        .auth-logo {
            text-align: center;
            margin-bottom: 40px;
            font-size: 2rem;
            color: var(--text-primary);
        }

        .auth-logo span {
            color: var(--gold-luminous);
        }

        .form-group {
            margin-bottom: 24px;
        }

        .form-label {
            display: block;
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: var(--gold-luminous);
            margin-bottom: 8px;
            font-weight: 600;
        }

        .form-input {
            width: 100%;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            padding: 14px 16px;
            color: #fff;
            font-family: inherit;
            font-size: 0.95rem;
            outline: none;
            transition: var(--transition-snappy);
        }

        .form-input:focus {
            border-color: var(--gold-luminous);
            background: rgba(255, 255, 255, 0.08);
            box-shadow: 0 0 15px rgba(212, 175, 55, 0.1);
        }

        .auth-tabs {
            display: flex;
            gap: 24px;
            margin-bottom: 32px;
            border-bottom: 1px solid var(--border);
            padding-bottom: 12px;
        }

        .auth-tab {
            font-size: 0.875rem;
            font-weight: 500;
            color: var(--text-secondary);
            cursor: pointer;
            transition: var(--transition-snappy);
            position: relative;
        }

        .auth-tab.active {
            color: var(--gold-luminous);
        }

        .auth-tab.active::after {
            content: '';
            position: absolute;
            bottom: -13px;
            left: 0;
            width: 100%;
            height: 2px;
            background: var(--gold-luminous);
        }

        .form-error {
            color: #ff4d4d;
            font-size: 0.75rem;
            margin-top: 6px;
            display: none;
        }

        .pwd-wrap {
            position: relative;
        }

        .eye-btn {
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            font-size: 1.2rem;
        }

        .auth-switch {
            text-align: center;
            margin-top: 32px;
            font-size: 0.875rem;
            color: var(--text-secondary);
        }

        .auth-switch a {
            color: var(--gold-luminous);
            text-decoration: none;
            font-weight: 600;
        }

        .auth-switch a:hover {
            text-decoration: underline;
        }
`;

const styleEl = document.createElement('style');
styleEl.textContent = authStyles;
document.head.appendChild(styleEl);

// ── Three.js particle field ────────────────────────
(function initThree() {
  const canvas   = document.getElementById('bgCanvas');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha:true, antialias:true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 1000);
  camera.position.z = 100;

  const geo = new THREE.BufferGeometry();
  const n = 1500;
  const posArr = new Float32Array(n * 3);
  for (let i=0; i<n*3; i++) posArr[i] = (Math.random() - 0.5) * 400;
  geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  
  const mat = new THREE.PointsMaterial({ size: 1, color: 0xd4af37, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending });
  const points = new THREE.Points(geo, mat);
  scene.add(points);

  let mx=0, my=0;
  document.addEventListener('mousemove', e => { mx=(e.clientX/window.innerWidth-.5); my=(e.clientY/window.innerHeight-.5); });

  (function tick() {
    requestAnimationFrame(tick);
    points.rotation.y += 0.0005;
    points.position.x += (mx * 20 - points.position.x) * 0.05;
    points.position.y += (-my * 20 - points.position.y) * 0.05;
    renderer.render(scene, camera);
  })();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
})();
