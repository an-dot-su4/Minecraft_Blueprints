import { bounds } from '../shared/expand';
import type { Block, Blueprint } from '../shared/types';
import { cssVar, esc } from './svg';

/** 横から見た高さの図。sideView が無い設計図では何も描かない */
export function drawSideView(svg: SVGSVGElement, bp: Blueprint, blocks: Block[]): boolean {
  const sv = bp.sideView;
  if (!sv) return false;
  const s = 9;
  const b = bounds(blocks);
  // slice が x なら横軸は z（左が北）、z なら横軸は x（左が西）
  const h0 = sv.slice === 'x' ? b.z0 : b.x0;
  const h1 = sv.slice === 'x' ? b.z1 : b.x1;
  const along = (bl: Block) => (sv.slice === 'x' ? bl.z : bl.x);
  const across = (bl: Block) => (sv.slice === 'x' ? bl.x : bl.z);
  const bottom = b.y0 - 1;
  const W = 60 + (h1 - h0 + 1) * s + 10;
  const H = (b.y1 - bottom + 2) * s + 20;
  svg.setAttribute('width', String(W));
  svg.setAttribute('height', String(H));
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

  const ink = cssVar('--ink'), sub = cssVar('--sub');
  const Y = (y: number) => H - 10 - (y - bottom) * s;
  const X = (h: number) => 60 + (h - h0) * s;

  const cells = new Map<string, Block>();
  for (const bl of blocks) {
    const hit = across(bl) === sv.at || sv.alsoShow?.some((a) => a.t === bl.t && a.at === across(bl));
    if (hit) cells.set(`${bl.y},${along(bl)}`, bl);
  }

  let o = '';
  for (const bl of cells.values()) {
    const p = bp.palette[bl.t];
    const shape = p?.shape ?? 'box';
    let x = X(along(bl)), w = s, y0 = Y(bl.y) - s, h = s;
    if (shape === 'slabBottom') { h = s / 2; y0 = Y(bl.y) - s / 2; }
    else if (shape === 'slabTop') h = s / 2;
    else if (shape === 'carpet') { h = 2; y0 = Y(bl.y) - 2; }
    else if (shape === 'trapdoor') {
      const near = sv.slice === 'x' ? bl.d === 'N' : bl.d === 'W';
      const far = sv.slice === 'x' ? bl.d === 'S' : bl.d === 'E';
      if (near) w = s / 4;
      else if (far) { w = s / 4; x += s - w; }
    }
    o += `<rect x="${x}" y="${y0}" width="${w}" height="${h}" fill="${p?.color ?? '#888'}"/>`;
  }
  for (const m of bp.markers ?? []) {
    const [mx, my, mz] = m.pos;
    if (Math.floor(sv.slice === 'x' ? mx : mz) !== sv.at) continue;
    const h = sv.slice === 'x' ? mz : mx;
    o += `<rect x="${X(Math.floor(h)) + 2}" y="${Y(my) - 1.8 * s}" width="${s - 4}" height="${1.8 * s}" fill="#d9433b"${m.style === 'ghost' ? ' opacity=".35"' : ''}/>`;
  }
  for (const [y, t] of sv.labels ?? []) {
    o += `<line x1="54" x2="${X(h1 + 1)}" y1="${Y(y)}" y2="${Y(y)}" stroke="${sub}" stroke-dasharray="2 3" stroke-width=".6"/>`;
    o += `<text x="2" y="${Y(y) + 4}" font-size="10" fill="${ink}">${esc(t)}</text>`;
  }
  const [l, r] = sv.slice === 'x' ? ['北 ←', '→ 南'] : ['西 ←', '→ 東'];
  o += `<text x="${X(h0)}" y="12" font-size="10" fill="${sub}">${l}</text>`;
  o += `<text x="${X(h1 + 1)}" y="12" font-size="10" fill="${sub}" text-anchor="end">${r}</text>`;
  svg.innerHTML = o;
  return true;
}
