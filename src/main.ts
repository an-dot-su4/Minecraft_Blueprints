import './styles.css';
import { editionFromSlug } from './shared/editions';
import { renderDetail } from './pages/detail';
import { renderEditor } from './pages/editor';
import { renderList } from './pages/list';

const main = document.querySelector('main')!;
let cleanup: (() => void) | void;
let current = 0;

export function navigate(path: string) {
  history.pushState(null, '', path);
  route();
}

async function route() {
  const seq = ++current;
  if (cleanup) cleanup();
  cleanup = undefined;
  // 読み込み中に別のページへ移ったら、古いページは描かずに捨てる
  const root = document.createElement('div');
  main.replaceChildren(root);
  window.scrollTo(0, 0);
  const parts = location.pathname.split('/').filter(Boolean);

  let done: (() => void) | void = undefined;
  if (parts.length === 0) done = await renderList(root);
  else if (parts[0] === 'new' && parts.length === 1) done = await renderEditor(root, null);
  else {
    const ed = editionFromSlug(parts[0]);
    if (ed && parts.length === 2) done = await renderDetail(root, ed.id, parts[1]);
    else if (ed && parts.length === 3 && parts[2] === 'edit') done = await renderEditor(root, { edition: ed.id, id: parts[1] });
    else {
      document.title = 'ページがありません';
      root.innerHTML = '<h1>ページがありません</h1><p><a href="/">一覧へ戻る</a></p>';
    }
  }
  if (seq === current) cleanup = done;
  else if (done) done();
}

// サイト内のリンクはページを読み直さずに切り替える
document.addEventListener('click', (e) => {
  const a = (e.target as Element).closest('a');
  if (!a || a.target || a.origin !== location.origin || e.metaKey || e.ctrlKey || e.shiftKey || a.hasAttribute('download')) return;
  if (a.pathname.startsWith('/api/')) return;
  e.preventDefault();
  navigate(a.pathname + a.search + a.hash);
});
addEventListener('popstate', route);
route();
