// Lọc tên tiếng Anh và tiếng Việt cho bảng xếp hạng. Dùng chung cho trình duyệt (báo ngay) và Worker (chặn thật).
// Không thể bắt hết mọi cách lách, nhưng bắt: viết thường/hoa, bỏ dấu, thay chữ bằng số/ký hiệu (sh1t, f@ck),
// kéo dài chữ (fuuuck), chèn dấu cách hoặc dấu chấm (f u c k). Từ ngắn dễ trùng chữ thường ngày (ass, dick, đụ...)
// chỉ bị chặn khi đứng thành một từ riêng, để không chặn nhầm "Classic", "Assassin", "Đụng"...
// Thêm/bớt từ: sửa các mảng bên dưới.

// Chuỗi dài, ít khi nằm trong từ vô hại: chặn dù dính liền hay bị chèn ký tự. (đã bỏ dấu, viết thường)
const SUBSTR = [
  'fuck', 'shit', 'bitch', 'whore', 'slut', 'nigger', 'nigga', 'faggot', 'asshole', 'bastard', 'pussy', 'penis',
  'vagina', 'porn', 'hitler', 'dickhead', 'motherfuck', 'bullshit', 'jerkoff', 'blowjob', 'handjob', 'cocksuck', 'wanker',
  // tiếng Việt không dấu, dạng ghép dài
  'ditme', 'ditcon', 'ditmay', 'dume', 'dumemay', 'concac', 'cailon', 'oclon', 'lonma', 'loncho', 'caidit', 'cailol',
  'thangcho', 'conchodo', 'chodebu', 'mekiep', 'ditbo', 'lonbo', 'buoilon', 'xamlon',
];
// Chỉ chặn khi là một từ riêng (đã bỏ dấu, quy đổi số/ký hiệu).
const TOKENS = [
  'cunt', 'fack', 'dmcs', 
  'ass', 'arse', 'dick', 'cock', 'piss', 'cum', 'sex', 'sexy', 'anal', 'anus', 'rape', 'raped', 'rapist', 'nazi', 'fag', 'fags',
  'tits', 'boob', 'boobs', 'hoe', 'wtf', 'stfu', 'milf', 'nude', 'nudes', 'kys', 'fuk', 'fck', 'fuq', 'sht', 'btch',
  'bollocks', 'twat', 'prick', 'dildo', 'horny', 'cunts', 'damn', 'crap', 'bitches', 'whores', 'sluts', 'pedo', 'paedo',
  'dcm', 'dmm', 'dkm', 'dcmn', 'vcl', 'vkl', 'vl', 'cmm', 'clgt', 'clm', 'cmn',
];
// Có dấu: nhận diện đúng chữ thô tục tiếng Việt mà bản bỏ dấu của nó trùng từ thường ngày ("buổi", "đụng", "đi"...).
const VI_SUBSTR = ['mất dạy', 'óc chó', 'lồn', 'cặc', 'địt', 'buồi', 'đéo', 'đụ má', 'đụ mẹ', 'chó đẻ', 'đồ chó', 'thằng chó', 'con chó', 'mẹ mày', 'má mày', 'cứt', 'dái'];
const VI_TOKENS = ['đĩ', 'đụ', 'đm', 'đmm', 'đcm', 'đcmn', 'đkm', 'cặc', 'ngu', 'đần', 'điên', 'khùng', 'mất dạy', 'óc chó', 'ngu si'];
const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i', '+': 't', '|': 'l' };

const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
const runs = (s: string) => s.replace(/(.)\1{2,}/g, '$1$1'); // kéo dài chữ: fuuuck -> fuuck
const once = (s: string) => s.replace(/(.)\1+/g, '$1'); // fuuuck -> fuck, và so với từ điển đã gộp chữ lặp
const leet = (s: string) => s.replace(/[01345 7@$!+|]/g, (c) => LEET[c] ?? c);

const SUB_SET = [...new Set([...SUBSTR].map((w) => once(w)))];
const TOK_SET = new Set(TOKENS.map((w) => runs(w)));
const VI_TOK_SET = new Set(VI_TOKENS.map((w) => w.normalize('NFC')));

export function isNameAllowed(name: string): boolean {
  const orig = name.normalize('NFC').toLowerCase();
  // 1) chữ Việt có dấu: tìm theo từ riêng và theo cụm
  const viWords = orig.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  for (const w of viWords) if (VI_TOK_SET.has(w)) return false;
  if (VI_TOK_SET.has(viWords.join(''))) return false; // "Đ.M", "đ m"
  const viJoined = viWords.join(' ');
  for (const p of VI_SUBSTR) if (viJoined.includes(p)) return false;
  // 2) bản bỏ dấu, quy đổi số/ký hiệu thành chữ
  const base = leet(strip(orig));
  const words = base.split(/[^a-z]+/).filter(Boolean);
  for (const w of words) if (TOK_SET.has(runs(w))) return false;
  if (TOK_SET.has(runs(words.join('')))) return false; // "v.l", "f.u.k"
  // 3) dính liền hoặc cách nhau từng chữ ("f u c k", "f.u.c.k")
  const squashed = once(words.join(''));
  for (const p of SUB_SET) if (squashed.includes(p)) return false;
  // chuỗi chữ cái đơn tách rời nối lại: "f u c k" đã xử lý ở trên qua squashed
  return true;
}
