# HexGL

Tác giả: Thibaut Despoulain (BKcore). Mã nguồn gốc: https://github.com/BKcore/HexGL

## Giấy phép (đọc kỹ)

- README của dự án ghi: mã nguồn và tài nguyên theo giấy phép **MIT** (xem `LICENSE-MIT.txt`), **trừ file nào ghi khác trong phần đầu file**.
- Các file lõi của game ghi rõ ở đầu file là **Creative Commons Attribution-NonCommercial 3.0 Unported (CC BY-NC 3.0)**:
  `HexGL.js`, `ShipControls.js`, `ShipEffects.js`, `CameraChase.js`, `Gameplay.js`, `HUD.js`, `RaceData.js`, `tracks/Cityscape.js`.
  Toàn văn: https://creativecommons.org/licenses/by-nc/3.0/
- Hệ quả: HexGL chỉ được dùng cho mục đích **phi thương mại** và phải ghi tác giả.
  Giờ Ra Chơi miễn phí, không quảng cáo, không bán hàng nên đáp ứng điều kiện này.
  **Nếu site bắt đầu kiếm tiền (quảng cáo, thu phí, tài trợ), phải gỡ game này.**

## Thư viện đi kèm

- three.js (bản `50dev`, Mr.doob, MIT), các pass hậu kỳ và shader của alteredq / zz85 / davidedc (three.js, MIT).
- dat.GUI (Data Arts Team, Google Creative Lab, Apache-2.0), stats.js (Mr.doob, MIT).

## Âm thanh (theo `audio/LICENSE` của dự án gốc)

- `boost.ogg`: IFartInUrGeneralDirection, CC BY 3.0
- `crash.ogg`: qubodup, Public Domain
- `wind.ogg`: kangaroovindaloo, CC BY 3.0 (cắt và chỉnh bởi Licson)
- `bg.ogg`: mu6k, Public Domain (chỉnh bởi Licson)
- `destroyed.ogg`: beman87, CC BY 3.0 (chỉnh bởi Licson)

## Đồ hoạ và font

- Mô hình tàu HexMKI: Charnel. Texture đường đua: Nobiax (theo phần Credits trong game).
- Font Bebas Neue (Dharma Type, SIL OFL), file nằm trong `css/`.

## Thay đổi so với bản gốc

- Gỡ Google Analytics, thẻ meta mạng xã hội và favicon tải từ host ngoài. Không nạp `Ladder.js` (bảng xếp hạng online).
- Bỏ lựa chọn điều khiển Leap Motion và thư viện Leap. Bỏ liên kết tới get.webgl.org.
- Chất lượng đồ hoạ mặc định: HIGH trên máy tính, MID trên thiết bị cảm ứng.
- Thêm `grc-glue.js`: gửi điểm khi về đích (điểm = 10 phút trừ thời gian đua, tính theo 0,1 giây), tạm dừng khi rời tab và dừng khi hết giờ.
