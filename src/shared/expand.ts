import type { Block, Blueprint, Box, Op } from './types';

export const LIMITS = {
  coord: 1024,
  /** 1つの操作で触れるマスの最大数 */
  opVolume: 1_000_000,
  /** 全操作で触れるマスの合計 */
  totalVolume: 3_000_000,
  /** 展開後のブロック数 */
  blocks: 300_000,
};

const key = (x: number, y: number, z: number) => `${x},${y},${z}`;

function norm([a, b]: Box) {
  return {
    x0: Math.min(a[0], b[0]), x1: Math.max(a[0], b[0]),
    y0: Math.min(a[1], b[1]), y1: Math.max(a[1], b[1]),
    z0: Math.min(a[2], b[2]), z1: Math.max(a[2], b[2]),
  };
}

export function boxVolume(box: Box): number {
  const n = norm(box);
  return (n.x1 - n.x0 + 1) * (n.y1 - n.y0 + 1) * (n.z1 - n.z0 + 1);
}

export function opVolume(op: Op): number {
  if ('set' in op) return 1;
  if ('fill' in op) return boxVolume(op.fill);
  if ('walls' in op) return boxVolume(op.walls);
  return boxVolume(op.clear);
}

/**
 * ops と blocks を順に適用してブロックの一覧にする。後から置いたものが上書きする。
 * blocks → ops の順に適用する。
 */
export function expand(bp: Pick<Blueprint, 'ops' | 'blocks'>): Block[] {
  const map = new Map<string, Block>();
  const put = (x: number, y: number, z: number, t: string, d: Block['d'], keep = false) => {
    const k = key(x, y, z);
    if (keep && map.has(k)) return;
    map.set(k, d ? { x, y, z, t, d } : { x, y, z, t });
  };

  for (const [x, y, z, t, d] of bp.blocks ?? []) put(x, y, z, t, d);

  for (const op of bp.ops ?? []) {
    if ('set' in op) {
      const [x, y, z] = op.set;
      put(x, y, z, op.t, op.d);
    } else if ('fill' in op) {
      const n = norm(op.fill);
      for (let y = n.y0; y <= n.y1; y++)
        for (let x = n.x0; x <= n.x1; x++)
          for (let z = n.z0; z <= n.z1; z++) put(x, y, z, op.t, op.d, op.keep);
    } else if ('walls' in op) {
      // 各高さで外周だけを埋める（上下のふたは作らない）
      const n = norm(op.walls);
      for (let y = n.y0; y <= n.y1; y++)
        for (let x = n.x0; x <= n.x1; x++)
          for (let z = n.z0; z <= n.z1; z++) {
            if (x !== n.x0 && x !== n.x1 && z !== n.z0 && z !== n.z1) continue;
            put(x, y, z, op.t, op.d, op.keep);
          }
    } else {
      const n = norm(op.clear);
      for (let y = n.y0; y <= n.y1; y++)
        for (let x = n.x0; x <= n.x1; x++)
          for (let z = n.z0; z <= n.z1; z++) map.delete(key(x, y, z));
    }
  }
  return [...map.values()];
}

export interface Bounds {
  x0: number; x1: number; y0: number; y1: number; z0: number; z1: number;
}

export function bounds(blocks: Block[]): Bounds {
  if (!blocks.length) return { x0: 0, x1: 0, y0: 0, y1: 0, z0: 0, z1: 0 };
  const b: Bounds = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity, z0: Infinity, z1: -Infinity };
  for (const { x, y, z } of blocks) {
    if (x < b.x0) b.x0 = x; if (x > b.x1) b.x1 = x;
    if (y < b.y0) b.y0 = y; if (y > b.y1) b.y1 = y;
    if (z < b.z0) b.z0 = z; if (z > b.z1) b.z1 = z;
  }
  return b;
}
