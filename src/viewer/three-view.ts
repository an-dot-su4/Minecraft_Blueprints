import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { bounds } from '../shared/expand';
import type { Block, Blueprint, Marker, Range, View } from '../shared/types';

const MARKER_COLOR = 0xd9433b;

function inRange(v: number, r?: Range) {
  if (!r) return true;
  return (r[0] === null || v >= r[0]) && (r[1] === null || v <= r[1]);
}

function visible(view: View, x: number, y: number, z: number) {
  const c = view.clip;
  return !c || (inRange(x, c.x) && inRange(y, c.y) && inRange(z, c.z));
}

/** views が無い設計図用に、全体が収まる視点を作る */
export function defaultView(blocks: Block[]): View {
  const b = bounds(blocks);
  const cx = (b.x0 + b.x1 + 1) / 2, cy = (b.y0 + b.y1 + 1) / 2, cz = (b.z0 + b.z1 + 1) / 2;
  const size = Math.max(b.x1 - b.x0, b.y1 - b.y0, b.z1 - b.z0) + 6;
  return { id: 'all', label: '全体', caption: '南西の上から', target: [cx, cy, cz], camera: [cx - size * 2, cy + size * 1.5, cz + size * 2], size };
}

export interface ThreeViewHandle {
  views: View[];
  show(id: string): void;
  dispose(): void;
}

export function createThreeView(stage: HTMLElement, caption: HTMLElement, bp: Blueprint, blocks: Block[]): ThreeViewHandle {
  const views = bp.views?.length ? bp.views : [defaultView(blocks)];
  const fallback = defaultView(blocks);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 2));
  const light = new THREE.DirectionalLight(0xffffff, 1.9);
  light.position.set(-30, 60, 40);
  scene.add(light);
  const group = new THREE.Group();
  scene.add(group);

  const geo = {
    box: new THREE.BoxGeometry(1, 1, 1),
    slab: new THREE.BoxGeometry(1, 0.5, 1),
    carpet: new THREE.BoxGeometry(1, 0.0625, 1),
    tdNS: new THREE.BoxGeometry(1, 1, 0.18),
    tdEW: new THREE.BoxGeometry(0.18, 1, 1),
    torch: new THREE.BoxGeometry(0.2, 0.6, 0.2),
    marker: new THREE.BoxGeometry(0.6, 1.8, 0.6),
  };
  const materials: THREE.Material[] = [];

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 5000);
  const controls = new OrbitControls(camera, renderer.domElement);
  let size = 46;

  const render = () => renderer.render(scene, camera);
  controls.addEventListener('change', render);

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    const a = w / h;
    if (a > 1) { camera.left = -size * a / 2; camera.right = size * a / 2; camera.top = size / 2; camera.bottom = -size / 2; }
    else { camera.left = -size / 2; camera.right = size / 2; camera.top = size / a / 2; camera.bottom = -size / a / 2; }
    camera.updateProjectionMatrix();
    render();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(stage);

  function placement(b: Block): { g: THREE.BufferGeometry; p: [number, number, number]; sy?: number } {
    const shape = bp.palette[b.t]?.shape ?? 'box';
    const x = b.x + 0.5, y = b.y + 0.5, z = b.z + 0.5;
    switch (shape) {
      case 'slabBottom': return { g: geo.slab, p: [x, b.y + 0.25, z] };
      case 'slabTop': return { g: geo.slab, p: [x, b.y + 0.75, z] };
      case 'carpet': return { g: geo.carpet, p: [x, b.y + 0.03, z] };
      case 'torch': return { g: geo.torch, p: [x, b.y + 0.3, z] };
      case 'flowing': return { g: geo.box, p: [x, b.y + 0.4, z], sy: 0.8 };
      case 'trapdoor':
        if (b.d === 'E') return { g: geo.tdEW, p: [b.x + 0.91, y, z] };
        if (b.d === 'W') return { g: geo.tdEW, p: [b.x + 0.09, y, z] };
        if (b.d === 'N') return { g: geo.tdNS, p: [x, y, b.z + 0.09] };
        return { g: geo.tdNS, p: [x, y, b.z + 0.91] };
      default: return { g: geo.box, p: [x, y, z] };
    }
  }

  function rebuild(view: View) {
    group.clear();
    materials.splice(0).forEach((m) => m.dispose());
    // 種類と形ごとに InstancedMesh をまとめる
    const buckets = new Map<string, { t: string; g: THREE.BufferGeometry; items: { p: [number, number, number]; sy?: number }[] }>();
    const excluded = new Set(view.exclude ?? []);
    for (const b of blocks) {
      if (excluded.has(b.t) || !visible(view, b.x, b.y, b.z)) continue;
      const pl = placement(b);
      const k = `${b.t}|${pl.g.uuid}`;
      let bucket = buckets.get(k);
      if (!bucket) buckets.set(k, (bucket = { t: b.t, g: pl.g, items: [] }));
      bucket.items.push(pl);
    }
    const m4 = new THREE.Matrix4();
    for (const { t, g, items } of buckets.values()) {
      const shape = bp.palette[t]?.shape;
      const mat = new THREE.MeshLambertMaterial({
        color: bp.palette[t]?.color ?? '#888888',
        transparent: shape === 'liquid' || shape === 'flowing',
        opacity: shape === 'flowing' ? 0.45 : shape === 'liquid' ? 0.7 : 1,
      });
      materials.push(mat);
      const mesh = new THREE.InstancedMesh(g, mat, items.length);
      items.forEach((it, i) => {
        m4.makeScale(1, it.sy ?? 1, 1);
        m4.setPosition(...it.p);
        mesh.setMatrixAt(i, m4);
      });
      group.add(mesh);
    }
    for (const m of bp.markers ?? []) addMarker(view, m);
  }

  function addMarker(view: View, m: Marker) {
    const [x, y, z] = m.pos;
    if (!visible(view, Math.floor(x), Math.floor(y), Math.floor(z))) return;
    const ghost = m.style === 'ghost';
    const mat = new THREE.MeshLambertMaterial({ color: MARKER_COLOR, transparent: ghost, opacity: ghost ? 0.35 : 1 });
    materials.push(mat);
    const mesh = new THREE.Mesh(geo.marker, mat);
    mesh.position.set(x + 0.5, y + 0.9, z + 0.5);
    group.add(mesh);
  }

  function show(id: string) {
    const view = views.find((v) => v.id === id) ?? views[0];
    rebuild(view);
    size = view.size ?? fallback.size!;
    const target = view.target ?? fallback.target!;
    const cam = view.camera ?? fallback.camera!;
    controls.target.set(...target);
    camera.position.set(...cam);
    camera.zoom = 1;
    camera.lookAt(controls.target);
    caption.textContent = view.caption ?? '';
    resize();
    controls.update();
    render();
  }

  return {
    views,
    show,
    dispose() {
      ro.disconnect();
      controls.dispose();
      group.clear();
      materials.forEach((m) => m.dispose());
      Object.values(geo).forEach((g) => g.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
