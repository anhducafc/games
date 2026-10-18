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
  credit: Credit;
}

const OWN: Credit = { author: 'Giờ Ra Chơi', license: 'Tự làm (mã nguồn riêng, đồ hoạ CC0)', url: '' };

// Game tự làm chạy trong sandbox chặt: không đọc được dữ liệu của cổng.
const STRICT_SANDBOX = 'allow-scripts allow-pointer-lock';
// Game mã nguồn mở của người khác cần localStorage và WebGL/XHR cùng origin để chạy.
// Mã đã được rà soát và tự host (không nạp mã từ ngoài), nên chấp nhận allow-same-origin.
const OPEN_SOURCE_SANDBOX = 'allow-scripts allow-same-origin allow-pointer-lock';

export const GAMES: Game[] = [
  { id: 'dua-xe-ti-hon', name: 'Đua xe tí hon', color: '#FFB547', big: true, isNew: true, kind: 'local', status: 'soon', credit: OWN },
  { id: 'lat-the', name: 'Lật thẻ trí nhớ', color: '#7FD3C3', kind: 'local', status: 'ready', src: 'games/lat-the/index.html', thumb: true, credit: OWN },
  { id: 'khoi-2048', name: 'Khối 2048', color: '#F7A6C4', kind: 'local', status: 'soon', credit: OWN },
  { id: 'me-cung', name: 'Mê cung', color: '#9BC3FF', kind: 'local', status: 'soon', credit: OWN },
  {
    id: 'hexgl', name: 'HexGL', color: '#8FB8FF', big: true, kind: 'local', status: 'ready',
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
    id: 'do-co-hang-ngay', name: 'Đố cờ hằng ngày', color: '#C8B6FF', kind: 'embed', status: 'ready',
    src: 'https://lichess.org/training/frame?theme=brown&bg=light',
    sandbox: 'allow-scripts allow-same-origin',
    credit: {
      author: 'Lichess.org', license: 'Widget nhúng miễn phí, không quảng cáo', url: 'https://lichess.org/developers',
      notes: 'Game này tải trực tiếp từ lichess.org: Lichess nhận được địa chỉ IP của người chơi và hoạt động theo chính sách riêng của họ. Các game khác không gọi ra ngoài.',
    },
  },
  { id: 'toan-nhanh', name: 'Toán nhanh', color: '#FFD166', kind: 'local', status: 'soon', credit: OWN },
  { id: 'do-min', name: 'Dò mìn', color: '#A7D8F0', kind: 'local', status: 'soon', credit: OWN },
  {
    id: 'xay-thap', name: 'Xây tháp', color: '#FF9F80', big: true, kind: 'local', status: 'ready',
    src: 'games/xay-thap/index.html', sandbox: OPEN_SOURCE_SANDBOX, thumb: true,
    credit: {
      author: 'iamkun (BMQB, Inc.)',
      license: 'MIT. Nhạc nền CC BY-SA 3.0',
      url: 'https://github.com/iamkun/tower_game',
      notes: 'Nhạc nền "Caketown" của Matthew Pablo (CC BY-SA 3.0). Âm hiệu ứng và font do Giờ Ra Chơi thay mới.',
      licenseFile: 'games/xay-thap/LICENSE.md',
    },
  },
  { id: 'sudoku', name: 'Sudoku', color: '#BFE3B4', kind: 'local', status: 'soon', credit: OWN },
  { id: 'tangram', name: 'Xếp hình tangram', color: '#FFC6A8', kind: 'local', status: 'soon', credit: OWN },
  { id: 'slime-nhay-phim', name: 'Slime nhảy phím', color: '#9FE3A0', big: true, isNew: true, kind: 'local', status: 'ready', src: 'games/slime-nhay-phim/index.html', thumb: true, credit: OWN },
  { id: 'phat-gach', name: 'Phá gạch', color: '#FFB3D1', kind: 'local', status: 'soon', credit: OWN },
  {
    id: 'hextris', name: 'Hextris', color: '#B7C9FF', kind: 'local', status: 'ready',
    src: 'games/hextris/index.html', sandbox: OPEN_SOURCE_SANDBOX, thumb: true,
    credit: {
      author: 'Logan Engstrom, Garrett Finucane',
      license: 'GPL-3.0',
      url: 'https://github.com/Hextris/hextris',
      notes: 'Mã nguồn mở GPL-3.0, mã đã vá nằm trong thư mục game. Đã gỡ quảng cáo, theo dõi và nút chia sẻ.',
      licenseFile: 'games/hextris/LICENSE.md',
    },
  },
  { id: 'block-puzzle', name: 'Block Puzzle', color: '#7ED9A6', kind: 'local', status: 'soon', credit: OWN },
  { id: 'danh-van', name: 'Đánh vần tiếng Anh', color: '#9FD8FF', isNew: true, kind: 'local', status: 'soon', credit: OWN },
  { id: 'nonogram', name: 'Nonogram', color: '#E6D3A3', kind: 'local', status: 'soon', credit: OWN },
  { id: 'co-caro', name: 'Cờ caro', color: '#A8E6CF', kind: 'local', status: 'soon', credit: OWN },
  { id: 'do-co-cac-nuoc', name: 'Đố cờ các nước', color: '#FFD8A8', kind: 'local', status: 'soon', credit: OWN },
  { id: 'xep-bai', name: 'Xếp bài', color: '#D0BCFF', kind: 'local', status: 'soon', credit: OWN },
  { id: 'bay-qua-ong', name: 'Bay qua ống', color: '#FFE08A', kind: 'local', status: 'soon', credit: OWN },
  { id: 'xay-cau', name: 'Xây cầu', color: '#9ED6E8', kind: 'local', status: 'soon', credit: OWN },
  { id: 'the-gioi-khoi', name: 'Thế giới khối', color: '#B9E07A', big: true, isNew: true, kind: 'local', status: 'soon', credit: OWN },
];

export function sandboxFor(g: Game): string {
  return g.sandbox ?? STRICT_SANDBOX;
}

export function findGame(id: string): Game | undefined {
  return GAMES.find((g) => g.id === id);
}
