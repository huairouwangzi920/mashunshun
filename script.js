// === Hero Canvas Animation ===
(function () {
  const canvas = document.getElementById('hero-canvas');
  const ctx = canvas.getContext('2d');

  let W, H;
  const DURATION = 10;

  // Mountain layers config
  const layers = [
    { peaks: 6, heightFrac: 0.28, color: '#1a1a20', speed: 0.03, yOff: 0.52 },
    { peaks: 8, heightFrac: 0.38, color: '#141418', speed: 0.07, yOff: 0.58 },
    { peaks: 10, heightFrac: 0.45, color: '#0c0c10', speed: 0.12, yOff: 0.65 },
  ];

  let ridges = [];
  let stars = [];
  let photographerPath = [];

  // ---- Resize & Generate ----
  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    generateRidges();
    generateStars();
    generatePhotographerPath();
  }

  function generateRidges() {
    ridges = layers.map(function (l) {
      var baseY = H * l.yOff;
      var maxH = H * l.heightFrac;
      var n = l.peaks;
      var seg = W / (n - 1);
      var pts = [];
      for (var i = 0; i < n; i++) {
        var x = seg * i;
        var h = (0.25 + Math.random() * 0.75) * maxH;
        pts.push({ x: x, y: baseY - h });
      }
      var smooth = [];
      for (var i = 0; i < pts.length - 1; i++) {
        var p0 = pts[i];
        var p1 = pts[i + 1];
        var steps = 8;
        for (var s = 0; s < steps; s++) {
          var t = s / steps;
          var x = p0.x + (p1.x - p0.x) * t;
          var r = (Math.random() - 0.5) * maxH * 0.3;
          var y = p0.y + (p1.y - p0.y) * t + Math.sin(t * Math.PI) * r;
          smooth.push({ x: x, y: Math.min(y, baseY) });
        }
      }
      var dup = smooth.map(function (p) { return { x: p.x + W, y: p.y }; });
      return smooth.concat(dup);
    });
  }

  function generateStars() {
    stars = [];
    for (var i = 0; i < 120; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H * 0.55,
        r: Math.random() * 1.4 + 0.3,
        a: Math.random() * 0.6 + 0.2,
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
      });
    }
  }

  function generatePhotographerPath() {
    var ridge = ridges[2];
    photographerPath = [];
    var startX = W * 0.79;
    var endX = W * 0.38;
    var len = startX - endX;
    var steps = 60;
    for (var i = 0; i <= steps; i++) {
      var x = startX - (len * i) / steps;
      var y = interpolateRidgeY(ridge, x);
      photographerPath.push({ x: x, y: y });
    }
  }

  function interpolateRidgeY(ridge, x) {
    var i = 0;
    while (i < ridge.length - 1 && ridge[i + 1].x < x) i++;
    if (i >= ridge.length - 1) return ridge[ridge.length - 1].y;
    var p0 = ridge[i];
    var p1 = ridge[i + 1];
    var t = (x - p0.x) / (p1.x - p0.x);
    t = Math.max(0, Math.min(1, t));
    return p0.y + (p1.y - p0.y) * t;
  }

  // ---- Camera State ----
  function getCameraState(t) {
    var phase0End = 2.5;
    var phase1End = 5.2;
    var phase2End = 6.2;
    var phase3End = 6.8;
    var phase4End = 7.8;
    var zoomOutStart = 8.0;

    // Photographer path progress
    var pathProgress;
    if (t < phase0End) {
      pathProgress = 0.15 + (t / phase0End) * 0.40;
    } else if (t < phase1End) {
      var p = (t - phase0End) / (phase1End - phase0End);
      pathProgress = 0.55 + p * 0.10;
    } else {
      pathProgress = 0.65;
    }

    // Zoom
    var zoom;
    if (t < phase0End) {
      zoom = 1.0;
    } else if (t < phase1End) {
      var pz = (t - phase0End) / (phase1End - phase0End);
      zoom = 1.0 + easeInOutCubic(pz) * 3.2;
    } else if (t < zoomOutStart) {
      zoom = 4.2;
    } else {
      var pz = (t - zoomOutStart) / (DURATION - zoomOutStart);
      zoom = 4.2 + easeInOutCubic(Math.min(pz, 1)) * (1.0 - 4.2);
    }

    // Flash
    var flash = 0;
    if (t >= phase3End && t < phase3End + 0.12) {
      flash = (t - phase3End) / 0.12;
    } else if (t >= phase3End + 0.12 && t < phase3End + 0.55) {
      flash = 1.0 - (t - phase3End - 0.12) / 0.43;
    }

    // Camera raise
    var raise = 0;
    if (t >= phase2End && t < phase2End + 0.5) {
      raise = (t - phase2End) / 0.5;
    } else if (t >= phase2End + 0.5) {
      raise = 1.0;
    }

    // Walk phase
    var walkPhase = pathProgress * 12;
    if (t >= phase0End && t < phase2End) {
      var decel = Math.max(0, 1 - (t - phase0End) / 1.0);
      walkPhase = pathProgress * 12 + (t - phase0End) * 3 * decel;
    }

    return {
      pathProgress: pathProgress,
      zoom: zoom,
      flash: flash,
      raise: raise,
      walkPhase: walkPhase,
    };
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // ---- Drawing ----
  function drawSky() {
    var grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#070b18');
    grad.addColorStop(0.4, '#0f1a2e');
    grad.addColorStop(0.7, '#1a2025');
    grad.addColorStop(0.85, '#5a3a2a');
    grad.addColorStop(1, '#0d0d0d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  function drawStars(now) {
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var alpha = s.a * (0.5 + 0.5 * Math.sin(now * s.twinkleSpeed + s.twinkle));
      ctx.fillStyle = 'rgba(255,255,255,' + alpha + ')';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawMountainLayer(layerIdx, time) {
    var l = layers[layerIdx];
    var ridge = ridges[layerIdx];
    var offset = (time * l.speed * W) % W;

    ctx.fillStyle = l.color;
    ctx.beginPath();
    ctx.moveTo(0, H);

    var started = false;
    for (var i = 0; i < ridge.length; i++) {
      var p = ridge[i];
      var sx = p.x - offset;
      if (sx < -10 || sx > W + 10) {
        if (started) {
          ctx.lineTo(sx < -10 ? 0 : W, H);
          started = false;
        }
        continue;
      }
      if (!started) {
        ctx.lineTo(sx < 0 ? 0 : sx, H);
        ctx.lineTo(Math.max(0, sx), Math.min(p.y, H));
        started = true;
      } else {
        ctx.lineTo(sx, p.y);
      }
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
  }

  function drawAtmosphere() {
    var grad = ctx.createLinearGradient(0, H * 0.45, 0, H * 0.7);
    grad.addColorStop(0, 'rgba(120,90,70,0.00)');
    grad.addColorStop(0.5, 'rgba(120,90,70,0.04)');
    grad.addColorStop(1, 'rgba(20,20,25,0.08)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, H * 0.45, W, H * 0.25);
  }

  function drawPhotographer(cam) {
    var idx = Math.floor(cam.pathProgress * (photographerPath.length - 1));
    if (idx >= photographerPath.length) idx = photographerPath.length - 1;
    var pt = photographerPath[idx];

    var z = cam.zoom;
    var zoomCenterX = W * 0.45;
    var zoomCenterY = H * 0.55;

    // World position gets closer to zoom center as zoom increases
    var focalX = zoomCenterX + (pt.x - zoomCenterX) / z;
    var focalY = zoomCenterY + (pt.y - zoomCenterY) / z;
    var scale = z * 0.9;

    ctx.save();
    ctx.translate(focalX, focalY);
    ctx.scale(scale, scale);
    drawPhotographerSilhouette(ctx, cam.walkPhase, cam.raise);
    ctx.restore();
  }

  function drawPhotographerSilhouette(ctx, walkT, raiseT) {
    var bob = Math.sin(walkT * Math.PI * 2) * 1.6;
    var legSwing = Math.sin(walkT * Math.PI * 2) * 0.35;
    var armSwing = Math.sin(walkT * Math.PI * 2) * 0.25;

    var fillColor = '#08080c';
    ctx.fillStyle = fillColor;
    ctx.strokeStyle = fillColor;

    // Backpack
    ctx.beginPath();
    ctx.ellipse(-4, -14, 3.5, 6, -0.1, 0, Math.PI * 2);
    ctx.fill();

    // Left leg (back)
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-1, 0 - bob);
    ctx.lineTo(-2 + Math.sin(legSwing) * 10, -12 * Math.cos(legSwing) - bob);
    ctx.stroke();

    // Right leg (front)
    ctx.beginPath();
    ctx.moveTo(1, 0 - bob);
    ctx.lineTo(2 + Math.sin(-legSwing) * 10, -12 * Math.cos(-legSwing) - bob);
    ctx.stroke();

    // Body
    ctx.beginPath();
    ctx.moveTo(-3.5, 0 - bob);
    ctx.quadraticCurveTo(-4.5, -8 - bob, -3, -15 - bob);
    ctx.lineTo(3, -15 - bob);
    ctx.quadraticCurveTo(4, -8 - bob, 3.5, 0 - bob);
    ctx.closePath();
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(0, -18 - bob, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Hat
    ctx.beginPath();
    ctx.ellipse(0, -21 - bob, 5.5, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, -22.5 - bob, 3.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Left arm (swinging back)
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-3, -13 - bob);
    var laAngle = -0.4 + armSwing;
    ctx.lineTo(-3 + Math.cos(laAngle) * 10, -13 - bob + Math.sin(laAngle) * 9);
    ctx.stroke();

    // Right arm with camera
    ctx.beginPath();
    ctx.moveTo(3, -13 - bob);
    var elbowX = 6;
    var elbowY = -16 - bob;
    ctx.lineTo(elbowX, elbowY);

    var forearmLen = 7;
    var raiseAngle = raiseT * 1.3;
    var baseAngle = 0.6;
    var forearmAngle = baseAngle - raiseAngle;
    var handX = elbowX + Math.cos(forearmAngle) * forearmLen;
    var handY = elbowY + Math.sin(forearmAngle) * forearmLen;
    ctx.lineTo(handX, handY);
    ctx.stroke();

    // Camera body
    var camCX = handX + Math.cos(forearmAngle) * 2.5;
    var camCY = handY + Math.sin(forearmAngle) * 2.5;
    ctx.save();
    ctx.translate(camCX, camCY);
    ctx.rotate(forearmAngle - 0.3);
    ctx.fillStyle = '#141418';
    ctx.fillRect(-3.5, -2, 7, 4.5);
    ctx.fillStyle = '#1a1a20';
    ctx.fillRect(3, -1.2, 3, 2.4);
    ctx.fillStyle = '#252530';
    ctx.beginPath();
    ctx.arc(4.5, 0, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawFlash(flashAlpha) {
    if (flashAlpha <= 0) return;
    ctx.fillStyle = 'rgba(255,255,255,' + (flashAlpha * 0.9) + ')';
    ctx.fillRect(0, 0, W, H);
  }

  function drawVignette() {
    var grad = ctx.createRadialGradient(W / 2, H / 2, W * 0.35, W / 2, H / 2, W * 0.75);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  function drawParticles(time) {
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for (var i = 0; i < 25; i++) {
      var x = ((i * 137 + 42) % W);
      var y = ((i * 251 + 126 + time * 0.03 * W) % (H * 1.2)) - H * 0.1;
      var r = 1 + (i % 3) * 0.5;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---- Main Loop ----
  function draw(timestamp) {
    var t = (timestamp / 1000) % DURATION;
    var cam = getCameraState(t);

    ctx.clearRect(0, 0, W, H);
    drawSky();
    drawStars(timestamp * 0.001);
    drawMountainLayer(0, t);
    drawMountainLayer(1, t);
    drawMountainLayer(2, t);
    drawAtmosphere();
    drawParticles(t);
    drawPhotographer(cam);
    drawVignette();
    drawFlash(cam.flash);

    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(draw);
})();

// === Photo Generator ===
(function () {
  function drawSnowMountain(canvas) {
    var ctx = canvas.getContext('2d');
    var W = canvas.width;
    var H = canvas.height;

    // Sky
    var sky = ctx.createLinearGradient(0, 0, 0, H * 0.55);
    sky.addColorStop(0, '#0a1226');
    sky.addColorStop(0.5, '#1a2a4a');
    sky.addColorStop(1, '#3a5068');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Stars
    for (var i = 0; i < 60; i++) {
      var sx = (i * 137.5 + 42) % W;
      var sy = (i * 97.3 + 17) % (H * 0.5);
      var sr = 0.5 + (i % 4) * 0.3;
      var sa = 0.3 + (i % 6) * 0.1;
      ctx.fillStyle = 'rgba(255,255,255,' + sa + ')';
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Far mountain range
    drawMountain(ctx, W, H, 0.48, 0.35, '#1a2030', [
      { x: 0, h: 0.6 }, { x: 0.12, h: 0.55 }, { x: 0.2, h: 0.9 },
      { x: 0.35, h: 0.5 }, { x: 0.48, h: 1.0 }, { x: 0.6, h: 0.6 },
      { x: 0.72, h: 0.85 }, { x: 0.85, h: 0.5 }, { x: 1.0, h: 0.7 },
    ]);

    // Main mountain
    drawMountain(ctx, W, H, 0.42, 0.55, '#1c2435', [
      { x: 0.28, h: 0.3 }, { x: 0.35, h: 0.7 }, { x: 0.42, h: 0.95 },
      { x: 0.5, h: 1.0 }, { x: 0.58, h: 0.8 }, { x: 0.7, h: 0.35 },
      { x: 0.78, h: 0.2 },
    ]);

    // Snow cap
    ctx.fillStyle = '#d8dfe8';
    ctx.beginPath();
    ctx.moveTo(W * 0.43, H * 0.42);
    ctx.quadraticCurveTo(W * 0.5, H * 0.37, W * 0.55, H * 0.42);
    ctx.quadraticCurveTo(W * 0.52, H * 0.44, W * 0.5, H * 0.43);
    ctx.quadraticCurveTo(W * 0.47, H * 0.44, W * 0.43, H * 0.42);
    ctx.fill();

    // Lake
    var lake = ctx.createLinearGradient(0, H * 0.7, 0, H);
    lake.addColorStop(0, '#1a2530');
    lake.addColorStop(0.3, '#152028');
    lake.addColorStop(1, '#0d151c');
    ctx.fillStyle = lake;
    ctx.fillRect(0, H * 0.7, W, H * 0.3);

    // Reflection
    ctx.globalAlpha = 0.2;
    drawMountain(ctx, W, H, 0.75, 0.15, '#2a3545', [
      { x: 0.28, h: 0.3 }, { x: 0.42, h: 0.9 }, { x: 0.5, h: 1.0 },
      { x: 0.58, h: 0.8 }, { x: 0.7, h: 0.35 },
    ]);
    ctx.globalAlpha = 1;

    // Shoreline
    ctx.strokeStyle = '#2a3545';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var x = 0; x < W; x += 4) {
      var sy = H * 0.7 + Math.sin(x * 0.008) * 4 + Math.sin(x * 0.025) * 2;
      if (x === 0) ctx.moveTo(x, sy);
      else ctx.lineTo(x, sy);
    }
    ctx.stroke();

    // Rocks
    ctx.fillStyle = '#14181e';
    ctx.beginPath();
    ctx.moveTo(W * 0.05, H);
    ctx.quadraticCurveTo(W * 0.08, H * 0.88, W * 0.18, H * 0.85);
    ctx.quadraticCurveTo(W * 0.22, H * 0.9, W * 0.2, H);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(W * 0.75, H);
    ctx.quadraticCurveTo(W * 0.78, H * 0.9, W * 0.9, H * 0.87);
    ctx.quadraticCurveTo(W * 0.95, H * 0.93, W * 1, H);
    ctx.fill();
  }

  function drawForest(canvas) {
    var ctx = canvas.getContext('2d');
    var W = canvas.width;
    var H = canvas.height;

    // Morning sky
    var sky = ctx.createLinearGradient(0, 0, 0, H * 0.6);
    sky.addColorStop(0, '#0d1520');
    sky.addColorStop(0.5, '#1a2a30');
    sky.addColorStop(1, '#3a4a3a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Light rays
    for (var i = 0; i < 5; i++) {
      var rx = W * (0.3 + i * 0.15);
      var grad = ctx.createLinearGradient(rx, H * 0.08, rx + 40, H * 0.65);
      grad.addColorStop(0, 'rgba(220,210,180,0.06)');
      grad.addColorStop(1, 'rgba(220,210,180,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(rx, H * 0.08);
      ctx.lineTo(rx + 50, H * 0.65);
      ctx.lineTo(rx + 80, H * 0.65);
      ctx.lineTo(rx + 20, H * 0.08);
      ctx.fill();
    }

    // Mist
    var mist = ctx.createLinearGradient(0, H * 0.3, 0, H * 0.7);
    mist.addColorStop(0, 'rgba(180,190,180,0)');
    mist.addColorStop(0.4, 'rgba(180,190,180,0.12)');
    mist.addColorStop(0.7, 'rgba(180,190,180,0.18)');
    mist.addColorStop(1, 'rgba(160,170,160,0.04)');
    ctx.fillStyle = mist;
    ctx.fillRect(0, 0, W, H);

    // Ground
    var ground = ctx.createLinearGradient(0, H * 0.6, 0, H);
    ground.addColorStop(0, '#1a2218');
    ground.addColorStop(1, '#0f140e');
    ctx.fillStyle = ground;
    ctx.fillRect(0, H * 0.6, W, H * 0.4);

    // Background trees
    ctx.strokeStyle = '#161e16';
    for (var i = 0; i < 15; i++) {
      var tx = W * (0.03 + i * 0.07);
      var th = H * (0.25 + (i % 5) * 0.08);
      ctx.lineWidth = 2 + (i % 3) * 1;
      ctx.beginPath();
      ctx.moveTo(tx, H * 0.6);
      ctx.lineTo(tx + (i % 3 - 1) * 2, th);
      ctx.stroke();
    }

    // Mid trees
    ctx.strokeStyle = '#111811';
    for (var i = 0; i < 12; i++) {
      var tx = W * (0.05 + i * 0.085);
      var th = H * (0.2 + (i % 4) * 0.1);
      ctx.lineWidth = 3 + (i % 3) * 2;
      ctx.beginPath();
      ctx.moveTo(tx, H * 0.6);
      ctx.quadraticCurveTo(tx + 2, th + 20, tx + (i % 5 - 2) * 3, th);
      ctx.stroke();
    }

    // Foreground trees
    ctx.strokeStyle = '#0c100c';
    for (var i = 0; i < 8; i++) {
      var tx = W * (0.08 + i * 0.13);
      var th = H * (0.18 + (i % 3) * 0.12);
      ctx.lineWidth = 5 + (i % 2) * 3;
      ctx.beginPath();
      ctx.moveTo(tx, H * 0.6);
      ctx.quadraticCurveTo(tx - 3, th + 30, tx + (i % 5 - 2) * 4, th);
      ctx.stroke();
    }

    // Winding path
    ctx.fillStyle = 'rgba(30,35,28,0.6)';
    ctx.beginPath();
    ctx.moveTo(W * 0.42, H);
    ctx.quadraticCurveTo(W * 0.44, H * 0.8, W * 0.47, H * 0.65);
    ctx.quadraticCurveTo(W * 0.48, H * 0.55, W * 0.46, H * 0.48);
    ctx.lineTo(W * 0.54, H * 0.48);
    ctx.quadraticCurveTo(W * 0.52, H * 0.55, W * 0.53, H * 0.65);
    ctx.quadraticCurveTo(W * 0.56, H * 0.8, W * 0.58, H);
    ctx.fill();

    // Dappled light
    for (var i = 0; i < 10; i++) {
      ctx.fillStyle = 'rgba(200,190,160,0.04)';
      ctx.beginPath();
      ctx.arc(W * (0.44 + i * 0.012), H * (0.65 + i * 0.03), 4 + Math.random() * 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Branches
    ctx.strokeStyle = '#0a0f0a';
    ctx.lineWidth = 2;
    for (var i = 0; i < 6; i++) {
      var bx = W * (0.1 + i * 0.16);
      ctx.beginPath();
      ctx.moveTo(bx, H * (0.4 + i * 0.03));
      ctx.quadraticCurveTo(bx - 20, H * 0.35, bx - 30 - i * 10, H * 0.3);
      ctx.stroke();
    }
  }

  function drawDesert(canvas) {
    var ctx = canvas.getContext('2d');
    var W = canvas.width;
    var H = canvas.height;

    // Night sky
    var sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#020510');
    sky.addColorStop(0.4, '#060d24');
    sky.addColorStop(0.75, '#0f1a35');
    sky.addColorStop(1, '#1a2540');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Stars
    for (var i = 0; i < 200; i++) {
      var sx = (i * 173.3 + 77) % W;
      var sy = (i * 211.7 + 43) % (H * 0.6);
      var sr = 0.3 + (i % 8) * 0.15;
      var sa = 0.3 + (i % 7) * 0.1;
      ctx.fillStyle = 'rgba(255,255,255,' + sa + ')';
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Milky Way
    for (var i = 0; i < 300; i++) {
      var t = i / 300;
      var mx = W * (0.15 + t * 0.7);
      var my = H * (0.1 + t * 0.45 + Math.sin(t * Math.PI * 2.5) * 0.06);
      var mr = 0.3 + Math.random() * 0.8;
      var ma = 0.05 + Math.random() * 0.2 * (1 - Math.abs(t - 0.5) * 1.8);
      ctx.fillStyle = 'rgba(200,210,255,' + Math.max(0, ma) + ')';
      ctx.beginPath();
      ctx.arc(mx + (Math.random() - 0.5) * 40, my + (Math.random() - 0.5) * 15, mr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dune layers
    drawDune(ctx, W, H, 0.55, 0.38, '#2a2218', [
      { x: 0, h: 0 }, { x: 0.2, h: 0.6 }, { x: 0.4, h: 0.4 },
      { x: 0.55, h: 0.9 }, { x: 0.7, h: 0.5 }, { x: 0.85, h: 0.75 },
      { x: 1.0, h: 0.3 },
    ]);
    drawDune(ctx, W, H, 0.68, 0.35, '#352820', [
      { x: 0, h: 0.3 }, { x: 0.15, h: 0.8 }, { x: 0.3, h: 0.5 },
      { x: 0.5, h: 1.0 }, { x: 0.65, h: 0.55 }, { x: 0.8, h: 0.85 },
      { x: 1.0, h: 0.4 },
    ]);
    drawDune(ctx, W, H, 0.82, 0.3, '#423020', [
      { x: 0, h: 0.5 }, { x: 0.2, h: 0.3 }, { x: 0.4, h: 0.9 },
      { x: 0.55, h: 0.6 }, { x: 0.7, h: 1.0 }, { x: 0.85, h: 0.5 },
      { x: 1.0, h: 0.7 },
    ]);

    // Ripple lines
    ctx.strokeStyle = 'rgba(80,60,40,0.3)';
    ctx.lineWidth = 0.5;
    for (var d = 0; d < 3; d++) {
      var baseY = H * (0.55 + d * 0.14);
      ctx.beginPath();
      for (var x = 0; x < W; x += 2) {
        var y = baseY + Math.sin(x * 0.015 + d) * 8 + Math.sin(x * 0.04) * 3;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Dune texture
    for (var i = 0; i < 40; i++) {
      ctx.fillStyle = 'rgba(60,40,25,' + (Math.random() * 0.3) + ')';
      ctx.beginPath();
      ctx.arc(Math.random() * W, H * (0.68 + Math.random() * 0.32), Math.random() * 3 + 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawMountain(ctx, W, H, baseYFrac, heightFrac, color, peaks) {
    var baseY = H * baseYFrac;
    var maxH = H * heightFrac;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, baseY + 20);
    var pts = [];
    for (var i = 0; i < peaks.length; i++) {
      pts.push({ x: peaks[i].x * W, y: baseY - peaks[i].h * maxH });
    }
    ctx.lineTo(pts[0].x, pts[0].y);
    for (var i = 0; i < pts.length - 1; i++) {
      var cx = (pts[i].x + pts[i + 1].x) / 2;
      var cy = Math.min(pts[i].y, pts[i + 1].y) - (Math.random() * 0.1 + 0.05) * maxH;
      ctx.quadraticCurveTo(cx, cy, pts[i + 1].x, pts[i + 1].y);
    }
    ctx.lineTo(W, baseY + 20);
    ctx.closePath();
    ctx.fill();
  }

  function drawDune(ctx, W, H, baseYFrac, heightFrac, color, peaks) {
    var baseY = H * baseYFrac;
    var maxH = H * heightFrac;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, H);
    var pts = [];
    for (var i = 0; i < peaks.length; i++) {
      pts.push({ x: peaks[i].x * W, y: baseY - peaks[i].h * maxH });
    }
    ctx.lineTo(pts[0].x, pts[0].y);
    for (var i = 0; i < pts.length - 1; i++) {
      var cx = (pts[i].x + pts[i + 1].x) / 2;
      var cy = pts[i].y + (pts[i + 1].y - pts[i].y) * 0.3;
      ctx.quadraticCurveTo(cx, cy, pts[i + 1].x, pts[i + 1].y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
  }

  function init() {
    var c0 = document.getElementById('photo-0');
    var c1 = document.getElementById('photo-1');
    var c2 = document.getElementById('photo-2');
    if (c0) drawSnowMountain(c0);
    if (c1) drawForest(c1);
    if (c2) drawDesert(c2);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

// === Brand Danmaku ===
(function () {
  var brands = [
    '索尼', '佳能', '尼康', '大疆', '影石',
    '哈苏', '徕卡', '适马', '富士', '松下', '蔡司',
  ];

  function init() {
    var tracks = document.querySelectorAll('.danmaku-track');
    for (var t = 0; t < tracks.length; t++) {
      var track = tracks[t];
      var shuffled = [];
      var pool = brands.slice();
      while (pool.length > 0) {
        var idx = Math.floor(Math.random() * pool.length);
        shuffled.push(pool[idx]);
        pool.splice(idx, 1);
      }
      var doubled = shuffled.concat(shuffled.slice());

      var inner = document.createElement('div');
      inner.className = 'danmaku-inner';
      var html = '';
      for (var i = 0; i < doubled.length; i++) {
        html += '<span>' + doubled[i] + '</span>';
      }
      inner.innerHTML = html;
      track.appendChild(inner);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

// === Scroll Observer ===
(function () {
  function init() {
    var targets = document.querySelectorAll('.gallery-item, .section-label, #slogan');
    var observer = new IntersectionObserver(
      function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) {
            entries[i].target.classList.add('visible');
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    for (var i = 0; i < targets.length; i++) {
      observer.observe(targets[i]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
