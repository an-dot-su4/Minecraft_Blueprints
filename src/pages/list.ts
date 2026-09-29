import { ApiError, api, mine, passphrase } from '../api';
import { EDITIONS, EDITION_LIST, blueprintPath } from '../shared/editions';
import type { Edition } from '../shared/types';
import { esc } from '../viewer/svg';
import { renderGate } from './gate';

export async function renderList(root: HTMLElement) {
  document.title = 'マイクラ設計図';
  if (!passphrase.get()) return renderGate(root, '一覧を見る', () => renderList(root));

  const q = new URLSearchParams(location.search).get('edition');
  const edition: Edition = q === 'java' ? 'java' : 'bedrock';

  root.innerHTML = `
    <h1>設計図</h1>
    <div class="tabs">${EDITION_LIST.map((e) => `<a class="btn${e.id === edition ? ' primary' : ''}" href="/?edition=${e.id}">${e.label}</a>`).join('')}</div>
    <ul class="cards" data-el="cards"><li><p>読み込み中…</p></li></ul>
    <section data-el="mine"></section>`;
  const cards = root.querySelector<HTMLElement>('[data-el="cards"]')!;

  const my = mine.list();
  if (my.length) {
    root.querySelector<HTMLElement>('[data-el="mine"]')!.innerHTML = `
      <h2>この端末で投稿したもの</h2>
      <p class="small">編集用リンクはこの端末に保存されています。別の端末で直すときは、投稿したときの編集用リンクを使ってください。</p>
      <ul>${my.map((m) => `<li><a href="${blueprintPath(m.edition, m.id)}">${esc(m.title)}</a>（${EDITIONS[m.edition].label}）
        · <a href="${blueprintPath(m.edition, m.id)}/edit#key=${encodeURIComponent(m.editKey)}">編集</a></li>`).join('')}</ul>`;
  }

  try {
    const { items } = await api.list(edition);
    cards.innerHTML = items.length
      ? items.map((it) => `
        <li><a href="${blueprintPath(it.edition, it.id)}">
          <span class="t">${esc(it.title)}</span>
          ${it.summary ? `<p>${esc(it.summary.length > 90 ? it.summary.slice(0, 90) + '…' : it.summary)}</p>` : ''}
          <p class="small">${[it.author && `作: ${esc(it.author)}`, `${it.blockCount}ブロック`, ...it.tags.map((t) => `#${esc(t)}`), `更新 ${it.updatedAt.slice(0, 10)}`].filter(Boolean).join(' · ')}</p>
        </a></li>`).join('')
      : `<li><p>${EDITIONS[edition].label}の設計図はまだありません。<a href="/new">投稿する</a></p></li>`;
  } catch (x) {
    if (x instanceof ApiError && x.status === 403) {
      passphrase.set(null);
      return renderGate(root, '一覧を見る', () => renderList(root));
    }
    cards.innerHTML = `<li><p class="warn">読み込めませんでした: ${esc(String((x as Error).message))}</p></li>`;
  }
}
