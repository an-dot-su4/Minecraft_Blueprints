import sample from '../../blueprints/sky-trap-tower.json';
import { ApiError, api, mine, passphrase } from '../api';
import { navigate } from '../main';
import { EDITIONS, blueprintPath } from '../shared/editions';
import type { Blueprint, Edition } from '../shared/types';
import { validateBlueprint } from '../shared/validate';
import { renderBlueprint } from '../viewer/blueprint-view';
import { esc } from '../viewer/svg';
import { JUST_POSTED } from './detail';
import { renderGate } from './gate';

type Target = { edition: Edition; id: string } | null;

/** 投稿（target が null）と編集の画面 */
export async function renderEditor(root: HTMLElement, target: Target): Promise<(() => void) | void> {
  const editing = target !== null;
  document.title = editing ? '設計図を直す' : '設計図を投稿する';
  if (!editing && !passphrase.get()) return renderGate(root, '投稿する', () => renderEditor(root, target));

  let editKey = '';
  let initial = '';
  if (target) {
    editKey = new URLSearchParams(location.hash.slice(1)).get('key') ?? mine.key(target.id) ?? '';
    if (!editKey) {
      root.innerHTML = '<h1>編集用リンクが必要です</h1><p>投稿したときに表示された編集用リンク（URL の最後が <code>#key=...</code>）から開いてください。</p>';
      return;
    }
    try {
      const stored = await api.get(target.id);
      initial = JSON.stringify(stored.blueprint, null, 2);
    } catch (x) {
      root.innerHTML = `<h1>読み込めませんでした</h1><p class="warn">${esc((x as Error).message)}</p>`;
      return;
    }
  }

  root.innerHTML = `
    <h1>${editing ? '設計図を直す' : '設計図を投稿する'}</h1>
    <div class="tabs" role="tablist">
      <button role="tab" aria-pressed="true">JSON を貼る</button>
      <button role="tab" disabled title="準備中">.mcstructure を読み込む（準備中）</button>
      <button role="tab" disabled title="準備中">ブラウザで描く（準備中）</button>
    </div>
    <p>Claude などで作った設計図の JSON を貼り付けるか、ファイルを選んでください。下にプレビューが出ます。書き方は <a href="https://github.com/an-dot-su4/minecraft_blueprints/blob/main/docs/claude-prompt.md" target="_blank" rel="noopener">docs/claude-prompt.md</a> にあります。</p>
    <div class="row">
      <label class="btn">JSON ファイルを選ぶ<input type="file" accept=".json,application/json" hidden data-el="file"></label>
      ${editing ? '' : '<button data-el="sample">サンプルを入れる</button>'}
    </div>
    <label class="field">投稿者名（任意。JSON の author を上書きします）<input data-el="author" maxlength="40"></label>
    <label class="field">設計図の JSON<textarea rows="16" spellcheck="false" data-el="json"></textarea></label>
    <p class="warn errors" data-el="errors" role="alert"></p>
    <div class="row">
      <button class="primary" data-el="submit" disabled>${editing ? '更新する' : '投稿する'}</button>
      ${editing ? '<button data-el="delete">削除する</button>' : ''}
    </div>
    <section class="preview" data-el="preview-sec" hidden>
      <p class="small">プレビュー</p>
      <div data-el="preview"></div>
    </section>`;

  const $ = <T extends HTMLElement>(n: string) => root.querySelector<T>(`[data-el="${n}"]`)!;
  const ta = $<HTMLTextAreaElement>('json');
  const author = $<HTMLInputElement>('author');
  const errorsEl = $('errors');
  const submit = $<HTMLButtonElement>('submit');
  const previewSec = $('preview-sec');
  const preview = $('preview');
  let disposePreview: (() => void) | undefined;
  let current: Blueprint | null = null;
  let timer = 0;

  ta.value = initial;
  if (initial) author.value = JSON.parse(initial).author ?? '';

  function check() {
    disposePreview?.();
    disposePreview = undefined;
    current = null;
    submit.disabled = true;
    const text = ta.value.trim();
    if (!text) { errorsEl.textContent = ''; previewSec.hidden = true; return; }
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      errorsEl.textContent = `JSON として読めません: ${(e as Error).message}`;
      previewSec.hidden = true;
      return;
    }
    if (author.value.trim() && parsed && typeof parsed === 'object') (parsed as Record<string, unknown>).author = author.value.trim();
    const r = validateBlueprint(parsed);
    if (!r.ok) {
      errorsEl.textContent = '直すところがあります:\n' + r.errors.map((e) => '・' + e).join('\n');
      previewSec.hidden = true;
      return;
    }
    if (editing && r.value.edition !== target!.edition) {
      errorsEl.textContent = `版（edition）は変えられません。${EDITIONS[target!.edition].label}のままにしてください。`;
      previewSec.hidden = true;
      return;
    }
    errorsEl.textContent = '';
    current = r.value;
    submit.disabled = false;
    previewSec.hidden = false;
    try {
      disposePreview = renderBlueprint(preview, r.value);
    } catch (e) {
      preview.innerHTML = `<p class="warn">プレビューを表示できませんでした: ${esc((e as Error).message)}</p>`;
    }
  }
  const schedule = () => { clearTimeout(timer); timer = window.setTimeout(check, 400); };
  ta.addEventListener('input', schedule);
  author.addEventListener('input', schedule);

  $<HTMLInputElement>('file').onchange = async (e) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    ta.value = await f.text();
    check();
  };
  if (!editing) $<HTMLButtonElement>('sample').onclick = () => { ta.value = JSON.stringify(sample, null, 2); check(); };

  submit.onclick = async () => {
    if (!current) return;
    submit.disabled = true;
    try {
      if (target) {
        await api.update(target.id, editKey, current);
        mine.put({ id: target.id, edition: target.edition, title: current.title, editKey });
        sessionStorage.setItem(JUST_POSTED, JSON.stringify({ id: target.id, editKey, created: false }));
        navigate(blueprintPath(target.edition, target.id));
      } else {
        const res = await api.create(current);
        mine.put({ id: res.id, edition: res.edition, title: current.title, editKey: res.editKey });
        sessionStorage.setItem(JUST_POSTED, JSON.stringify({ id: res.id, editKey: res.editKey, created: true }));
        navigate(blueprintPath(res.edition, res.id));
      }
    } catch (x) {
      if (x instanceof ApiError && x.status === 403 && !editing) passphrase.set(null);
      errorsEl.textContent = x instanceof ApiError ? x.messages.join('\n') : String(x);
      submit.disabled = false;
    }
  };

  if (target) {
    $<HTMLButtonElement>('delete').onclick = async () => {
      if (!confirm('この設計図を削除します。元に戻せません。よろしいですか？')) return;
      try {
        await api.remove(target.id, editKey);
        mine.remove(target.id);
        navigate('/');
      } catch (x) {
        errorsEl.textContent = x instanceof ApiError ? x.messages.join('\n') : String(x);
      }
    };
  }

  if (initial) check();
  return () => { clearTimeout(timer); disposePreview?.(); };
}
