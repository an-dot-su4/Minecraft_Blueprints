import { EDITIONS, EDITION_LIST, blueprintPath } from '../shared/editions';
import type { BlueprintSummary, Edition } from '../shared/types';
import { loadIndex, url } from '../site';
import { esc } from '../viewer/svg';

export async function renderList(root: HTMLElement) {
  document.title = 'マイクラ設計図';
  const params = new URLSearchParams(location.search);
  const edition: Edition = params.get('edition') === 'java' ? 'java' : 'bedrock';
  let tag = params.get('tag') ?? '';

  root.innerHTML = '<p>読み込み中…</p>';
  let all: BlueprintSummary[];
  try {
    all = await loadIndex();
  } catch (e) {
    root.innerHTML = `<h1>設計図</h1><p class="warn">${esc((e as Error).message)}</p>`;
    return;
  }
  const items = all.filter((it) => it.edition === edition);
  const tags = [...new Set(items.flatMap((it) => it.tags))].sort();

  root.innerHTML = `
    <h1>設計図</h1>
    <div class="tabs">${EDITION_LIST.map((e) => {
      const n = all.filter((it) => it.edition === e.id).length;
      return `<a class="btn${e.id === edition ? ' primary' : ''}" href="${url(`?edition=${e.id}`)}">${e.label}（${n}）</a>`;
    }).join('')}</div>
    ${items.length ? `
    <label class="field">さがす<input type="search" data-el="q" placeholder="名前・説明・タグ"></label>
    ${tags.length ? `<div class="row tagrow" data-el="tags">${tags.map((t) => `<button data-tag="${esc(t)}" aria-pressed="${t === tag}">#${esc(t)}</button>`).join('')}</div>` : ''}` : ''}
    <ul class="cards" data-el="cards"></ul>`;

  const cards = root.querySelector<HTMLElement>('[data-el="cards"]')!;
  const q = root.querySelector<HTMLInputElement>('[data-el="q"]');

  function draw() {
    const words = (q?.value ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean);
    const shown = items.filter((it) => {
      if (tag && !it.tags.includes(tag)) return false;
      const text = [it.title, it.summary, it.author, ...it.tags].join(' ').toLowerCase();
      return words.every((w) => text.includes(w));
    });
    cards.innerHTML = shown.length
      ? shown.map((it) => `
        <li><a href="${url(blueprintPath(it.edition, it.id))}">
          <span class="t">${esc(it.title)}</span>
          ${it.summary ? `<p>${esc(it.summary.length > 90 ? it.summary.slice(0, 90) + '…' : it.summary)}</p>` : ''}
          <p class="small">${[it.author && `作: ${esc(it.author)}`, `${it.blockCount.toLocaleString()}ブロック`, ...it.tags.map((t) => `#${esc(t)}`), `更新 ${it.updatedAt.slice(0, 10)}`].filter(Boolean).join(' · ')}</p>
        </a></li>`).join('')
      : `<li><p>${items.length ? '当てはまる設計図がありません。' : `${EDITIONS[edition].label}の設計図はまだありません。`}</p></li>`;
  }

  q?.addEventListener('input', draw);
  root.querySelectorAll<HTMLButtonElement>('[data-tag]').forEach((btn) => {
    btn.onclick = () => {
      tag = tag === btn.dataset.tag ? '' : btn.dataset.tag!;
      root.querySelectorAll('[data-tag]').forEach((b) => b.setAttribute('aria-pressed', String((b as HTMLElement).dataset.tag === tag)));
      draw();
    };
  });
  draw();
}
