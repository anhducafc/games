import { describe, expect, it } from 'vitest';
import { isNameAllowed } from '../src/profanity';

describe('lọc tên', () => {
  const bad = ['fuck', 'FUCK you', 'f u c k', 'f.u.c.k', 'fuuuuck', 'sh1t', 'f@ck', 'b!tch', 'Asshole', 'ass', 'D1CK', 'porn', 'sexy boy',
    'Lồn', 'địt mẹ', 'ĐỤ', 'đm', 'Đ.M', 'ditme', 'Dit Me May', 'dume', 'cặc', 'buồi', 'vcl', 'VL', 'dcm', 'cai lon', 'con cac', 'thằng chó', 'mẹ mày', 'Hitler'];
  const ok = ['Bé Na', 'Minh Anh', 'Nguyễn Văn Lộc', 'Đức Dũng', 'Phúc Lợi', 'Tí Hon', 'Tít', 'Classic', 'Assassin', 'Hello', 'Dickens', 'Sussex',
    'Cockpit', 'Scunthorpe', 'Đụng Độ', 'Buổi Sáng', 'Cu Tí', 'Lan Anh', 'Đạt', 'Bassman', 'Ngư', 'Chó Con 123', 'Thanh Dung', 'Mẹ Hiền', 'Player1', 'Kim Chi', 'Đĩa Bay'];
  it.each(bad)('chặn %s', (n) => expect(isNameAllowed(n)).toBe(false));
  it.each(ok)('cho phép %s', (n) => expect(isNameAllowed(n)).toBe(true));
});
