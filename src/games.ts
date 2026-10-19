// Danh mục game. Thêm game mới chỉ cần thêm một mục vào mảng GAMES.
// kind 'local' : game nằm trong public/games/<id>/index.html (tự làm hoặc mã nguồn mở tự host)
// kind 'embed' : nhúng từ dịch vụ bên ngoài có cho phép nhúng (vd. Lichess)

export type GameKind = 'local' | 'embed';
export type GameStatus = 'ready' | 'soon';

export interface Credit {
  author: string;
  license: string;
  url: string;
  /** điều kiện sử dụng cần nhắc người đọc (hiện ở trang chơi và trang Giới thiệu) */
  notes?: string;
  /** đường dẫn tới file giấy phép chi tiết, tính từ thư mục gốc của site */
  licenseFile?: string;
}

export interface Game {
  id: string;
  name: string;
  color: string;
  big?: boolean;
  isNew?: boolean;
  kind: GameKind;
  status: GameStatus;
  /** đường dẫn (local) hoặc URL (embed) */
  src?: string;
  /** thuộc tính sandbox cho iframe */
  sandbox?: string;
  /** có ảnh minh hoạ tại public/thumbs/<id>.jpg */
  thumb?: boolean;
  /** hướng dẫn cách chơi / luật chơi, hiện dưới khung game (mỗi phần tử là một dòng) */
  howTo?: string[];
  credit: Credit;
}

const OWN: Credit = { author: 'Giờ Ra Chơi', license: 'Tự làm (mã nguồn riêng, đồ hoạ CC0)', url: '' };

// Game tự làm chạy trong sandbox chặt: không đọc được dữ liệu của cổng.
const STRICT_SANDBOX = 'allow-scripts allow-pointer-lock';
// Game mã nguồn mở của người khác cần localStorage và WebGL/XHR cùng origin để chạy.
// Mã đã được rà soát và tự host (không nạp mã từ ngoài), nên chấp nhận allow-same-origin.
const OPEN_SOURCE_SANDBOX = 'allow-scripts allow-same-origin allow-pointer-lock';

export const GAMES: Game[] = [
  { id: 'dua-xe-ti-hon', name: 'Đua xe tí hon', color: '#FFB547', big: true, isNew: true, kind: 'local', status: 'ready', src: 'games/dua-xe-ti-hon/index.html', thumb: true, howTo: ['Giữ nút ◀ ▶ (hoặc phím mũi tên / A D) để lái, nút PHANH (hoặc phím ↓ / S) để giảm tốc.', 'Xe tự chạy tới. Chạy qua ô sọc vàng để được tăng tốc.', 'Về đích trước 3 xe máy tính sau 3 vòng. Xe đi lệch ra cỏ sẽ chậm lại.'], credit: OWN },
  { id: 'lat-the', name: 'Lật thẻ trí nhớ', color: '#7FD3C3', howTo: ['Bấm hoặc chạm vào một thẻ để lật, rồi lật thẻ thứ hai.', 'Hai thẻ giống nhau thì được giữ lại, khác nhau thì úp xuống.', 'Nhớ vị trí các thẻ để lật hết bàn với ít lượt nhất.'], kind: 'local', status: 'ready', src: 'games/lat-the/index.html', thumb: true, credit: OWN },
  { id: 'khoi-2048', name: 'Khối 2048', color: '#F7A6C4', kind: 'local', status: 'ready', src: 'games/khoi-2048/index.html', thumb: true, howTo: ['Vuốt ngón tay hoặc bấm phím mũi tên để dồn tất cả khối về một phía.', 'Hai khối cùng số gặp nhau sẽ gộp thành khối gấp đôi. Mục tiêu là tạo khối 2048.', 'Bấm "Đi lại" để lùi một nước.'], credit: OWN },
  { id: 'me-cung', name: 'Mê cung', color: '#9BC3FF', kind: 'local', status: 'ready', src: 'games/me-cung/index.html', thumb: true, howTo: ['Dẫn chấm xanh tới ngôi sao vàng ở góc đối diện trước khi hết giờ.', 'Máy tính: mũi tên hoặc WASD. Điện thoại: vuốt trên mê cung hoặc bấm các nút mũi tên.', 'Mỗi màn mê cung lớn hơn. Ra sớm thì được điểm thưởng.'], credit: OWN },
  {
    id: 'hexgl', name: 'HexGL', color: '#8FB8FF', big: true, howTo: ['Máy tính: mũi tên trái/phải để lái, mũi tên lên để tăng tốc. Phím A/Q hoặc D/E để phanh gấp khi vào cua.', 'Điện thoại: xe tự chạy tới, giữ nút ◀ hoặc ▶ ở hai góc dưới để lái. Nút ⟲ ở góc phải để đua lại. Nên xoay ngang điện thoại và bấm nút toàn màn hình.', 'Đua về đích nhanh nhất, tránh va vào thành đường.'], kind: 'local', status: 'ready',
    src: 'games/hexgl/index.html', sandbox: OPEN_SOURCE_SANDBOX, thumb: true,
    credit: {
      author: 'Thibaut Despoulain (BKcore)',
      license: 'CC BY-NC 3.0 (phi thương mại) và MIT',
      url: 'https://github.com/BKcore/HexGL',
      notes: 'Chỉ dùng cho mục đích phi thương mại. Âm thanh: CC BY 3.0 và Public Domain.',
      licenseFile: 'games/hexgl/LICENSE.md',
    },
  },
  {
    id: 'do-co-hang-ngay', name: 'Đố chiếu hết', color: '#C8B6FF', kind: 'local', status: 'ready', isNew: true,
    src: 'games/do-co/index.html', sandbox: STRICT_SANDBOX, thumb: true,
    howTo: ['Mỗi vòng có 10 câu đố cờ vua: 5 câu chiếu hết trong 1 nước, 5 câu chiếu hết trong 2 nước.', 'Chạm vào quân cờ của mình, các ô có thể đi sẽ hiện chấm. Chạm vào ô muốn đến (hoặc kéo thả quân cờ).', 'Câu 2 nước: đi nước ép đối thủ, đối thủ đỡ xong thì bạn chiếu hết.', 'Bấm "Gợi ý" để xem quân cần đi (trừ 5 điểm). Đi sai trừ 3 điểm.'],
    credit: { author: 'Giờ Ra Chơi', license: 'Tự làm. Dùng thư viện chess.js (BSD-2-Clause)', url: 'https://github.com/jhlywa/chess.js', licenseFile: 'games/do-co/LICENSE-chessjs.txt' },
  },
  { id: 'toan-nhanh', name: 'Toán nhanh', color: '#FFD166', kind: 'local', status: 'ready', src: 'games/toan-nhanh/index.html', thumb: true, howTo: ['Mỗi ván 60 giây. Chọn đáp án đúng của phép tính (bấm phím 1–4 trên máy tính).', 'Trả lời liên tiếp đúng để tăng điểm chuỗi, cứ 5 câu đúng được thêm 3 giây.', 'Trả lời sai bị trừ 3 giây. Phép tính khó dần theo số câu đúng.'], credit: OWN },
  { id: 'do-min', name: 'Dò mìn', color: '#A7D8F0', kind: 'local', status: 'ready', src: 'games/do-min/index.html', thumb: true, howTo: ['Chạm để mở ô. Con số cho biết có bao nhiêu mìn nằm ở 8 ô xung quanh.', 'Chuyển sang nút 🚩 để cắm cờ (hoặc bấm giữ ô, hoặc chuột phải) vào ô nghi có mìn.', 'Mở hết các ô không có mìn để thắng. Ô đầu tiên luôn an toàn.'], credit: OWN },
  {
    id: 'xay-thap', name: 'Xây tháp', color: '#FF9F80', big: true, howTo: ['Bấm chuột hoặc chạm màn hình để thả khối đang trượt.', 'Khối nào thả lệch sẽ bị cắt bớt phần thừa, tháp càng cao khối càng nhỏ.', 'Thả thật khớp để giữ nguyên kích thước; hết khối thì thua.'], kind: 'local', status: 'ready',
    src: 'games/xay-thap/index.html', sandbox: OPEN_SOURCE_SANDBOX, thumb: true,
    credit: {
      author: 'iamkun (BMQB, Inc.)',
      license: 'MIT. Nhạc nền CC BY-SA 3.0',
      url: 'https://github.com/iamkun/tower_game',
      notes: 'Nhạc nền "Caketown" của Matthew Pablo (CC BY-SA 3.0). Âm hiệu ứng và font do Giờ Ra Chơi thay mới.',
      licenseFile: 'games/xay-thap/LICENSE.md',
    },
  },
  { id: 'sudoku', name: 'Sudoku', color: '#BFE3B4', kind: 'local', status: 'ready', src: 'games/sudoku/index.html', thumb: true, howTo: ['Điền số 1–9 vào ô trống sao cho mỗi hàng, cột và khối 3×3 đều có đủ 9 số, không lặp.', 'Chọn ô rồi chọn số ở hàng nút phía dưới. Bật "Ghi chú" để ghi nháp nhiều số.', 'Mắc quá 3 lỗi là thua. Nút Gợi ý điền giúp 1 ô nhưng bị trừ điểm.'], credit: OWN },
  { id: 'tangram', name: 'Xếp hình tangram', color: '#FFC6A8', kind: 'local', status: 'ready', src: 'games/tangram/index.html', thumb: true, howTo: ['Kéo 7 mảnh màu vào hình bóng đen sao cho phủ kín, không đè lên nhau.', 'Chạm một mảnh (hoặc bấm nút ⟳ / phím R) để xoay 45°. Nút ⇋ (phím F) lật mảnh lại.', 'Mảnh tự hít vào các góc gần đó. Mắc kẹt thì bấm 💡 để xem vị trí một mảnh.'], credit: OWN },
  { id: 'slime-nhay-phim', name: 'Slime nhảy phím', color: '#9FE3A0', big: true, isNew: true, howTo: ['Gõ đúng chữ cái đang sáng trên bàn phím để Slime nhảy tới đó. Trên điện thoại thì chạm vào phím đó.', 'Nhảy liên tiếp đúng để tăng combo nhân điểm. Phím vàng nhân 3 điểm.', 'Từ màn 4 có phím đỏ giả: đừng nhảy vào, sẽ mất 1 tim (có 3 tim).'], kind: 'local', status: 'ready', src: 'games/slime-nhay-phim/index.html', thumb: true, credit: OWN },
  { id: 'phat-gach', name: 'Phá gạch', color: '#FFB3D1', kind: 'local', status: 'ready', src: 'games/phat-gach/index.html', thumb: true, howTo: ['Di chuột hoặc kéo ngón tay để điều khiển thanh đỡ (hoặc dùng mũi tên). Bấm hoặc chạm để phóng bóng.', 'Đừng để bóng rơi xuống đáy. Phá hết gạch để qua màn.', 'Gạch rơi ra bóng tròn màu: xanh lá kéo dài thanh, xanh dương chia 3 bóng, hồng thêm mạng.'], credit: OWN },
  {
    id: 'hextris', name: 'Hextris', color: '#B7C9FF', howTo: ['Máy tính: mũi tên trái/phải (hoặc A/D) xoay lục giác, mũi tên xuống để rơi nhanh. Điện thoại: chạm nửa trái hoặc nửa phải màn hình.', 'Xoay để khối màu rơi vào đúng cạnh có cùng màu: từ 3 khối cùng màu liền nhau trở lên sẽ biến mất.', 'Thua khi các khối chất đầy vượt quá vòng viền.'], kind: 'local', status: 'ready',
    src: 'games/hextris/index.html', sandbox: OPEN_SOURCE_SANDBOX, thumb: true,
    credit: {
      author: 'Logan Engstrom, Garrett Finucane',
      license: 'GPL-3.0',
      url: 'https://github.com/Hextris/hextris',
      notes: 'Mã nguồn mở GPL-3.0, mã đã vá nằm trong thư mục game. Đã gỡ quảng cáo, theo dõi và nút chia sẻ.',
      licenseFile: 'games/hextris/LICENSE.md',
    },
  },
  { id: 'block-puzzle', name: 'Block Puzzle', color: '#7ED9A6', kind: 'local', status: 'ready', src: 'games/block-puzzle/index.html', thumb: true, howTo: ['Kéo từng khối ở khay phía dưới thả vào bàn cờ 8×8.', 'Lấp đầy một hàng hoặc một cột để xoá chúng và được điểm. Xoá liên tiếp thì điểm chuỗi tăng.', 'Hết chỗ đặt khối nào là thua, nên đừng để bàn cờ kín.'], credit: OWN },
  { id: 'danh-van', name: 'Đánh vần tiếng Anh', color: '#9FD8FF', isNew: true, kind: 'local', status: 'ready', src: 'games/danh-van/index.html', thumb: true, howTo: ['Nhìn hình, đọc nghĩa tiếng Việt và nghe phát âm (nút 🔊), rồi ghép các chữ cái thành từ tiếng Anh.', 'Chạm các ô chữ cái hoặc gõ bàn phím. Chạm ô đã điền để gỡ chữ.', 'Mỗi vòng 10 từ, từ dễ đến khó. Gợi ý bị trừ điểm. Nếu máy không đọc tiếng, bạn vẫn chơi được.'], credit: OWN },
  { id: 'nonogram', name: 'Nonogram', color: '#E6D3A3', kind: 'local', status: 'ready', src: 'games/nonogram/index.html', thumb: true, howTo: ['Số bên trái và phía trên cho biết có bao nhiêu ô liền nhau cần tô trong hàng hoặc cột đó.', 'Chạm hoặc kéo để tô ô. Dùng chế độ ✕ để đánh dấu ô chắc chắn trống.', 'Tô đúng mọi hàng và cột để hoàn thành bức tranh. Số được gạch khi hàng hoặc cột đã đúng.'], credit: OWN },
  { id: 'co-caro', name: 'Cờ caro', color: '#A8E6CF', kind: 'local', status: 'ready', src: 'games/co-caro/index.html', thumb: true, howTo: ['Bạn đi quân ✕ trước, máy đi quân ○. Chạm vào giao điểm để đặt quân.', 'Ai xếp được 5 quân liền nhau theo hàng, cột hoặc đường chéo trước thì thắng.', 'Hãy chặn khi máy sắp có 4 quân liền. Chọn mức Dễ, Vừa hoặc Khó.'], credit: OWN },
  { id: 'do-co-cac-nuoc', name: 'Đố cờ các nước', color: '#FFD8A8', kind: 'local', status: 'ready', src: 'games/do-co-cac-nuoc/index.html', thumb: true, howTo: ['Mỗi thế cờ, bên trắng đi trước: tìm nước đi ăn được quân có giá trị lớn mà không bị mất lại.', 'Bấm quân rồi bấm ô đến (hoặc kéo thả). Nút 💡 gợi ý quân cần đi.', 'Trả lời đúng nhanh và không dùng gợi ý thì được nhiều điểm hơn.'], credit: OWN },
  { id: 'xep-bai', name: 'Xếp bài', color: '#D0BCFF', kind: 'local', status: 'ready', src: 'games/xep-bai/index.html', thumb: true, howTo: ['Xếp các lá bài lên nhau theo thứ tự giảm dần và xen kẽ màu đỏ/đen ở bảy cột.', 'Chuyển Át lên bốn ô trên cùng rồi xếp tăng dần cùng chất tới K.', 'Bấm chồng bài úp để rút bài. Chọn rút 1 hoặc 3 lá. Có nút Đi lại, Gợi ý và Tự xếp khi đã thắng chắc.'], credit: OWN },
  { id: 'bay-qua-ong', name: 'Bay qua ống', color: '#FFE08A', kind: 'local', status: 'ready', src: 'games/bay-qua-ong/index.html', thumb: true, howTo: ['Chạm vào màn hình, bấm chuột hoặc Space để chim vỗ cánh bay lên.', 'Bay qua khe giữa các ống, mỗi ống qua được là 1 điểm. Chạm ống hoặc mặt đất là thua.', 'Càng về sau khe càng hẹp và chim bay nhanh hơn.'], credit: OWN },
  { id: 'xay-cau', name: 'Xây cầu', color: '#9ED6E8', kind: 'local', status: 'ready', src: 'games/xay-cau/index.html', thumb: true, howTo: ['Mỗi hòn đảo có một con số là số cầu cần nối tới nó.', 'Chạm đảo này rồi chạm đảo khác cùng hàng hoặc cột để xây cầu. Chạm lần nữa thành cầu đôi, lần ba thì phá.', 'Cầu không được cắt nhau và tất cả đảo phải liên thông thành một mạng.'], credit: OWN },
  { id: 'the-gioi-khoi', name: 'Thế giới khối', color: '#B9E07A', big: true, isNew: true, kind: 'local', status: 'ready', src: 'games/the-gioi-khoi/index.html', thumb: true, howTo: ['Chạm vào khối để đặt thêm khối mới lên trên. Chọn "Đào" để lấy khối đi.', 'Chọn loại khối ở thanh bên dưới. Xoay thế giới bằng nút ⟲ ⟳, đổi ngày/đêm tuỳ thích.', 'Không có thắng thua: cứ xây lâu đài, ngôi nhà hay thành phố của bạn!'], credit: OWN },
];

export function sandboxFor(g: Game): string {
  return g.sandbox ?? STRICT_SANDBOX;
}

export function findGame(id: string): Game | undefined {
  return GAMES.find((g) => g.id === id);
}
