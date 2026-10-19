/* Giờ Ra Chơi: gắn HexGL vào Game SDK. Tải sau launch.js. */
(function () {
  if (!window.GRC || !window.bkcore || !bkcore.hexgl) return;

  var HexGL = bkcore.hexgl.HexGL;
  var paused = false;
  var stopped = false;
  var pausedAt = 0;
  var audioSuspended = false;

  function suspendAudio(on) {
    try {
      var ctx = bkcore.Audio._ctx;
      if (!ctx) return;
      if (on && ctx.state === 'running') { ctx.suspend(); audioSuspended = true; }
      else if (!on && audioSuspended) { ctx.resume(); audioSuspended = false; }
    } catch (e) { /* bỏ qua */ }
  }

  // Điểm: chỉ tính khi về đích. Thời gian càng ngắn điểm càng cao (10 phút trừ thời gian, đơn vị 0,1 giây).
  var origDisplayScore = HexGL.prototype.displayScore;
  HexGL.prototype.displayScore = function (finishTime) {
    try {
      var gp = this.gameplay;
      if (gp && gp.result === gp.results.FINISH) {
        GRC.score(Math.max(1, Math.round((600000 - finishTime) / 100)));
      }
    } catch (e) { /* không để lỗi điểm làm hỏng màn kết thúc */ }
    return origDisplayScore.apply(this, arguments);
  };

  // Tạm dừng: bỏ qua mọi cập nhật; khi tiếp tục thì dời mốc thời gian của đồng hồ đua
  // để thời gian nghỉ không bị tính vào kết quả.

  // ---- Điều khiển cảm ứng kiểu game di động: 2 nút ◀ ▶ ở hai góc dưới, xe tự tăng tốc ----
  var pad = null, padState = { left: false, right: false };
  function buildPad() {
    var css = document.createElement('style');
    css.textContent =
      '#grc-pad{position:fixed;left:0;right:0;bottom:0;height:42%;display:none;z-index:100000;pointer-events:none;-webkit-user-select:none;user-select:none}' +
      '#grc-pad button{position:absolute;bottom:max(16px,env(safe-area-inset-bottom));width:min(26vw,150px);height:min(26vw,150px);border-radius:50%;border:4px solid rgba(255,255,255,.7);' +
      'background:rgba(20,40,80,.38);color:#fff;font-size:min(12vw,64px);line-height:1;pointer-events:auto;touch-action:none;-webkit-tap-highlight-color:transparent;padding:0}' +
      '#grc-pad button.on{background:rgba(255,181,71,.65)}#grc-pad .l{left:max(16px,env(safe-area-inset-left))}#grc-pad .r{right:max(16px,env(safe-area-inset-right))}' +
      '#grc-pad .rs{top:-6px;right:12px;bottom:auto;left:auto;width:48px;height:48px;font-size:26px}';
    document.head.appendChild(css);
    pad = document.createElement('div');
    pad.id = 'grc-pad'; pad.setAttribute('data-v', 'touch-v4');
    function mk(cls, label, name, aria) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = cls; b.textContent = label; b.setAttribute('aria-label', aria);
      var ids = {};
      function set(on) { padState[name] = on; b.classList.toggle('on', on); }
      function count() { return Object.keys(ids).length; }
      // Dùng sự kiện touch (chạy chắc trên Safari iPhone) + chuột cho máy tính.
      b.addEventListener('touchstart', function (e) {
        e.preventDefault(); e.stopPropagation();
        for (var i = 0; i < e.changedTouches.length; i++) ids[e.changedTouches[i].identifier] = 1;
        set(true);
      }, { passive: false });
      function tend(e) {
        e.preventDefault(); e.stopPropagation();
        for (var i = 0; i < e.changedTouches.length; i++) delete ids[e.changedTouches[i].identifier];
        if (!count()) set(false);
      }
      b.addEventListener('touchend', tend, { passive: false });
      b.addEventListener('touchcancel', tend, { passive: false });
      b.addEventListener('mousedown', function (e) { e.preventDefault(); ids.mouse = 1; set(true); });
      window.addEventListener('mouseup', function () { if (ids.mouse) { delete ids.mouse; if (!count()) set(false); } });
      b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      return b;
    }
    pad.appendChild(mk('l', '◀', 'left', 'Lái sang trái'));
    pad.appendChild(mk('r', '▶', 'right', 'Lái sang phải'));
    var rs = document.createElement('button');
    rs.type = 'button'; rs.className = 'rs'; rs.textContent = '⟲'; rs.setAttribute('aria-label', 'Đua lại');
    rs.style.cssText = 'position:absolute;top:-6px;right:12px;width:48px;height:48px;font-size:26px;border-radius:50%;border:3px solid rgba(255,255,255,.7);background:rgba(20,40,80,.38);color:#fff;pointer-events:auto;';
    rs.addEventListener('click', function () { try { window.hexGL.restart(); } catch (e) {} });
    pad.appendChild(rs);
    document.body.appendChild(pad);
  }
  function drivePad(hex) {
    var sc = hex.components && hex.components.shipControls;
    if (!sc || !sc.touchController) { if (pad) pad.style.display = 'none'; return; }
    if (!pad) buildPad();
    sc.touchController.active = false;   // tắt cần kéo cũ; dùng 2 nút
    // Ở chế độ TOUCH, ShipControls bỏ qua key.left/right mà chỉ đọc stickVector.x (âm = lái trái, 100 = lái hết cỡ).
    sc.touchController.stickVector.x = (padState.right ? 100 : 0) - (padState.left ? 100 : 0);
    sc.key.left = padState.left;
    sc.key.right = padState.right;
    sc.key.forward = true;               // tự tăng tốc
    pad.style.display = 'block';
  }
  GRC.onTimeUp(function () { if (pad) pad.style.display = 'none'; });
  setInterval(function () {
    // ẩn nút khi không còn ở màn đua (màn kết quả / menu)
    var s4 = document.getElementById('step-4');
    if (pad && (!s4 || s4.style.display === 'none')) pad.style.display = 'none';
  }, 500);
  var origUpdate = HexGL.prototype.update;
  HexGL.prototype.update = function () {
    if (paused || stopped) return;
    try { drivePad(this); } catch (e) { /* không để lỗi nút làm hỏng game */ }
    return origUpdate.apply(this, arguments);
  };

  GRC.onPause(function () {
    if (paused || stopped) return;
    paused = true;
    pausedAt = Date.now();
    suspendAudio(true);
  });

  GRC.onResume(function () {
    if (!paused) return;
    paused = false;
    suspendAudio(false);
    var gap = Date.now() - pausedAt;
    var g = window.hexGL && window.hexGL.gameplay;
    if (g && g.timer) {
      var t = g.timer.time;
      t.start += gap;
      t.current += gap;
      t.previous += gap;
    }
  });

  GRC.onTimeUp(function () {
    stopped = true;
    suspendAudio(true);
  });

  GRC.ready();
})();
