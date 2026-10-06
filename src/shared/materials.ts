import type { Block, Blueprint } from './types';

export interface MaterialRow {
  item: string;
  count: number;
  /** 素材表の色見本に使うパレットのキー */
  swatch: string;
  note?: string;
}

/** ブロック数を item 名ごとにまとめる。並び順はパレットに書いた順 */
export function materials(bp: Blueprint, blocks: Block[]): MaterialRow[] {
  const perType: Record<string, number> = {};
  for (const b of blocks) perType[b.t] = (perType[b.t] ?? 0) + 1;

  const rows = new Map<string, MaterialRow>();
  for (const [t, p] of Object.entries(bp.palette)) {
    const n = perType[t];
    if (!n || p.count === false) continue;
    const item = p.item ?? p.name;
    const row = rows.get(item);
    if (row) row.count += n;
    else rows.set(item, { item, count: n, swatch: t });
  }
  const notes = bp.materials?.notes ?? {};
  for (const row of rows.values()) {
    const tpl = notes[row.item];
    if (tpl) row.note = fillNote(tpl, row.count, perType);
  }
  return [...rows.values()];
}

/** {n} → 合計、{n*5} → 合計×5、{slabB} → その種類の数 */
export function fillNote(tpl: string, n: number, perType: Record<string, number>): string {
  return tpl.replace(/\{([A-Za-z0-9_:.-]+)(?:\*(\d+))?\}/g, (m, name: string, mul?: string) => {
    const base = name === 'n' ? n : perType[name];
    if (base === undefined) return m;
    return String(base * (mul ? Number(mul) : 1));
  });
}

/** 64個で1スタック */
export function stacks(n: number): string {
  const k = Math.floor(n / 64);
  const r = n % 64;
  return k ? `${k}スタック${r ? '＋' + r : ''}` : `${r}個`;
}
