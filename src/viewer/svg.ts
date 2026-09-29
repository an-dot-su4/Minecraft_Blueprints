export function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** 色が明るければ黒、暗ければ白の文字色を返す */
export function inkOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#222' : '#fff';
}

/** 「トラップドア（開ける）」→「トラップドア」 */
export function shortName(name: string): string {
  return name.replace(/（.*?）|\(.*?\)/g, '');
}
