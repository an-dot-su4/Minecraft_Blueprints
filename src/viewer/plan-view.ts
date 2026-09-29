import { bounds } from '../shared/expand';
import type { Block, Blueprint, Dir } from '../shared/types';
import { cssVar, esc, inkOn, shortName } from './svg';

const ARROWS: Record<Dir, string> = { N: '↑', S: '↓', W: '←', E: '→', U: '◎', D: '●' };

export interface PlanViewEls {
  svg: SVGSVGElement;
  select: HTMLSelectElement;
  up: HTMLButtonElement;
  down: HTMLButtonElement;
  stats: HTMLElement;
  legend: HTMLElement;
}

/** 段ごとの配置図（上が北） */
export function createPlanView(els: PlanViewEls, bp: Blueprint, blocks: Block[]) {
  const b = bounds(blocks);
  const ys = [...new Set(blocks.map((bl) => bl.y))].sort((p, q) => p - q);
  const byY = new Map<number, Block[]>();
  for (const bl of blocks) (byY.get(bl.y) ?? byY.set(bl.y, []).get(bl.y)!).push(bl);
  const lname = (y: number) => bp.layerNames?.[String(y)] ?? '';

  els.select.innerHTML = ys.map((y) => `<option value="${y}">高さ ${y}${lname(y) ? '：' + esc(lname(y)) : ''}</option>`).join('');
  // 最初はブロックが一番多い段を出す
  const busiest = ys.reduce((best, y) => (byY.get(y)!.length > byY.get(best)!.length ? y : best), ys[0]);
  els.select.value = String(bp.markers?.length ? Math.floor(bp.markers[0].pos[1]) + 1 : busiest);
  if (!els.select.value) els.select.value = String(busiest);

  els.down.onclick = () => { if (els.select.selectedIndex > 0) { els.select.selectedIndex--; draw(); } };
  els.up.onclick = () => { if (els.select.selectedIndex < ys.length - 1) { els.select.selectedIndex++; draw(); } };
  els.select.onchange = draw;

  els.legend.innerHTML = Object.entries(bp.palette)
    .filter(([t]) => blocks.some((bl) => bl.t === t))
    .map(([, p]) => `<span><i style="background:${p.color}"></i>${esc(p.name)}</span>`)
    .join('');

  function draw() {
    const y = Number(els.select.value);
    const c = 15, m = 24;
    const w = m + (b.x1 - b.x0 + 1) * c + 2;
    const h = m + (b.z1 - b.z0 + 1) * c + 2;
    const svg = els.svg;
    svg.setAttribute('width', String(w));
    svg.setAttribute('height', String(h));
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    const grid = cssVar('--grid'), sub = cssVar('--sub');
    const px = (x: number) => m + (x - b.x0) * c;
    const pz = (z: number) => m + (z - b.z0) * c;

    let s = '';
    for (let x = b.x0; x <= b.x1; x++)
      for (let z = b.z0; z <= b.z1; z++) s += `<rect x="${px(x)}" y="${pz(z)}" width="${c}" height="${c}" fill="none" stroke="${grid}"/>`;
    for (let x = b.x0; x <= b.x1; x++) if (x % 5 === 0) s += `<text x="${px(x) + c / 2}" y="15" font-size="10" text-anchor="middle" fill="${sub}">${x}</text>`;
    for (let z = b.z0; z <= b.z1; z++) if (z % 5 === 0) s += `<text x="${m - 4}" y="${pz(z) + c / 2 + 4}" font-size="10" text-anchor="end" fill="${sub}">${z}</text>`;

    const layer = byY.get(y) ?? [];
    const counts: Record<string, number> = {};
    for (const bl of layer) {
      counts[bl.t] = (counts[bl.t] ?? 0) + 1;
      const p = bp.palette[bl.t];
      const color = p?.color ?? '#888888';
      const X = px(bl.x), Z = pz(bl.z);
      if (p?.shape === 'trapdoor') {
        const t = 4;
        const [rx, ry, rw, rh] =
          bl.d === 'S' ? [X + 1, Z + c - t, c - 2, t] :
          bl.d === 'E' ? [X + c - t, Z + 1, t, c - 2] :
          bl.d === 'W' ? [X, Z + 1, t, c - 2] : [X + 1, Z, c - 2, t];
        s += `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="${color}" stroke="rgba(0,0,0,.5)"/>`;
        continue;
      }
      if (p?.shape === 'torch') {
        s += `<circle cx="${X + c / 2}" cy="${Z + c / 2}" r="4" fill="${color}" stroke="rgba(0,0,0,.5)"/>`;
        continue;
      }
      s += `<rect x="${X + 1}" y="${Z + 1}" width="${c - 2}" height="${c - 2}" fill="${color}" stroke="rgba(0,0,0,.4)"/>`;
      const lab = bl.d ? ARROWS[bl.d] : p?.label ?? '';
      if (lab) s += `<text x="${X + c / 2}" y="${Z + c / 2 + 4}" font-size="10" text-anchor="middle" fill="${inkOn(color)}">${esc(lab)}</text>`;
    }
    for (const mk of bp.markers ?? []) {
      const [mx, my, mz] = mk.pos;
      if (y < Math.floor(my) || y > Math.floor(my + 1.8)) continue;
      const cx = px(Math.floor(mx)) + c / 2, cz = pz(Math.floor(mz)) + c / 2;
      s += mk.style === 'ghost'
        ? `<circle cx="${cx}" cy="${cz}" r="3.5" fill="none" stroke="#d9433b" stroke-width="1.5"><title>${esc(mk.label)}</title></circle>`
        : `<circle cx="${cx}" cy="${cz}" r="4.5" fill="#d9433b"><title>${esc(mk.label)}</title></circle>`;
    }
    svg.innerHTML = s;

    const parts = Object.entries(counts)
      .filter(([t]) => bp.palette[t]?.count !== false)
      .map(([t, k]) => `${shortName(bp.palette[t]?.name ?? t)} ${k}`);
    const marks = (bp.markers ?? []).filter((mk) => y >= Math.floor(mk.pos[1]) && y <= Math.floor(mk.pos[1] + 1.8));
    els.stats.textContent =
      `高さ ${y}${lname(y) ? `（${lname(y)}）` : ''}：${parts.join('、') || 'ブロックなし'}` +
      (marks.length ? `。赤い印：${marks.map((mk) => `${mk.style === 'ghost' ? '輪' : '点'}＝${mk.label}`).join('、')}` : '');
  }

  draw();
  return { redraw: draw };
}
