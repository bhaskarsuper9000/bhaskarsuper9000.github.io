/** three.js renderer for sim items. Imported lazily by hero.ts, so three.js is its own chunk loaded after first paint. */
import {
  BufferAttribute, BufferGeometry, Color, DoubleSide, Group, Line, LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, PerspectiveCamera, Plane, PlaneGeometry, Raycaster, Scene, ShaderMaterial, Vector2, Vector3, Vector4, WebGLRenderer,
} from 'three';
import { getModel, type Cam, type Cls, type Ground, type Item, type Ring, type Vec3 } from './sim/index';
import type { Palette } from './palette';

export interface Frame { cam: Cam; items: Item[]; ground: Ground; focus: Vec3; ring: Ring | null; ptr: Vec3 | null; fade: number }
export interface Renderer3D {
  setSize(w: number, h: number): void;
  setColors(col: Palette): void;
  clear(): void;
  pointerToGround(nx: number, ny: number, y: number): [number, number] | null;
  render(frame: Frame): { calls: number; triangles: number; lines: number };
}

interface PoolItem { m?: string; dyn: boolean; cap: number; group: Group; line: Line | LineSegments; fill?: Mesh<BufferGeometry, MeshBasicMaterial> }

const BATHY = 'float bathy(vec2 p){return 0.55*sin(p.x*0.21+0.3)*cos(p.y*0.17)+0.35*sin((p.x+p.y)*0.11+1.2)+0.2*sin(p.x*0.5-p.y*0.37);}';
const VERT = `uniform float uAmp; uniform vec4 uRing; uniform float uRingW; uniform float uMinor; varying vec2 vP; varying float vRip;
${BATHY}
void main(){ vec4 w = modelMatrix * vec4(position,1.0); vP = w.xz;
  float d = abs(length(w.xz-uRing.xy)-uRing.z); vRip = exp(-d*d/(uRingW*uRingW))*uRing.w;
  w.y += uAmp*bathy(w.xz) + vRip*uMinor*0.05;
  gl_Position = projectionMatrix * viewMatrix * w; }`;
// grid (mode 0), floor planks (1) or seabed contours (2); brightens under the sweep ring and near the pointer
const FRAG = `uniform vec3 uColor; uniform vec3 uAccent; uniform float uMinor; uniform float uMajor; uniform float uFade; uniform vec2 uCenter;
uniform vec3 uPtr; uniform float uGlowR; uniform float uMode; uniform float uContour; uniform float uAlpha; uniform float uGain; varying vec2 vP; varying float vRip;
${BATHY}
float ln(float v, float w){ float f = abs(fract(v-0.5)-0.5)/fwidth(v); return 1.0-min(f/w,1.0); }
void main(){
  float minor = max(ln(vP.x/uMinor,1.0), ln(vP.y/uMinor,1.0));
  float major = max(ln(vP.x/uMajor,1.1), ln(vP.y/uMajor,1.1));
  float g = minor*0.45 + major*0.85;
  if (uMode > 0.5 && uMode < 1.5) { float row = floor(vP.y/uMinor); float off = fract(row*0.37)*uMajor; g = ln(vP.y/uMinor,1.0)*0.9 + ln((vP.x+off)/uMajor,1.0)*0.7 + ln(vP.y/(uMinor*0.25),0.6)*0.1; }
  if (uMode > 1.5) { float h = bathy(vP)/uContour; g = minor*0.22 + ln(h,1.0)*0.85 + ln(h/5.0,1.3)*0.6; }
  float pd = length(vP-uPtr.xy); float glow = exp(-pd*pd/(uGlowR*uGlowR))*uPtr.z;
  float fadeK = 1.0 - smoothstep(uFade*0.3, uFade, length(vP-uCenter));
  float k = g*(0.75 + 1.5*vRip + 1.3*glow)*uGain + vRip*0.035 + glow*0.025;
  vec3 col = mix(uColor, uAccent, clamp(vRip*0.9+glow*0.8,0.0,1.0));
  gl_FragColor = vec4(col, clamp(k,0.0,1.0)*fadeK*uAlpha); }`;

export function createRenderer(canvas: HTMLCanvasElement): Renderer3D {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  const scene = new Scene(), camera = new PerspectiveCamera(34, 1, 0.02, 800);
  const C: Record<string, Color> = {};
  let pool: Record<string, PoolItem> = {}, fade = 1, isLight = false;

  const gU = {
    uColor: { value: new Color() }, uAccent: { value: new Color() }, uMinor: { value: 2 }, uMajor: { value: 10 }, uFade: { value: 120 },
    uCenter: { value: new Vector2() }, uRing: { value: new Vector4() }, uRingW: { value: 1.5 }, uPtr: { value: new Vector3() },
    uGlowR: { value: 8 }, uMode: { value: 0 }, uAmp: { value: 0 }, uContour: { value: 0.2 }, uAlpha: { value: 1 }, uGain: { value: 1 },
  };
  const ground = new Mesh(new PlaneGeometry(1, 1, 96, 96), new ShaderMaterial({ uniforms: gU, transparent: true, depthWrite: false, vertexShader: VERT, fragmentShader: FRAG }));
  ground.rotation.x = -Math.PI / 2; ground.renderOrder = -10; ground.frustumCulled = false; scene.add(ground);

  function lineStyle(cls: Cls): [Color, number] {
    switch (cls) {
      case 'ego': return [C.accent, 1];
      case 'agent': return [C.agent, 0.95];
      case 'static': return [C.static, isLight ? 0.6 : 0.5];
      case 'world': return [C.world, isLight ? 0.7 : 0.75];
      case 'warn': return [C.warn, 1];
      case 'screen': return [C.accent, 0.6];
      case 'bbox': return [C.accent, 0.9];
      default: return [C.accent, 0.95];
    }
  }
  function fillStyle(cls: Cls): [Color, number] {
    if (cls === 'world') return [C.road, isLight ? 0.55 : 0.6];
    if (cls === 'active') return [C.accent, 0.35];
    if (cls === 'screen') return [C.accent, isLight ? 0.12 : 0.16];
    if (cls === 'ego') return [C.fillEgo, 0.94];
    return [C.fill, 0.9];
  }
  const geom = (arr: Float32Array) => { const g = new BufferGeometry(); g.setAttribute('position', new BufferAttribute(arr, 3)); return g; };
  const lineMat = () => new LineBasicMaterial({ transparent: true, depthWrite: false });

  function make(it: Item): PoolItem {
    const group = new Group();
    let o: PoolItem;
    if (it.strip || it.seg) {
      const cap = it.strip ? 512 * 3 : 4096 * 6, g = geom(new Float32Array(cap));
      const line = it.strip ? new Line(g, lineMat()) : new LineSegments(g, lineMat());
      line.frustumCulled = false; group.add(line);
      o = { m: it.m, dyn: true, cap, group, line };
    } else {
      const M = getModel(it.m ?? '');
      if (!M) throw new Error(`hero: unknown model "${it.m}"`);
      const line = new LineSegments(geom(M.seg), lineMat());
      line.renderOrder = it.cls === 'world' ? -4 : 1;
      o = { m: it.m, dyn: false, cap: 0, group, line };
      if (M.tri.length && !['bbox', 'warn', 'ring'].includes(it.cls)) {
        o.fill = new Mesh(geom(M.tri), new MeshBasicMaterial({ transparent: true, side: DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
        o.fill.renderOrder = it.cls === 'world' ? -5 : 0; group.add(o.fill);
      }
      group.add(line);
      group.rotation.order = 'YXZ';
    }
    scene.add(group);
    return o;
  }
  function style(o: PoolItem, cls: Cls, a: number) {
    const [lc, lo] = lineStyle(cls), lm = o.line.material as LineBasicMaterial;
    lm.color.copy(lc); lm.opacity = lo * a * fade;
    if (o.fill) {
      const [fc, fo] = fillStyle(cls), fm = o.fill.material;
      fm.color.copy(fc); fm.opacity = fo * Math.min(1, a * 1.2) * fade; fm.depthWrite = !['world', 'active', 'screen'].includes(cls);
    }
  }
  function sync(items: Item[]) {
    const used: Record<string, boolean> = {};
    for (const it of items) {
      let o: PoolItem | undefined = pool[it.id];
      if (o && (o.m !== it.m || o.dyn !== !!(it.strip || it.seg))) { scene.remove(o.group); o = undefined; }
      if (!o) o = pool[it.id] = make(it);
      used[it.id] = true;
      const a = it.a ?? 1;
      style(o, it.cls, a);
      o.group.visible = a * fade > 0.004;
      const arr = it.strip ?? it.seg;
      if (o.dyn && arr) {
        const attr = o.line.geometry.attributes.position as BufferAttribute, n = Math.min(arr.length, o.cap);
        (attr.array as Float32Array).set(arr.subarray(0, n)); attr.needsUpdate = true; o.line.geometry.setDrawRange(0, n / 3);
        o.line.renderOrder = 2;
      } else {
        const p = it.p ?? [0, 0, 0];
        o.group.position.set(p[0], p[1], p[2]); o.group.rotation.set(it.pitch ?? 0, it.yaw ?? 0, it.roll ?? 0); o.group.scale.setScalar(it.s ?? 1);
      }
    }
    for (const id in pool) if (!used[id]) pool[id].group.visible = false;
  }

  const ray = new Raycaster(), plane = new Plane(new Vector3(0, 1, 0), 0), hit = new Vector3(), ndc = new Vector2();
  return {
    setSize(w, h) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); },
    setColors(col) {
      isLight = col.light;
      (['accent', 'agent', 'static', 'world', 'grid', 'fill', 'fillEgo', 'road', 'warn'] as const).forEach((k) => { C[k] = new Color(col[k]); });
      gU.uColor.value.copy(C.grid); gU.uAccent.value.copy(C.accent); gU.uGain.value = isLight ? 1.15 : 1;
    },
    clear() { for (const id in pool) scene.remove(pool[id].group); pool = {}; },
    pointerToGround(nx, ny, y) {
      ndc.set(nx, ny); ray.setFromCamera(ndc, camera); plane.constant = -y;
      return ray.ray.intersectPlane(plane, hit) ? [hit.x, hit.z] : null;
    },
    render(f) {
      fade = f.fade;
      camera.fov = f.cam.fov; camera.position.set(f.cam.pos[0], f.cam.pos[1], f.cam.pos[2]); camera.lookAt(f.cam.target[0], f.cam.target[1], f.cam.target[2]); camera.updateProjectionMatrix();
      const g = f.ground, size = g.fade * 2.2, snap = g.major;
      ground.scale.set(size, size, 1); ground.position.set(Math.round(f.focus[0] / snap) * snap, 0, Math.round(f.focus[2] / snap) * snap);
      gU.uMinor.value = g.minor; gU.uMajor.value = g.major; gU.uFade.value = g.fade; gU.uMode.value = g.mode; gU.uAmp.value = g.amp; gU.uContour.value = g.contour ?? 0.2; gU.uGlowR.value = g.glowR;
      gU.uCenter.value.set(f.focus[0], f.focus[2]); gU.uAlpha.value = fade;
      if (f.ring) { gU.uRing.value.set(f.ring.x, f.ring.z, f.ring.r, f.ring.a * 0.9); gU.uRingW.value = f.ring.w; } else gU.uRing.value.set(0, 0, -1e3, 0);
      if (f.ptr) gU.uPtr.value.set(f.ptr[0], f.ptr[1], f.ptr[2]); else gU.uPtr.value.z = 0;
      sync(f.items);
      renderer.render(scene, camera);
      return renderer.info.render;
    },
  };
}
