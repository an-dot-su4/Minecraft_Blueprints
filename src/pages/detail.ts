import { blueprintPath } from '../shared/editions';
import type { Edition } from '../shared/types';
import { loadBlueprint, url } from '../site';
import { renderBlueprint } from '../viewer/blueprint-view';
import { esc } from '../viewer/svg';

export async function renderDetail(root: HTMLElement, edition: Edition, slug: string) {
  root.innerHTML = '<p>読み込み中…</p>';
  let bp;
  try {
    bp = await loadBlueprint(edition, slug);
  } catch (e) {
    root.innerHTML = `<h1>読み込めませんでした</h1><p class="warn">${esc((e as Error).message)}</p>`;
    return;
  }
  if (!bp) {
    document.title = '設計図が見つかりません';
    root.innerHTML = `<h1>設計図が見つかりません</h1><p>URL が正しいか確かめてください。</p><p><a href="${url()}">一覧へ戻る</a></p>`;
    return;
  }
  document.title = bp.title;
  const shareUrl = location.origin + url(blueprintPath(edition, slug));

  root.innerHTML = `
    <div class="row">
      <a class="btn" href="${url(`?edition=${edition}`)}">← 一覧</a>
      <button data-el="copy">URL をコピー</button>
      <a class="btn" href="${url(`data/${edition}/${slug}.json`)}" download="${esc(slug)}.json">JSON</a>
    </div>
    <article data-el="bp"></article>`;
  const copy = root.querySelector<HTMLButtonElement>('[data-el="copy"]')!;
  copy.onclick = async () => {
    try { await navigator.clipboard.writeText(shareUrl); copy.textContent = 'コピーしました'; }
    catch { prompt('この URL をコピーしてください', shareUrl); }
  };
  return renderBlueprint(root.querySelector<HTMLElement>('[data-el="bp"]')!, bp);
}
