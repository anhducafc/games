/* Giờ Ra Chơi: gắn Hextris vào Game SDK. Tải sau toàn bộ mã của game. */
(function () {
  if (!window.GRC) return;

  // Điểm: gửi khi game over (gameOverDisplay được checkGameOver gọi một lần cho mỗi ván).
  var origGameOver = window.gameOverDisplay;
  if (typeof origGameOver === 'function') {
    window.gameOverDisplay = function () {
      try { GRC.score(window.score); } catch (e) { /* bỏ qua */ }
      return origGameOver.apply(this, arguments);
    };
  }

  function pauseIfPlaying() {
    try { if (window.gameState === 1) window.pause(); } catch (e) { /* bỏ qua */ }
  }

  GRC.onPause(pauseIfPlaying);
  GRC.onTimeUp(pauseIfPlaying);

  GRC.ready();
})();
