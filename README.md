# Giờ Ra Chơi

Cổng game HTML5 cho học sinh tiểu học đến THPT. Mỗi ngày chơi tối đa 45 phút. Không quảng cáo, không tài khoản, không thu thập dữ liệu. Site tĩnh, deploy được lên Cloudflare Pages hoặc GitHub Pages.

## Chạy

```bash
npm install
npm run dev      # chạy thử ở http://localhost:5173
npm test         # test bộ đếm 45 phút
npm run serve    # chạy bản build ở http://localhost:8080 (sau npm run build)
# e2e trên trình duyệt thật (cần: pip install playwright && playwright install chromium):
python3 tests/e2e/e2e_games.py   # 4 game cũ + trang chủ + giới thiệu
python3 tests/e2e/e2e_slime.py   # Slime nhảy phím
python3 tools/smoke-online.py <URL>   # kiểm tra nhanh bản đã deploy
npm run build    # xuất ra thư mục dist/ để deploy
```

### Chạy bản build trên máy local

Không mở thẳng `dist/index.html` bằng `file://` được: trình duyệt chặn module script, HexGL cần XHR. Dùng launcher (cần Node, không cần cài thêm gói):

- Windows: bấm đúp `chay-local.bat`
- Mac/Linux: `./chay-local.sh`
- Hoặc: `npm run build && node tools/serve.mjs dist 8080`, rồi mở http://localhost:8080

Mở nhầm bằng `file://` thì trang hiện hướng dẫn thay vì trắng.

### Deploy online

Hướng dẫn từng bước đầy đủ (Cloudflare Pages, GitHub Pages, tên miền, kiểm tra, quay lui, giấy phép): [docs/HUONG-DAN-DEPLOY.md](docs/HUONG-DAN-DEPLOY.md). Tóm tắt: `npm run release` tạo `release/gio-ra-choi-site.zip`, kéo thả lên Cloudflare Pages; sau khi lên mạng chạy `python3 tools/smoke-online.py <URL>`.


`dist/` là site tĩnh, dùng đường dẫn tương đối nên chạy được ở gốc tên miền lẫn thư mục con (vd. GitHub Pages `user.github.io/repo/`). Đã thử chạy dưới thư mục con. Không file nào vượt 25MB (giới hạn Cloudflare Pages). Cloudflare Pages: build command `npm run build`, output `dist`.

### Font trong game sandbox chặt

Game tự làm chạy với origin `null`, nên font tải bằng CORS sẽ bị chặn nếu máy chủ không gửi `Access-Control-Allow-Origin` (Cloudflare Pages mặc định không gửi). Vì vậy game tự làm nạp `fonts/fonts-inline.css` (font nhúng dạng data URI). File này sinh bằng `python3 tools/make-inline-fonts.py`, chạy lại nếu đổi `fonts/fonts.css`.

## Cấu trúc

```
src/
  main.ts        trang chủ, trang chơi, trang giới thiệu, router (#/, #/choi/<id>, #/gioi-thieu)
  games.ts       danh mục game + thông tin bản quyền từng game
  timer.ts       bộ đếm thời gian chơi trong ngày (localStorage)
  bridge.ts      phía cổng của Game SDK + lưu điểm cao
  style.css
tools/
  import-games.py      tải + vá + kiểm tra game mã nguồn mở
  glue/                mã nối game với SDK, LICENSE.md từng game
public/
  sdk/grc-sdk.js       Game SDK cho game nhúng trong iframe
  games/<id>/          mỗi game một thư mục (index.html + LICENSE.md)
```

## Bộ đếm 45 phút

- Chỉ đếm khi đang ở trang chơi game và tab đang hiển thị.
- Nhiều tab dùng chung một bộ đếm, không bị trừ gấp đôi.
- Cảnh báo khi còn 10 và 5 phút. Hết giờ: game nhận lệnh `timeUp`, iframe bị gỡ, hiện màn hình nghỉ.
- Reset lúc 0:00 theo giờ máy. Lưu trong localStorage `grc.playtime.v1` (cố ý không chống lách).
- Đổi giới hạn: `new DailyTimer({ limitSeconds: ... })` trong `src/main.ts`.

## Thêm game mới

1. Tạo `public/games/<id>/index.html`, nạp SDK:
   ```html
   <script src="../../sdk/grc-sdk.js"></script>
   <script>
     GRC.onInit(({ highScore }) => { /* hiện kỷ lục */ });
     GRC.onPause(() => {}); GRC.onResume(() => {});
     GRC.onTimeUp(() => { /* dừng game */ });
     GRC.ready();
     // khi kết thúc ván: GRC.score(diem);
   </script>
   ```
2. Thêm mục vào `GAMES` trong `src/games.ts` với `status: 'ready'` và `src: 'games/<id>/index.html'`.
3. Ghi nguồn và giấy phép vào `credit` (hiện ở trang Giới thiệu) và file `LICENSE.md` của game.

## Sandbox

- Game tự làm: `sandbox="allow-scripts allow-pointer-lock"` (chặt, không đọc được dữ liệu của cổng).
- Game mã nguồn mở của người khác (HexGL, Xây tháp, Hextris): thêm `allow-same-origin` vì cần localStorage/XHR/WebGL cùng origin. Đổi lại, các game này chạy cùng origin với cổng nên về lý thuyết đọc được localStorage của cổng (bộ đếm giờ). Mã đã được rà soát và tự host, không nạp mã từ ngoài, nhưng đây là điểm cần biết. Muốn chặt hơn: host game ở subdomain riêng.

## Game mã nguồn mở đã tích hợp

| Game | Giấy phép | Ghi chú |
|---|---|---|
| HexGL | CC BY-NC 3.0 + MIT | Chỉ phi thương mại. Nếu kiếm tiền từ site thì gỡ game này. |
| Xây tháp (Tower Game) | MIT, nhạc CC BY-SA 3.0 | Âm hiệu ứng và font đã thay bằng bản tự tạo. |
| Hextris | GPL-3.0 | Đã gỡ quảng cáo, Google Analytics và đoạn gửi dữ liệu ra IP ngoài. |
| Slime nhảy phím | Tự làm | Đồ hoạ vẽ bằng canvas, âm thanh tổng hợp WebAudio, không file ngoài. |
| Đố chiếu hết | Tự làm (chess.js, BSD) | Chạy offline, thế cờ sinh bằng tools/gen-puzzles.mjs. |
| Đố cờ các nước | Tự làm (chess.js, BSD) | Đố thắng quân, sinh bằng tools/gen-puzzles2.mjs. |
| Đố cờ các nước (quốc kỳ) | Tự làm; hình cờ từ flag-icons (MIT) | 193 quốc kỳ, 5 cấp, dữ liệu sinh bằng tools/gen-flags.py. |
| Tangram | Tự làm | Hình ghép sinh bằng tools/gen-tangram.py (shapely). |
| Đua vịt (nhiều người) | Tự làm, đồ hoạ vẽ bằng SVG | 1–4 người cùng phòng, chỗ trống do vịt máy; máy chủ Durable Objects, xem docs/DUA-VIT.md. |
| Cửu chương vui | Tự làm, thỏ Mochi vẽ bằng SVG, âm thanh tự sinh | Luyện bảng cửu chương 1–10: nuôi thỏ ăn bánh và bắn bóng, 5 cấp độ, ôn câu hay sai. Không cần mạng. Xem docs/CUU-CHUONG.md. |
| Khối 2048, Mê cung, Sudoku, Xếp bài, Xây cầu, Đua xe tí hon, Thế giới khối... | Tự làm | Dùng chung public/games/_shared/kit.js; không file ngoài. |

Mã game gốc không commit trực tiếp: chạy `python3 tools/import-games.py` để tải, vá và sinh lại `public/games/{hexgl,xay-thap,hextris}`. Script dừng ngay nếu một bản vá không khớp hoặc còn tham chiếu tới host ngoài. Mã nối với SDK nằm ở `tools/glue/`, âm thanh thay thế sinh bằng `tools/make-sfx.py`.

