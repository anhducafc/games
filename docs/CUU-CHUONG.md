# Cửu chương vui

File duy nhất: `public/games/cuu-chuong/index.html` (HTML + CSS + JS, không file phụ, không gọi mạng).

## Chế độ
- **Nuôi thỏ ăn bánh** (chính): chọn đáp án đúng, Mochi há miệng ăn bánh và lớn dần qua 5 giai đoạn (nơ, khăn, vương miện, lấp lánh).
- **Bắn bóng cửu chương**: 5 bóng rơi, chạm bóng có đáp án đúng. Bóng đúng rơi chạm vạch đỏ thì mất tim; chạm nhầm bóng sai cũng mất tim.

## Cấp độ và số câu
| Cấp | Bảng | Số câu | Giây mỗi câu |
|---|---|---|---|
| 1 Làm quen | 1 (3 câu), 10 (3), 2 (5), 5 (5) | 16 | 15 |
| 2 Quen tay | 3, 4 (8 câu mỗi bảng) | 16 | 12 |
| 3 Tiến bộ | 6, 9 | 16 | 10 |
| 4 Thử thách | 7, 8 | 16 | 8 |
| 5 Cao thủ | trộn 1–10, bảng dễ ít hơn, ưu tiên câu đã sai trong phiên | 20 | 6 |

Chọn riêng bảng ở màn đầu thì chơi tự do (số câu theo `COUNTS`, tốc độ theo cấp đã chọn). Chỉnh số câu ở hằng `COUNTS`, cấp ở mảng `LV`.

## Điểm và sao
- Mỗi câu đúng: `50 x cấp + 5 x cấp x giây còn lại + tối đa 50 điểm liên tiếp`. Cuối ván còn tim: thưởng `50 x cấp x số tim`.
- Sao: từ 90% câu đúng được 3 sao, từ 70% được 2 sao, còn lại 1 sao; hết tim thì 0 sao.
- Điểm gửi qua `GRC.score` lên bảng xếp hạng cuối ván (không gửi ở lượt "Ôn câu sai").
- Do iframe không có localStorage nên chưa lưu tiến độ mở khoá cấp; mọi cấp đều mở sẵn.

## Âm thanh
Nhạc nền và hiệu ứng (ăn, đúng, liên tiếp, bóng nổ, sai, mất tim, đồng hồ 3 giây cuối, sao, thắng, thua) sinh bằng WebAudio, sáng tác riêng, không dùng file. Nút loa tắt/bật tất cả.

## Kiểm thử
`python3 tests/e2e/e2e_cuu_chuong.py` (chạy trên bản build trong `public/`). Hook kiểm thử: `window.__g`.
