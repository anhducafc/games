// Làm sạch tên người chơi: bỏ ký tự điều khiển và ký tự dễ gây lỗi HTML, tối đa 12 ký tự.
export function cleanName(raw) {
  if (typeof raw !== 'string') return '';
  const s = raw.normalize('NFC').replace(/[\u0000-\u001f\u007f-\u009f<>&"'`\\]/g, '').replace(/\s+/g, ' ').trim();
  return Array.from(s).slice(0, 12).join('').trim();
}
