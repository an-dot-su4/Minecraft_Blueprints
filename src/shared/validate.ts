// 設計図 JSON の形式チェック。ブラウザ（投稿前のプレビュー）とサーバー（保存前）の両方で使う。
// Cloudflare Workers では ajv のコード生成が使えないため手書きしている。
// 項目を増やしたら schema/blueprint.schema.json も合わせて直す。

import { LIMITS, expand, opVolume } from './expand';
import type { Blueprint } from './types';

const SHAPES = ['box', 'slabBottom', 'slabTop', 'carpet', 'trapdoor', 'torch', 'liquid', 'flowing'];
const DIRS = ['N', 'S', 'E', 'W', 'U', 'D'];
const TOP_KEYS = [
  'schemaVersion', 'edition', 'title', 'summary', 'author', 'tags', 'palette', 'ops', 'blocks',
  'layerNames', 'markers', 'views', 'sideView', 'notes', 'materials', 'steps', 'usage',
];

export const TEXT_LIMITS = { title: 80, short: 2000, long: 20000 };

export type ValidationResult =
  | { ok: true; value: Blueprint; blockCount: number }
  | { ok: false; errors: string[] };

type Obj = Record<string, unknown>;

export function validateBlueprint(input: unknown): ValidationResult {
  const errors: string[] = [];
  const err = (path: string, msg: string) => {
    if (errors.length < 50) errors.push(`${path}: ${msg}`);
  };

  const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
  const isInt = (v: unknown): v is number =>
    typeof v === 'number' && Number.isInteger(v) && Math.abs(v) <= LIMITS.coord;
  const isNum = (v: unknown): v is number =>
    typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= LIMITS.coord * 4;
  const str = (path: string, v: unknown, max: number, required = false) => {
    if (v === undefined && !required) return;
    if (typeof v !== 'string') return err(path, '文字列にしてください');
    if (required && !v.trim()) return err(path, '空にできません');
    if (v.length > max) err(path, `${max}文字以内にしてください`);
  };
  const vec = (path: string, v: unknown, int = true) => {
    if (!Array.isArray(v) || v.length !== 3 || !v.every(int ? isInt : isNum))
      err(path, `[x, y, z] の${int ? '整数' : '数'}3つにしてください（±${LIMITS.coord}まで）`);
  };
  const box = (path: string, v: unknown) => {
    if (!Array.isArray(v) || v.length !== 2) return err(path, '[[x,y,z], [x,y,z]] にしてください');
    vec(`${path}[0]`, v[0]);
    vec(`${path}[1]`, v[1]);
  };
  const noExtra = (path: string, o: Obj, allowed: string[]) => {
    for (const k of Object.keys(o)) if (!allowed.includes(k)) err(path, `知らない項目「${k}」があります`);
  };

  if (!isObj(input)) return { ok: false, errors: ['設計図は JSON のオブジェクト（{ ... }）にしてください'] };
  const bp = input;
  noExtra('(全体)', bp, TOP_KEYS);

  if (bp.schemaVersion !== 1) err('schemaVersion', '1 にしてください');
  if (bp.edition !== 'bedrock' && bp.edition !== 'java') err('edition', '"bedrock" か "java" にしてください');
  str('title', bp.title, TEXT_LIMITS.title, true);
  str('summary', bp.summary, TEXT_LIMITS.short);
  str('author', bp.author, 40);
  str('steps', bp.steps, TEXT_LIMITS.long);
  str('usage', bp.usage, TEXT_LIMITS.long);

  if (bp.tags !== undefined) {
    if (!Array.isArray(bp.tags) || bp.tags.length > 10) err('tags', '文字列の配列（10個まで）にしてください');
    else bp.tags.forEach((t, i) => str(`tags[${i}]`, t, 20, true));
  }

  // palette
  const paletteKeys = new Set<string>();
  if (!isObj(bp.palette) || !Object.keys(bp.palette).length) {
    err('palette', 'ブロックの種類を1つ以上書いてください');
  } else {
    const keys = Object.keys(bp.palette);
    if (keys.length > 200) err('palette', '200種類までにしてください');
    for (const k of keys) {
      const p = bp.palette[k];
      const path = `palette.${k}`;
      paletteKeys.add(k);
      if (!/^[A-Za-z0-9_:.-]{1,40}$/.test(k)) err(path, 'キーは英数字と _ : . - だけにしてください');
      if (!isObj(p)) { err(path, 'オブジェクトにしてください'); continue; }
      noExtra(path, p, ['name', 'color', 'shape', 'label', 'item', 'count', 'mc']);
      str(`${path}.name`, p.name, 40, true);
      if (typeof p.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(p.color)) err(`${path}.color`, '"#8d949a" のような形にしてください');
      if (p.shape !== undefined && !SHAPES.includes(p.shape as string)) err(`${path}.shape`, `${SHAPES.join(' / ')} のどれかにしてください`);
      str(`${path}.label`, p.label, 2);
      str(`${path}.item`, p.item, 40);
      str(`${path}.mc`, p.mc, 100);
      if (p.count !== undefined && typeof p.count !== 'boolean') err(`${path}.count`, 'true か false にしてください');
    }
  }
  const typeRef = (path: string, t: unknown) => {
    if (typeof t !== 'string' || !paletteKeys.has(t)) err(path, `palette にない種類「${String(t)}」です`);
  };
  const dir = (path: string, d: unknown) => {
    if (d !== undefined && !DIRS.includes(d as string)) err(path, 'N / S / E / W / U / D のどれかにしてください');
  };

  // ops
  let total = 0;
  if (bp.ops !== undefined) {
    if (!Array.isArray(bp.ops)) err('ops', '配列にしてください');
    else if (bp.ops.length > 20000) err('ops', '20000個までにしてください');
    else bp.ops.forEach((op, i) => {
      const path = `ops[${i}]`;
      if (!isObj(op)) return err(path, 'オブジェクトにしてください');
      const kinds = ['fill', 'walls', 'set', 'clear'].filter((k) => k in op);
      if (kinds.length !== 1) return err(path, 'fill / walls / set / clear のどれか1つを書いてください');
      const kind = kinds[0];
      if (kind === 'set') {
        noExtra(path, op, ['set', 't', 'd']);
        vec(`${path}.set`, op.set);
      } else if (kind === 'clear') {
        noExtra(path, op, ['clear']);
        box(`${path}.clear`, op.clear);
      } else {
        noExtra(path, op, [kind, 't', 'd', 'keep']);
        box(`${path}.${kind}`, op[kind]);
        if (op.keep !== undefined && typeof op.keep !== 'boolean') err(`${path}.keep`, 'true か false にしてください');
      }
      if (kind !== 'clear') { typeRef(`${path}.t`, op.t); dir(`${path}.d`, op.d); }
      if (!errors.length) {
        const v = opVolume(op as never);
        total += v;
        if (v > LIMITS.opVolume) err(path, `範囲が大きすぎます（${LIMITS.opVolume.toLocaleString()}マスまで）`);
      }
    });
  }
  if (total > LIMITS.totalVolume) err('ops', `範囲の合計が大きすぎます（${LIMITS.totalVolume.toLocaleString()}マスまで）`);

  // blocks
  if (bp.blocks !== undefined) {
    if (!Array.isArray(bp.blocks)) err('blocks', '配列にしてください');
    else if (bp.blocks.length > LIMITS.blocks) err('blocks', `${LIMITS.blocks.toLocaleString()}個までにしてください`);
    else bp.blocks.forEach((b, i) => {
      const path = `blocks[${i}]`;
      if (!Array.isArray(b) || b.length < 4 || b.length > 5) return err(path, '[x, y, z, "種類"] か [x, y, z, "種類", "向き"] にしてください');
      vec(path, b.slice(0, 3));
      typeRef(`${path}[3]`, b[3]);
      dir(`${path}[4]`, b[4]);
    });
  }
  if (bp.ops === undefined && bp.blocks === undefined) err('(全体)', 'ops か blocks のどちらかでブロックを置いてください');

  // layerNames
  if (bp.layerNames !== undefined) {
    if (!isObj(bp.layerNames)) err('layerNames', 'オブジェクトにしてください');
    else for (const [k, v] of Object.entries(bp.layerNames)) {
      if (!/^-?\d+$/.test(k)) err(`layerNames.${k}`, 'キーは高さ（整数）にしてください');
      str(`layerNames.${k}`, v, 60, true);
    }
  }

  // markers
  if (bp.markers !== undefined) {
    if (!Array.isArray(bp.markers) || bp.markers.length > 50) err('markers', '配列（50個まで）にしてください');
    else bp.markers.forEach((m, i) => {
      const path = `markers[${i}]`;
      if (!isObj(m)) return err(path, 'オブジェクトにしてください');
      noExtra(path, m, ['pos', 'label', 'style']);
      vec(`${path}.pos`, m.pos, false);
      str(`${path}.label`, m.label, 40, true);
      if (m.style !== undefined && m.style !== 'solid' && m.style !== 'ghost') err(`${path}.style`, '"solid" か "ghost" にしてください');
    });
  }

  // views
  if (bp.views !== undefined) {
    const range = (path: string, r: unknown) => {
      if (r === undefined) return;
      if (!Array.isArray(r) || r.length !== 2 || !r.every((v) => v === null || isNum(v))) err(path, '[最小, 最大]（なしは null）にしてください');
    };
    if (!Array.isArray(bp.views) || bp.views.length > 10) err('views', '配列（10個まで）にしてください');
    else bp.views.forEach((v, i) => {
      const path = `views[${i}]`;
      if (!isObj(v)) return err(path, 'オブジェクトにしてください');
      noExtra(path, v, ['id', 'label', 'caption', 'clip', 'exclude', 'camera', 'target', 'size']);
      str(`${path}.id`, v.id, 20, true);
      str(`${path}.label`, v.label, 20, true);
      str(`${path}.caption`, v.caption, 60);
      if (v.clip !== undefined) {
        if (!isObj(v.clip)) err(`${path}.clip`, 'オブジェクトにしてください');
        else { noExtra(`${path}.clip`, v.clip, ['x', 'y', 'z']); for (const a of ['x', 'y', 'z']) range(`${path}.clip.${a}`, v.clip[a]); }
      }
      if (v.exclude !== undefined) {
        if (!Array.isArray(v.exclude)) err(`${path}.exclude`, '配列にしてください');
        else v.exclude.forEach((t, j) => typeRef(`${path}.exclude[${j}]`, t));
      }
      if (v.camera !== undefined) vec(`${path}.camera`, v.camera, false);
      if (v.target !== undefined) vec(`${path}.target`, v.target, false);
      if (v.size !== undefined && !(typeof v.size === 'number' && v.size > 0 && v.size <= 2000)) err(`${path}.size`, '1〜2000 の数にしてください');
    });
  }

  // sideView
  if (bp.sideView !== undefined) {
    const s = bp.sideView;
    if (!isObj(s)) err('sideView', 'オブジェクトにしてください');
    else {
      noExtra('sideView', s, ['slice', 'at', 'alsoShow', 'labels']);
      if (s.slice !== 'x' && s.slice !== 'z') err('sideView.slice', '"x" か "z" にしてください');
      if (!isInt(s.at)) err('sideView.at', '整数にしてください');
      if (s.alsoShow !== undefined) {
        if (!Array.isArray(s.alsoShow)) err('sideView.alsoShow', '配列にしてください');
        else s.alsoShow.forEach((a, i) => {
          if (!isObj(a) || !isInt(a.at)) return err(`sideView.alsoShow[${i}]`, '{ "t": "種類", "at": 整数 } にしてください');
          typeRef(`sideView.alsoShow[${i}].t`, a.t);
        });
      }
      if (s.labels !== undefined) {
        if (!Array.isArray(s.labels) || s.labels.length > 50) err('sideView.labels', '配列（50個まで）にしてください');
        else s.labels.forEach((l, i) => {
          if (!Array.isArray(l) || l.length !== 2 || !isNum(l[0]) || typeof l[1] !== 'string' || l[1].length > 30)
            err(`sideView.labels[${i}]`, '[高さ, "文字"] にしてください');
        });
      }
    }
  }

  // notes
  if (bp.notes !== undefined) {
    if (!isObj(bp.notes)) err('notes', 'オブジェクトにしてください');
    else { noExtra('notes', bp.notes, ['viewer', 'side', 'plan']); for (const k of ['viewer', 'side', 'plan']) str(`notes.${k}`, bp.notes[k], TEXT_LIMITS.short); }
  }

  // materials
  if (bp.materials !== undefined) {
    const m = bp.materials;
    if (!isObj(m)) err('materials', 'オブジェクトにしてください');
    else {
      noExtra('materials', m, ['notes', 'extra']);
      if (m.notes !== undefined) {
        if (!isObj(m.notes)) err('materials.notes', 'オブジェクトにしてください');
        else for (const [k, v] of Object.entries(m.notes)) str(`materials.notes.${k}`, v, 200, true);
      }
      if (m.extra !== undefined) {
        if (!Array.isArray(m.extra) || m.extra.length > 50) err('materials.extra', '配列（50個まで）にしてください');
        else m.extra.forEach((e, i) => {
          const path = `materials.extra[${i}]`;
          if (!isObj(e)) return err(path, 'オブジェクトにしてください');
          noExtra(path, e, ['name', 'count', 'note']);
          str(`${path}.name`, e.name, 40, true);
          str(`${path}.count`, e.count, 20, true);
          str(`${path}.note`, e.note, 200);
        });
      }
    }
  }

  if (errors.length) return { ok: false, errors };

  const blocks = expand(bp as unknown as Blueprint);
  if (blocks.length > LIMITS.blocks) return { ok: false, errors: [`ブロックが多すぎます（${blocks.length.toLocaleString()}個。${LIMITS.blocks.toLocaleString()}個まで）`] };
  if (!blocks.length) return { ok: false, errors: ['ブロックが1つもありません'] };
  return { ok: true, value: bp as unknown as Blueprint, blockCount: blocks.length };
}
