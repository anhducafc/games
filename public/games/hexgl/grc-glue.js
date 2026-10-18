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
  var origUpdate = HexGL.prototype.update;
  HexGL.prototype.update = function () {
    if (paused || stopped) return;
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
