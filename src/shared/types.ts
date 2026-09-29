// 設計図データの型。schema/blueprint.schema.json と対応させる。

export type Edition = 'bedrock' | 'java';
export type Dir = 'N' | 'S' | 'E' | 'W' | 'U' | 'D';
export type Vec3 = [number, number, number];

export type Shape =
  | 'box'
  | 'slabBottom'
  | 'slabTop'
  | 'carpet'
  | 'trapdoor'
  | 'torch'
  | 'liquid'
  | 'flowing';

export interface PaletteEntry {
  /** 凡例・配置図に出す名前 */
  name: string;
  /** 表示色 (#rrggbb) */
  color: string;
  shape?: Shape;
  /** 配置図のマスに出す短い文字（例: "下"）。向きのあるブロックは矢印が優先 */
  label?: string;
  /** 素材表でまとめる名前。省略時は name */
  item?: string;
  /** false なら素材表に数えない（流れる水など） */
  count?: boolean;
  /** ゲーム内のブロックID（例: minecraft:hopper） */
  mc?: string;
}

/** min と max は両端を含む。順番は逆でもよい */
export type Box = [Vec3, Vec3];

export type Op =
  | { fill: Box; t: string; d?: Dir; keep?: boolean }
  | { walls: Box; t: string; d?: Dir; keep?: boolean }
  | { set: Vec3; t: string; d?: Dir }
  | { clear: Box };

/** [x, y, z, パレットのキー, 向き] */
export type RawBlock = [number, number, number, string] | [number, number, number, string, Dir];

export interface Marker {
  /** 足もとの位置。y は小数でもよい（ハーフの上なら -1.5 など） */
  pos: Vec3;
  label: string;
  style?: 'solid' | 'ghost';
}

export type Range = [number | null, number | null];

export interface View {
  id: string;
  label: string;
  caption?: string;
  clip?: { x?: Range; y?: Range; z?: Range };
  exclude?: string[];
  camera?: Vec3;
  target?: Vec3;
  /** 画面に収める幅（ブロック数） */
  size?: number;
}

export interface SideView {
  /** "x" なら x=at の断面を z 方向に並べる。"z" なら z=at の断面を x 方向に並べる */
  slice: 'x' | 'z';
  at: number;
  alsoShow?: { t: string; at: number }[];
  labels?: [number, string][];
}

export interface MaterialExtra {
  name: string;
  count: string;
  note?: string;
}

export interface Blueprint {
  schemaVersion: 1;
  edition: Edition;
  title: string;
  summary?: string;
  author?: string;
  tags?: string[];
  palette: Record<string, PaletteEntry>;
  ops?: Op[];
  blocks?: RawBlock[];
  layerNames?: Record<string, string>;
  markers?: Marker[];
  views?: View[];
  sideView?: SideView;
  notes?: { viewer?: string; side?: string; plan?: string };
  materials?: {
    /** item 名 → 補足。{n} は合計、{n*5} は掛け算、{パレットのキー} はその種類の数 */
    notes?: Record<string, string>;
    extra?: MaterialExtra[];
  };
  /** Markdown */
  steps?: string;
  /** Markdown */
  usage?: string;
}

export interface Block {
  x: number;
  y: number;
  z: number;
  t: string;
  d?: Dir;
}

/** 一覧 API が返す1件分 */
export interface BlueprintSummary {
  id: string;
  edition: Edition;
  title: string;
  summary: string;
  author: string;
  tags: string[];
  blockCount: number;
  createdAt: string;
  updatedAt: string;
}
