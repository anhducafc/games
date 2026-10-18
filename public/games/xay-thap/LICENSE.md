# Xây tháp (Tower Game)

Tác giả: iamkun, BMQB, Inc. Mã nguồn gốc: https://github.com/iamkun/tower_game
Mã nguồn và đồ hoạ của repo theo giấy phép **MIT** (xem `LICENSE-MIT.txt`). Engine: cooljs (đã đóng gói trong `dist/main.js`). Zepto 1.1.6 (MIT).

## Nhạc nền (không thuộc giấy phép MIT của repo)

- `assets/bgm.mp3`: "Caketown" của **Matthew Pablo**, https://opengameart.org/content/caketown-cuteplayful
  Giấy phép **CC BY-SA 3.0** (https://creativecommons.org/licenses/by-sa/3.0/): phải ghi tác giả, và bản chỉnh sửa của chính bản nhạc phải giữ cùng giấy phép.
  Tên và tác giả nhận từ thẻ metadata của file; trang gốc trên OpenGameArt ghi giấy phép như trên.

## Âm hiệu ứng

Bốn âm hiệu ứng gốc của repo (`drop`, `drop-perfect`, `game-over`, `rotate`) không rõ nguồn nên **đã được thay** bằng âm do Giờ Ra Chơi tự tổng hợp (`tools/make-sfx.py`).

## Font

Font `wenxue` của bản gốc (WenYue, wytype.com) không rõ điều kiện sử dụng nên **đã được thay** bằng Baloo 2 (SIL OFL 1.1, xem `public/fonts/`).

## Thay đổi so với bản gốc

- Gỡ Google Tag Manager, nút mời bạn qua WeChat, hộp thoại `alert`.
- Thay font, thay âm hiệu ứng, đổi nút "chơi lại" thành tải lại trang.
- Thêm `grc-glue.js` và một đoạn trong `index.html`: gửi điểm khi hết 3 mạng, tạm dừng khi rời tab và dừng khi hết giờ.
