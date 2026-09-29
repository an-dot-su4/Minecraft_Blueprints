import { ApiError, api, mine } from '../api';
import { blueprintPath } from '../shared/editions';
import type { Edition } from '../shared/types';
import { renderBlueprint } from '../viewer/blueprint-view';
import { esc } from '../viewer/svg';

export const JUST_POSTED = 'mcbp:justPosted';

export async function renderDetail(root: HTMLElement, edition: Edition, id: string) {
  root.innerHTML = '<p>読み込み中…</p>';
  let stored;
  try {
    stored = await api.get(id);
  } catch (x) {
    document.title = '設計図が見つかりません';
    root.innerHTML = x instanceof ApiError && x.status === 404
      ? '<h1>設計図が見つかりません</h1><p>URL が正しいか確かめてください。消された可能性もあります。</p>'
      : `<h1>読み込めませんでした</h1><p class="warn">${esc((x as Error).message)}</p>`;
    return;
  }
  // 版が URL と違うときは正しい URL に直す
  if (stored.edition !== edition) history.replaceState(null, '', blueprintPath(stored.edition, id));
  document.title = stored.blueprint.title;

  const path = blueprintPath(stored.edition, id);
  const shareUrl = location.origin + path;
  const editKey = mine.key(id);

  let notice = '';
  try {
    const just = JSON.parse(sessionStorage.getItem(JUST_POSTED) ?? 'null');
    if (just?.id === id) {
      sessionStorage.removeItem(JUST_POSTED);
      const editUrl = `${shareUrl}/edit#key=${encodeURIComponent(just.editKey)}`;
      notice = `<div class="notice" role="status">
        <p class="ok"><b>${just.created ? '投稿しました。' : '更新しました。'}</b></p>
        ${just.created ? `<p>見せたい人にはこの URL を送ってください。</p><p><code>${esc(shareUrl)}</code></p>
        <p class="warn">あとで直すときは次の<b>編集用リンク</b>が必要です。人には送らず、メモなどに残しておいてください（この端末には保存済みです）。</p>
        <p><code>${esc(editUrl)}</code></p>` : ''}
      </div>`;
    }
  } catch { /* sessionStorage が使えない環境では出さない */ }

  root.innerHTML = `${notice}
    <div class="row">
      <button data-el="copy">URL をコピー</button>
      ${editKey ? `<a class="btn" href="${path}/edit#key=${encodeURIComponent(editKey)}">編集する</a>` : ''}
    </div>
    <article data-el="bp"></article>`;
  const copy = root.querySelector<HTMLButtonElement>('[data-el="copy"]')!;
  copy.onclick = async () => {
    try { await navigator.clipboard.writeText(shareUrl); copy.textContent = 'コピーしました'; }
    catch { prompt('この URL をコピーしてください', shareUrl); }
  };
  return renderBlueprint(root.querySelector<HTMLElement>('[data-el="bp"]')!, stored.blueprint);
}
