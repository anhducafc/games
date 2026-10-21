# Đua vịt (nhiều người)

Game 1–4 người chơi cùng lúc. Các bạn vào gần nhau được xếp chung một phòng; người vào đầu là chủ phòng, bấm **Bắt đầu** khi có ít nhất 2 người; chỗ trống do **vịt máy** chơi thay. Trước khi vào phòng ai cũng qua màn đặt tên (lọc từ tục EN + VI như bảng xếp hạng).

## Cách chơi
- **QUẪY** (chạm nút, hoặc phím Space) để bơi nhanh. Mỗi cú quẫy tốn sức bền; hết sức thì cú quẫy chỉ còn 25% lực. Sức bền tự hồi khi nghỉ.
- **Đổi làn**: nút ↑ ↓, phím ↑ ↓ / W S, hoặc vuốt lên/xuống trên hồ (mất 0,3 giây, có thời gian chờ).
- **Lá sen** làm chậm gần 1 giây. **Vòng xoáy** tăng tốc 1,6 giây. Vật cản giống nhau cho cả phòng (cùng seed). Vịt không va chạm nhau.
- Điểm gửi lên cổng (`GRC.score`): 300/200/120/60 theo hạng + 1 điểm cho mỗi giây nhanh hơn 120 giây. Chưa về đích: 20 điểm.

## Kiến trúc
- `worker/index.js`: `/api/race/ws` (WebSocket). Chỉ nhận Origin `null` (iframe sandbox) hoặc đúng origin của site.
- `worker/matchmaker.js` (Durable Object `Matchmaker`, một bản duy nhất): chỉ nhớ **phòng đang mở** (id phòng, lưu trong storage của object để không mất khi vắng khách; hết hạn 4 phút). Không lưu tên, không lưu IP.
- `worker/race-room.js` (Durable Object `RaceRoom`, mỗi phòng một bản): giữ trạng thái trong bộ nhớ. Phòng chờ → đếm ngược 3 giây → đua (máy chủ tính, 20 lần/giây, gửi 10 gói/giây) → kết quả → "chơi tiếp" mở lại phòng chờ.
- `worker/race-sim.js`: lõi mô phỏng thuần JS (vật lý, đường đua theo seed, vịt máy, xếp hạng). Có test: `tests/race-sim.test.ts`.
- Client: `public/games/dua-vit/index.html` được **ghép** từ `tools/glue/vit-dua.template.html` + `vit-dua.game.js` + `vit-dua.animals.html` bằng `python3 tools/glue/build-vit-dua.py` (sửa file nguồn rồi chạy lại lệnh này, đừng sửa trực tiếp file trong public).
- Không dùng `<form>` trong game vì iframe sandbox không có `allow-forms`.

## Luật phòng
- Một mình: phải chờ 15 giây rồi mới được "Chơi với vịt máy" (kiểm tra ở máy chủ).
- Phòng chờ quá 3 phút không bắt đầu thì đóng. Người chơi rời giữa ván thì vịt đó thành vịt máy và ván vẫn kết thúc.
- Người đầu tiên bấm "Chơi tiếp cùng nhau" mở lại phòng chờ và làm chủ phòng; ai chưa chọn bị mời ra khỏi phòng, bấm "Chơi tiếp" sau đó thì vào lại đúng phòng đó.
- Chống lạm dụng: tin quá 300 ký tự bị bỏ, tối đa 60 tin/giây/kết nối, tối đa 14 cú quẫy/giây, tên làm sạch và lọc từ tục.

## Deploy
`wrangler.jsonc` đã khai báo `durable_objects` và `migrations` (`new_sqlite_classes`: bắt buộc với gói Workers Free). Lệnh build/deploy vẫn là `npx wrangler deploy` như bảng xếp hạng; lần deploy đầu tiên sẽ tạo hai lớp Durable Object.

## Giới hạn gói Free (Cloudflare, kiểm tra ngày 21/10/2026, nên xem lại)
100.000 request/ngày; thời gian chạy 13.000 GB-giây/ngày; tin WebSocket **gửi lên** tính 20 tin = 1 request (tin gửi xuống không tính). Vượt hạn mức thì thao tác lỗi đến 00:00 UTC. Ước tính (chưa đo ngoài thực tế): mỗi phòng tốn thời gian chạy trong lúc có người kết nối (khoảng 128 MB), 13.000 GB-giây tương đương cỡ vài trăm ván/ngày.

## Chạy thử local
```
printf 'RACE_LEN=300\nRACE_SOLO_WAIT=2\nRACE_CD=1\nRACE_LOBBY_MAX=40\n' > .dev.vars   # đường đua ngắn để test nhanh (KHÔNG deploy file này)
npm run build && npx wrangler dev --local --port 8787
node tests/e2e/race-ws.mjs            # giao thức WebSocket: 2–4 người, chơi một mình, rời giữa ván...
python3 tests/e2e/e2e_dua_vit.py      # giao diện qua cổng (iframe sandbox)
```
Quên xoá `.dev.vars` cũng không sao: file này nằm trong `.gitignore` và không được deploy.

## Giới hạn đã biết
- Chưa thử với người chơi thật qua Internet: độ trễ và cảm giác chơi cần bạn thử cùng bạn bè.
- Chưa có chat, chưa có mã phòng riêng (mọi người vào cùng lúc đều vào phòng mở chung).
- Phòng chờ giữ kết nối trong lúc chờ nên tốn thời gian chạy của Durable Object; đã giới hạn 3 phút.
