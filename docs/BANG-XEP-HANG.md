# Bảng xếp hạng top 5 (máy chủ)

Mỗi game có bảng top 5 điểm cao nhất, lưu ở Cloudflare D1 qua một Worker nhỏ (`worker/index.js`, cấu hình `wrangler.jsonc`).

## Cách hoạt động
- Game gửi điểm bằng `GRC.score(n)` như trước. Cổng đợi 2 giây không có điểm mới, hỏi máy chủ top 5 hiện tại; nếu điểm lọt top 5 thì hiện ô nhập tên (nhớ tên cho lần sau). Mỗi phiên chơi chỉ chiếm một dòng: điểm cao hơn trong cùng phiên cập nhật im lặng.
- API: `GET /api/scores/<id-game>` và `POST /api/scores {game, sid, name, score}`. Tên tối đa 12 ký tự, đã lọc ký tự đặc biệt. Không lưu IP, không cookie. Bảng tạo tự động khi có request đầu tiên.
- Chạy thử trên máy: `npm run worker:dev` (http://localhost:8787, dữ liệu giả lập trong `.wrangler/`). `npm run serve` (máy chủ tĩnh) vẫn chạy được nhưng không có bảng ("chưa khả dụng").
- Test: với `worker:dev` đang chạy, `python3 tests/e2e/e2e_leaderboard.py`.

## Deploy (Cloudflare Workers, nối GitHub)
1. Upload `wrangler.jsonc`, thư mục `worker/`, `src/`, `package.json`, `package-lock.json` lên repo.
2. Dự án Workers phải có lệnh deploy `npx wrangler deploy` (Settings > Build). Tên trong `wrangler.jsonc` ("games") phải trùng tên Worker hiện có.
3. Lần deploy đầu wrangler sẽ tự tạo D1 `gio-ra-choi-scores`. Nếu báo lỗi thiếu database: Workers & Pages > D1 > Create, rồi thêm `"database_id": "<id>"` vào `wrangler.jsonc`.

## Quản trị
- Xem/xoá điểm: dashboard > Storage & Databases > D1 > gio-ra-choi-scores > Console, ví dụ `SELECT * FROM scores ORDER BY ts DESC;` hoặc `DELETE FROM scores WHERE name = '...';`.

## Giới hạn đã biết
- Điểm do trình duyệt gửi lên nên người am hiểu có thể gửi điểm giả (không có cách chống triệt để khi game chạy hoàn toàn ở máy người chơi). Chỉ có kiểm tra cơ bản: số nguyên 1 đến 1 tỷ, đúng định dạng, tối đa 80 game.
- Lọc từ tục tiếng Anh và tiếng Việt ở `src/profanity.ts` (dùng chung cho trình duyệt và Worker; sửa danh sách ở đầu file, test ở `tests/profanity.test.ts`). Không bắt hết được mọi cách lách; xoá thủ công bằng lệnh SQL khi cần.
