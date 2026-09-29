import { ApiError, api, passphrase } from '../api';

/**
 * 合言葉の入力欄。正しい合言葉が入ったら onPass を呼ぶ。
 * 一覧を見るときと投稿するときに使う（設計図1件の URL は合言葉なしで開ける）。
 */
export function renderGate(root: HTMLElement, purpose: string, onPass: () => void) {
  root.innerHTML = `
    <h1>合言葉</h1>
    <p>${purpose}には合言葉が必要です。サイトを教えてくれた人に聞いてください。一度入れると、この端末では次から聞かれません。</p>
    <form class="box" data-el="form">
      <label class="field">合言葉<input type="password" autocomplete="current-password" required data-el="pass"></label>
      <div class="row"><button class="primary" type="submit">入る</button></div>
      <p class="warn" data-el="err" role="alert"></p>
    </form>`;
  const form = root.querySelector<HTMLFormElement>('[data-el="form"]')!;
  const input = root.querySelector<HTMLInputElement>('[data-el="pass"]')!;
  const err = root.querySelector<HTMLElement>('[data-el="err"]')!;
  input.focus();
  form.onsubmit = async (e) => {
    e.preventDefault();
    err.textContent = '';
    try {
      await api.checkPass(input.value);
      passphrase.set(input.value);
      onPass();
    } catch (x) {
      err.textContent = x instanceof ApiError && x.status === 403 ? '合言葉が違います' : '確認できませんでした。時間をおいてもう一度試してください';
    }
  };
}
