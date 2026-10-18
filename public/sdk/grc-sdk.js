/*
 * Giờ Ra Chơi – Game SDK (v1)
 * Game chạy trong iframe sandbox, nói chuyện với cổng game qua postMessage.
 *
 * Cách dùng trong game:
 *   <script src="../../sdk/grc-sdk.js"></script>
 *   GRC.onInit(({ highScore }) => { ... });   // cổng gửi điểm cao đã lưu
 *   GRC.ready();                               // báo game đã tải xong
 *   GRC.score(1234);                           // gửi điểm khi kết thúc ván
 *   GRC.onPause(() => ...); GRC.onResume(() => ...);
 *   GRC.onTimeUp(() => { lưu và dừng game });  // hết 45 phút
 *
 * Game vẫn chạy bình thường khi mở riêng (không nằm trong cổng).
 */
(function () {
  var listeners = { init: [], pause: [], resume: [], timeUp: [] };
  var state = { highScore: 0, inPortal: window.parent !== window };

  function send(type, data) {
    if (!state.inPortal) return;
    window.parent.postMessage({ grc: 1, type: type, data: data || null }, '*');
  }

  function emit(name, data) {
    (listeners[name] || []).forEach(function (fn) {
      try { fn(data); } catch (e) { console.error(e); }
    });
  }

  window.addEventListener('message', function (ev) {
    if (ev.source !== window.parent) return;
    var msg = ev.data;
    if (!msg || msg.grc !== 1) return;
    if (msg.type === 'init') {
      state.highScore = (msg.data && msg.data.highScore) || 0;
      emit('init', { highScore: state.highScore });
    } else if (msg.type === 'pause') emit('pause');
    else if (msg.type === 'resume') emit('resume');
    else if (msg.type === 'timeUp') emit('timeUp');
  });

  function on(name) {
    return function (fn) {
      listeners[name].push(fn);
      if (name === 'init' && !state.inPortal) fn({ highScore: 0 });
    };
  }

  window.GRC = {
    version: 1,
    ready: function () { send('ready'); },
    score: function (n) {
      n = Math.max(0, Math.floor(Number(n) || 0));
      if (n > state.highScore) state.highScore = n;
      send('score', { score: n });
    },
    get highScore() { return state.highScore; },
    onInit: on('init'),
    onPause: on('pause'),
    onResume: on('resume'),
    onTimeUp: on('timeUp'),
  };
})();
