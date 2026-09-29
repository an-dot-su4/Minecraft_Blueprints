import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { EDITIONS } from '../shared/editions';
import { expand } from '../shared/expand';
import { materials, stacks } from '../shared/materials';
import type { Blueprint } from '../shared/types';
import { createPlanView } from './plan-view';
import { drawSideView } from './side-view';
import { esc } from './svg';
import { createThreeView } from './three-view';

export function markdown(src: string): string {
  return DOMPurify.sanitize(marked.parse(src, { async: false }));
}

/**
 * 設計図1件分の表示（素材表・3D・横から見た図・段ごとの配置図・手順）を root に描く。
 * 戻り値は後片付け用の関数。
 */
export function renderBlueprint(root: HTMLElement, bp: Blueprint): () => void {
  const blocks = expand(bp);
  const rows = materials(bp, blocks);
  const edition = EDITIONS[bp.edition];

  const meta = [edition.label, bp.author ? `作: ${bp.author}` : '', ...(bp.tags ?? []).map((t) => `#${t}`)].filter(Boolean);

  root.innerHTML = `
    <h1>${esc(bp.title)}</h1>
    <p class="meta">${meta.map((m) => `<span>${esc(m)}</span>`).join('')}</p>
    ${bp.summary ? `<p>${esc(bp.summary)}</p>` : ''}

    <div class="box"><table class="mat">${rows.map((r) => `
      <tr><td><i style="background:${bp.palette[r.swatch].color}"></i>${esc(r.item)}${r.note ? `<br><small>${esc(r.note)}</small>` : ''}</td>
      <td>${r.count}個${r.count >= 64 ? `<br><small>${stacks(r.count)}</small>` : ''}</td></tr>`).join('')}
      ${(bp.materials?.extra ?? []).map((e) => `
      <tr><td>${esc(e.name)}${e.note ? `<br><small>${esc(e.note)}</small>` : ''}</td><td>${esc(e.count)}</td></tr>`).join('')}
      <tr class="total"><td>ブロックの合計</td><td>${blocks.filter((b) => bp.palette[b.t]?.count !== false).length}個</td></tr>
    </table></div>

    <div class="stage" data-el="stage"><div class="cap" data-el="cap"></div></div>
    <div class="row" data-el="views"></div>
    <p class="small">${esc(bp.notes?.viewer ?? 'ドラッグで回転、ピンチ・ホイールで拡大。')}</p>

    <section data-el="side-sec">
      <h2>横から見た高さ</h2>
      ${bp.notes?.side ? `<p>${esc(bp.notes.side)}</p>` : ''}
      <div class="side box"><svg data-el="side"></svg></div>
    </section>

    <h2>段ごとの配置図</h2>
    <p>${esc(bp.notes?.plan ?? '上が北です。')}</p>
    <div class="row layer-row">
      <button data-el="down" aria-label="1段下">▼</button>
      <select data-el="layer" aria-label="高さ"></select>
      <button data-el="up" aria-label="1段上">▲</button>
    </div>
    <div class="gridwrap"><svg data-el="plan"></svg></div>
    <div class="legend" data-el="legend"></div>
    <p class="small" data-el="stats"></p>

    ${bp.steps ? `<h2>作る順番</h2><div class="md">${markdown(bp.steps)}</div>` : ''}
    ${bp.usage ? `<h2>使い方</h2><div class="md">${markdown(bp.usage)}</div>` : ''}
  `;
  const el = <T extends Element = HTMLElement>(name: string) => root.querySelector(`[data-el="${name}"]`) as T;

  const three = createThreeView(el('stage'), el('cap'), bp, blocks);
  const viewsRow = el('views');
  viewsRow.innerHTML = three.views.map((v, i) => `<button data-v="${esc(v.id)}" aria-pressed="${i === 0}">${esc(v.label)}</button>`).join('');
  viewsRow.querySelectorAll<HTMLButtonElement>('button').forEach((btn) => {
    btn.onclick = () => {
      three.show(btn.dataset.v!);
      viewsRow.querySelectorAll('button').forEach((o) => o.setAttribute('aria-pressed', String(o === btn)));
    };
  });
  three.show(three.views[0].id);

  const sideSvg = el<SVGSVGElement>('side');
  const drawSide = () => drawSideView(sideSvg, bp, blocks);
  if (!drawSide()) el('side-sec').remove();

  const plan = createPlanView(
    { svg: el<SVGSVGElement>('plan'), select: el<HTMLSelectElement>('layer'), up: el<HTMLButtonElement>('up'), down: el<HTMLButtonElement>('down'), stats: el('stats'), legend: el('legend') },
    bp,
    blocks,
  );

  // ダークモードの切り替えで SVG の線の色を描き直す
  const mq = matchMedia('(prefers-color-scheme: dark)');
  const onScheme = () => { plan.redraw(); drawSide(); };
  mq.addEventListener('change', onScheme);

  return () => {
    mq.removeEventListener('change', onScheme);
    three.dispose();
  };
}
