# Hướng dẫn đưa Giờ Ra Chơi lên mạng

Site hoàn toàn tĩnh (HTML/JS/ảnh), không cần máy chủ hay cơ sở dữ liệu. Chỉ cần một nơi chứa file có HTTPS. Có ba cách, đều miễn phí:

| | Cloudflare Pages kéo-thả | Cloudflare Pages nối Git | GitHub Pages |
|---|---|---|---|
| Thời gian | ~5 phút | ~15 phút | ~15 phút |
| Cần tài khoản | Cloudflare | Cloudflare + GitHub | GitHub |
| Tự cập nhật khi sửa code | Không (tải lại tay) | Có | Có |
| Địa chỉ mặc định | `tên.pages.dev` | `tên.pages.dev` | `user.github.io/repo/` |
| File `_headers` (cache, bảo mật) | Có tác dụng | Có tác dụng | Bị bỏ qua |

**Gợi ý:** để chạy thử ngay hôm nay, dùng **Cloudflare Pages kéo-thả** (cách 1). Khi muốn cập nhật thường xuyên thì chuyển sang cách 2 hoặc 3.

> Tên menu trên các trang web của họ thay đổi theo thời gian. Nếu không thấy đúng chữ, hãy tìm mục "Pages" rồi "Upload assets / Direct Upload".

## 0. Chuẩn bị gói để đưa lên

Cần Node.js 20 trở lên (`node -v`).

```bash
npm install
npm test                 # 9 test của bộ đếm 45 phút phải qua
npm run release          # build + tạo release/gio-ra-choi-site.zip
```

File `release/gio-ra-choi-site.zip` (khoảng 14MB, 260 file) chứa sẵn toàn bộ site ở gốc, kéo thả được ngay. Muốn xem thử trên máy trước khi đưa lên: `npm run serve` rồi mở http://localhost:8080 (hoặc bấm đúp `chay-local.bat`).

## Cách 1. Cloudflare Pages, kéo-thả file zip

1. Đăng ký/đăng nhập https://dash.cloudflare.com (miễn phí).
2. Vào **Workers & Pages** → **Create** → tab **Pages** → **Upload assets** (Direct Upload).
3. Đặt tên dự án, ví dụ `gio-ra-choi`. Tên này thành địa chỉ `gio-ra-choi.pages.dev`.
4. Kéo `gio-ra-choi-site.zip` (hoặc cả thư mục `dist`) vào ô tải lên → **Deploy site**.
5. Chờ vài chục giây, mở địa chỉ được cấp. Xong.

**Cập nhật bản mới:** vào dự án → **Create new deployment** → tải zip mới. Bản cũ vẫn còn trong danh sách, có thể quay lại (xem mục 6).

Giới hạn gói miễn phí của Pages (theo [tài liệu Cloudflare](https://developers.cloudflare.com/pages/platform/limits)): tối đa 20.000 file mỗi bản và 25 MiB mỗi file. Site này có 262 file, file lớn nhất khoảng 1,5MB, nên còn dư nhiều.

## Cách 2. Cloudflare Pages nối GitHub (tự deploy)

1. Đưa code lên GitHub (xem lệnh `git` ở cách 3, bước 1). Repo có thể để riêng tư.
2. Cloudflare: **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → chọn repo.
3. Cấu hình build:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Environment variable: `NODE_VERSION` = `22`
4. **Save and Deploy**. Từ đó mỗi lần push vào `main` là site tự cập nhật. Các nhánh khác có địa chỉ xem thử riêng.

## Cách 3. GitHub Pages (dùng sẵn workflow trong repo)

1. Tạo repo mới trên GitHub, rồi trên máy:
   ```bash
   git init -b main
   git add .
   git commit -m "Giờ Ra Chơi bản đầu"
   git remote add origin https://github.com/<tên-bạn>/<tên-repo>.git
   git push -u origin main
   ```
   (`.gitignore` đã loại `node_modules`, `dist`, `release`.)
2. Trên GitHub: **Settings** → **Pages** → mục **Source** chọn **GitHub Actions**.
3. Vào tab **Actions**: workflow "Deploy GitHub Pages" (file `.github/workflows/deploy.yml`) tự chạy: cài, chạy test, build, đăng. Nếu chưa chạy, bấm **Run workflow**.
4. Site ở `https://<tên-bạn>.github.io/<tên-repo>/`. Dấu `/` cuối là cần thiết.

Lưu ý:
- Gói miễn phí yêu cầu repo **công khai** để dùng Pages với tài khoản cá nhân. Mã nguồn Hextris là GPL nên để công khai cũng hợp với giấy phép.
- Giới hạn Pages (theo [tài liệu GitHub](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)): site tối đa 1 GB, băng thông mềm 100 GB/tháng. HexGL nặng ~16MB nên mỗi lượt tải đầy đủ tốn chừng đó. Với 100 GB là khoảng 6.000 lượt chơi HexGL mỗi tháng, chưa tính game khác. Cloudflare Pages không giới hạn băng thông file tĩnh theo như trang giá của họ (nên kiểm tra lại), nên hợp hơn nếu đông người.
- GitHub không cho dùng Pages làm hosting kinh doanh. Site này phi thương mại nên ổn.

## 4. Tên miền riêng (không bắt buộc)

- **Cloudflare Pages:** dự án → **Custom domains** → **Set up a custom domain**, làm theo hướng dẫn DNS. Nếu tên miền đã ở Cloudflare thì tự cấu hình.
- **GitHub Pages:** **Settings** → **Pages** → **Custom domain**, thêm bản ghi `CNAME` trỏ về `<tên-bạn>.github.io` tại nơi quản lý tên miền, rồi bật **Enforce HTTPS**.

HTTPS do host tự cấp, không cần làm gì thêm. Đổi tên miền hay thư mục không cần sửa code vì mọi đường dẫn đều tương đối.

## 5. Kiểm tra sau khi lên mạng

Chạy script kiểm tra (cần Python và Playwright: `pip install playwright && playwright install chromium`):

```bash
python3 tools/smoke-online.py https://gio-ra-choi.pages.dev/
```

Script mở trang chủ và từng game, kiểm tra: đủ ô game, game tải xong, không gọi host ngoài (trừ Lichess), không lỗi 4xx/5xx, không lỗi console, font nhúng nạp được. Cuối cùng in `TẤT CẢ ĐẠT` hoặc liệt kê mục lỗi. Script này đã chạy đạt trên gói release khi đặt trong thư mục con, nhưng **chưa chạy trên host thật** vì môi trường mình không có tài khoản host của bạn. Hãy chạy nó lần đầu sau khi deploy.

Kiểm tra bằng tay (5 phút):
- [ ] Trang chủ hiện 23 ô, 6 game có ảnh/ô chơi được.
- [ ] Mỗi game bấm vào chơi được, có tiếng (một số trình duyệt đòi bấm một lần mới có tiếng).
- [ ] Thanh "Hôm nay còn" đếm lùi khi đang ở trang chơi, dừng khi rời tab.
- [ ] Chơi hết một ván Slime/Hextris/Xây tháp: điểm hiện ở "Kỷ lục" khi quay lại.
- [ ] Đố cờ hằng ngày hiện bàn cờ (cần mạng ra lichess.org; mạng trường có thể chặn).
- [ ] Trang **Giới thiệu** hiện đủ giấy phép và mở được văn bản giấy phép từng game.
- [ ] Mở trên điện thoại: không tràn ngang, Slime chạm phím được.

## 6. Cập nhật và quay lui

- **Cập nhật:** sửa code → `npm test` → deploy lại (kéo zip mới, hoặc `git push`).
- **Cache:** `index.html` luôn được hỏi lại máy chủ; file `assets/*` có mã băm trong tên nên không bao giờ cũ; mã game được cache 1 giờ. Người chơi thấy bản mới trong vòng 1 giờ, hoặc ngay khi bấm Ctrl+F5.
- **Quay lui Cloudflare:** dự án → **Deployments** → chọn bản cũ → **Rollback to this deployment**.
- **Quay lui GitHub:** `git revert <mã commit>` rồi push.

## 7. Trước khi công khai: giấy phép và quyền riêng tư

- **HexGL là CC BY-NC (chỉ phi thương mại).** Giữ site không quảng cáo, không thu phí. Nếu sau này kiếm tiền: đổi `status` của HexGL thành `'soon'` hoặc xoá mục khỏi `src/games.ts`, và xoá thư mục `public/games/hexgl`.
- **Hextris là GPL-3.0.** Mã game được phục vụ nguyên dạng (không nén) và có link nguồn ở trang Giới thiệu. Giữ file `LICENSE.md` trong thư mục game. Tên "Hextris" gần với Tetris (nhãn hiệu); nếu lo ngại thì đổi tên hiển thị trong `src/games.ts`.
- **Xây tháp:** nhạc nền "Caketown" CC BY-SA 3.0 đã được ghi nguồn ở trang chơi và Giới thiệu.
- **Quyền riêng tư:** cổng không có tài khoản, cookie hay công cụ theo dõi; thời gian chơi và điểm chỉ nằm trong localStorage của trình duyệt người chơi. Ngoại lệ duy nhất là **Đố cờ hằng ngày**: game này tải từ lichess.org nên Lichess nhận IP người chơi theo chính sách của họ (đã ghi chú trong trang chơi). Nếu cần tuyệt đối không gọi ra ngoài, đặt game này về `status: 'soon'`.
- **Giới hạn 45 phút** nằm ở trình duyệt nên học sinh xoá dữ liệu trình duyệt là lách được (theo yêu cầu thiết kế).

## 8. Xử lý sự cố

| Hiện tượng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| Mở `index.html` thấy trang hướng dẫn "Cần chạy bằng máy chủ nhỏ" | Mở bằng `file://` | Dùng `chay-local.bat` hoặc `npm run serve` |
| Trang trắng trên host | Tải lên thiếu file, hoặc tải cả thư mục cha thay vì nội dung `dist` | `index.html` phải nằm ở gốc bản deploy |
| Game báo 404 trên GitHub Pages | Mở địa chỉ thiếu dấu `/` cuối | Dùng `https://user.github.io/repo/` |
| HexGL màn hình đen hoặc báo WebGL | Trình duyệt tắt tăng tốc phần cứng, máy quá yếu | Bật hardware acceleration; thử Chrome mới |
| Không có tiếng | Trình duyệt chặn âm thanh đến khi người dùng bấm | Bấm hoặc gõ phím một lần |
| Khung Đố cờ trống | Mạng chặn lichess.org (trường học, công ty) | Dùng mạng khác; không liên quan đến site |
| Vẫn thấy bản cũ sau khi cập nhật | Cache trình duyệt | Ctrl+F5, hoặc chờ tối đa 1 giờ |
| Cloudflare báo file quá lớn | File > 25 MiB | `npm run release` đã tự dừng và báo tên file nếu vượt |
