/* Bộ công cụ dùng chung cho game tự làm: nối SDK, âm thanh, tiện ích. Không gọi mạng. */
(function () {
  var paused = false, ac = null, muted = false, best = 0;
  function ctx() {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } }
    if (ac && ac.state === 'suspended' && !paused) ac.resume();
    return ac;
  }
  function tone(f, d, type, vol, when, slideTo) {
    var a = ctx(); if (!a || muted) return;
    var t = a.currentTime + (when || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.15, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d + 0.02);
  }
  var SFX = {
    tap: function () { tone(520, .06, 'triangle', .12); },
    ok: function () { tone(660, .09, 'triangle', .14); tone(880, .12, 'triangle', .14, .08); },
    bad: function () { tone(220, .18, 'sawtooth', .1, 0, 140); },
    pop: function () { tone(400, .08, 'sine', .14, 0, 800); },
    win: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, .16, 'triangle', .14, i * .1); }); },
    lose: function () { [392, 330, 262].forEach(function (f, i) { tone(f, .22, 'sawtooth', .09, i * .14); }); },
    move: function () { tone(300, .05, 'square', .06); },
    boom: function () { tone(120, .35, 'sawtooth', .16, 0, 40); }
  };
  var Kit = {
    get paused() { return paused; },
    get best() { return best; },
    set muted(v) { muted = !!v; },
    sfx: function (n) { try { (SFX[n] || SFX.tap)(); } catch (e) {} },
    score: function (n) { if (window.GRC) { try { GRC.score(n); } catch (e) {} } if (n > best) best = n | 0; },
    rand: function (n) { return Math.floor(Math.random() * n); },
    pick: function (a) { return a[Math.floor(Math.random() * a.length)]; },
    shuffle: function (a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; },
    seeded: function (seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; },
    $: function (id) { return document.getElementById(id); },
    say: function (el, t, cls) { el.textContent = t; el.className = 'msg' + (cls ? ' ' + cls : ''); },
    fmt: function (s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); },
    /* h = { pause, resume, timeUp, init } */
    init: function (h) {
      h = h || {};
      if (window.GRC) {
        GRC.onInit(function (d) { if (d && d.highScore) best = Math.max(best, d.highScore | 0); if (h.init) h.init(d); });
        GRC.onPause(function () { paused = true; if (ac && ac.state === 'running') ac.suspend(); if (h.pause) h.pause(); });
        GRC.onResume(function () { paused = false; if (ac && ac.state === 'suspended') ac.resume(); if (h.resume) h.resume(); });
        GRC.onTimeUp(function () { paused = true; if (h.timeUp) h.timeUp(); });
        GRC.ready();
      }
      document.addEventListener('pointerdown', function () { ctx(); }, { once: true });
      document.addEventListener('keydown', function () { ctx(); }, { once: true });
      document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    },
    /* vòng lặp animation có dt (giây), tự dừng khi cổng tạm dừng */
    loop: function (fn) {
      var last = 0;
      function f(t) { requestAnimationFrame(f); if (paused) { last = t; return; } var dt = Math.min(0.05, (t - (last || t)) / 1000); last = t; fn(dt, t / 1000); }
      requestAnimationFrame(f);
    }
  };
  window.Kit = Kit;
})();
