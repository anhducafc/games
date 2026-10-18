/* Giờ Ra Chơi: gắn Xây tháp (Tower Game) vào Game SDK.
 * Điểm được gửi trong index.html, ở setGameFailed (khi mất mạng thứ 3). */
(function () {
  if (!window.GRC) return;

  var paused = false;
  var stopped = false;

  // nạp trước font cho chữ vẽ trên canvas
  try {
    document.fonts.load("600 24px 'Baloo 2'");
    document.fonts.load("800 24px 'Baloo 2'");
  } catch (e) { /* bỏ qua */ }

  GRC.onPause(function () {
    var game = window.game;
    if (!game || paused || stopped) return;
    paused = true;
    if (!game.paused) game.togglePaused();
    try { game.pauseBgm(); } catch (e) { /* bỏ qua */ }
  });

  GRC.onResume(function () {
    var game = window.game;
    if (!game || !paused || stopped) return;
    paused = false;
    if (game.paused) game.togglePaused();
    try { game.playBgm(); } catch (e) { /* bỏ qua */ }
  });

  GRC.onTimeUp(function () {
    stopped = true;
    var game = window.game;
    if (!game) return;
    try {
      if (!game.paused) game.togglePaused();
      game.pauseBgm();
    } catch (e) { /* bỏ qua */ }
  });

  GRC.ready();
})();
