import './styles.css';
import { editionFromSlug } from './shared/editions';
import { renderDetail } from './pages/detail';
import { renderList } from './pages/list';
import { BASE, url } from './site';

const main = document.querySelector('main')!;
document.querySelector<HTMLAnchorElement>('[data-home]')!.href = url();
let cleanup: (() => void) | void;
let current = 0;

export function navigate(path: string) {
  history.pushState(null, '', path);
  route();
}

function notFound(root: HTMLElement) {
  document.title = 'ページがありません';
  root.innerHTML = `<h1>ページがありません</h1><p>URL が正しいか確かめてください。</p><p><a href="${url()}">一覧へ戻る</a></p>`;
}

async function route() {
  const seq = ++current;
  if (cleanup) cleanup();
  cleanup = undefined;
  // 読み込み中に別のページへ移ったら、古いページは描かずに捨てる
  const root = document.createElement('div');
  main.replaceChildren(root);
  window.scrollTo(0, 0);

  const path = location.pathname.startsWith(BASE) ? location.pathname.slice(BASE.length) : null;
  const parts = (path ?? '').split('/').filter(Boolean);
  let done: (() => void) | void = undefined;
  if (path === null) notFound(root);
  else if (parts.length === 0 || (parts.length === 1 && parts[0] === 'index.html')) done = await renderList(root);
  else {
    const ed = editionFromSlug(parts[0]);
    if (ed && parts.length === 2) done = await renderDetail(root, ed.id, parts[1]);
    else notFound(root);
  }
  if (seq === current) cleanup = done;
  else if (done) done();
}

// サイト内のリンクはページを読み直さずに切り替える
document.addEventListener('click', (e) => {
  const a = (e.target as Element).closest('a');
  if (!a || a.target || a.origin !== location.origin || e.metaKey || e.ctrlKey || e.shiftKey || a.hasAttribute('download')) return;
  if (!a.pathname.startsWith(BASE) || a.pathname.includes('/data/')) return;
  e.preventDefault();
  if (a.pathname + a.search === location.pathname + location.search && a.hash) { location.hash = a.hash; return; }
  navigate(a.pathname + a.search + a.hash);
});
addEventListener('popstate', route);
route();
