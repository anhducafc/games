# Hextris

Tác giả: Logan Engstrom và Garrett Finucane (Hextris team). Mã nguồn gốc: https://github.com/Hextris/hextris
Giấy phép: **GNU GPL phiên bản 3 hoặc mới hơn** (toàn văn trong `LICENSE-GPL-3.0.md`).

## Nghĩa vụ của GPL-3.0 đã đáp ứng như thế nào

- Mã nguồn của game được phát hành dưới dạng chưa nén (`js/`, `style/`, `index.html`), nằm cùng thư mục này và người chơi tải xuống được.
- Các thay đổi nêu ở cuối file này. Toàn bộ mã của Giờ Ra Chơi cũng ở dạng mã nguồn mở theo yêu cầu của người dùng giấy phép.
- Giữ nguyên thông báo bản quyền và giấy phép của dự án gốc.

## Thư viện đi kèm (`vendor/`)

jQuery 1.9.1 (MIT), Hammer.JS 1.1.2 (MIT), js-cookie 2.0.0-pre (MIT), Keypress 1.0.8 (Apache-2.0), SweetAlert (MIT), JSONfn.
Font Exo 2 (SIL OFL) trong `style/fonts/`. Các font không được dùng (Lovelo, Quattrocento Sans, Roboto) và Font Awesome không được đưa vào.

## Thay đổi so với bản gốc

- Gỡ Google Analytics, quảng cáo Google AdSense, nút chia sẻ Facebook/Twitter, liên kết cửa hàng ứng dụng và các thẻ meta mạng xã hội.
- **Gỡ lệnh gửi điểm số tới một địa chỉ IP lạ** (`http://54.183.184.126/<điểm>`) mà bản gốc gọi mỗi khi game over, và gỡ đoạn mã tự tải script từ `http://hextris.io/a.js`.
- Thêm `grc-glue.js`: gửi điểm khi game over, tự tạm dừng khi rời tab hoặc hết giờ.
