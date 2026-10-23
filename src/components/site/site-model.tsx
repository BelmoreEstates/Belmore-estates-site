import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { phaseLots, type PhaseLot } from "@/data/site";
import { LotStatusBadge, T, Tx, lotVars, useSiteData, useText } from "@/components/site/text";

type Mount = {
  setSelected: (id: string) => void;
  dispose: () => void;
};

export function SiteModel({
  hintKey = "home.sitemodel.hint",
  captionKey = "home.sitemodel.caption",
}: {
  hintKey?: string;
  captionKey?: string;
} = {}) {
  const host = useRef<HTMLDivElement>(null);
  const mount = useRef<Mount | null>(null);
  const [selectedId, setSelectedId] = useState("801");
  const [ready, setReady] = useState(false);
  const { lots } = useSiteData();
  const t = useText();
  const lot = lots.find((item) => item.id === selectedId) ?? lots[0] ?? phaseLots[0];
  const vars = lotVars(lot);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let dead = false;

    void (async () => {
      const THREE = await import("three");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
      if (dead || !host.current) return;
      mount.current = buildScene(THREE, OrbitControls, host.current, setSelectedId);
      setReady(true);
    })();

    return () => {
      dead = true;
      mount.current?.dispose();
      mount.current = null;
    };
  }, []);

  function choose(id: string) {
    setSelectedId(id);
    mount.current?.setSelected(id);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className="relative min-h-80 overflow-hidden border border-line bg-paper-deep lg:col-span-8">
        <div ref={host} className="aspect-video min-h-80 w-full" />
        <p className="pointer-events-none absolute bottom-3 left-3 bg-ink/80 px-3 py-2 text-xs text-cream">
          <Tx k={hintKey} />
        </p>
        {!ready ? (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-muted">
            Opening the site model…
          </p>
        ) : null}
      </div>
      <aside className="border border-line bg-cream p-5 lg:col-span-4" data-model-panel={lot.id}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-widest text-copper">
            <Tx k="home.sitemodel.panel.eyebrow" vars={vars} />
          </p>
          <LotStatusBadge status={lot.status} />
        </div>
        <h3 className="mt-2 text-3xl">
          <T k="home.sitemodel.panel.street" vars={vars} />
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          <T k="home.sitemodel.panel.note" vars={vars} />
        </p>
        <dl className="mt-5 grid gap-3 text-sm">
          <div>
            <dt className="text-muted">
              <Tx k="homes.detail.specs.area.label" />
            </dt>
            <dd>
              <T k="home.sitemodel.panel.area" vars={vars} />
            </dd>
          </div>
          {lot.frontage ? (
            <div>
              <dt className="text-muted">Frontage · depth</dt>
              <dd>
                {lot.frontage} · {lot.depth}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="text-muted">
              <Tx k="homes.detail.specs.release.label" />
            </dt>
            <dd>
              <T k="home.sitemodel.panel.release" vars={vars} />
            </dd>
          </div>
        </dl>
        <Link
          to="/homes/$slug"
          params={{ slug: lot.slug }}
          className="mt-4 inline-flex min-h-11 items-center text-sm underline"
        >
          <Tx k="home.phase1.card.link" />
        </Link>
        <ul className="mt-4 grid grid-cols-4 gap-2">
          {lots.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                aria-pressed={item.id === lot.id}
                aria-label={`Lot ${item.id}, ${t(`global.status.${item.status}`)}`}
                onClick={() => choose(item.id)}
                className={
                  item.id === lot.id
                    ? "min-h-11 w-full bg-ink text-sm text-cream"
                    : "min-h-11 w-full border border-line bg-paper text-sm"
                }
              >
                {item.id}
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-muted">
          <T k={captionKey} />
        </p>
      </aside>
    </div>
  );
}

type Vec = [number, number];
type ThreeNS = typeof import("three");

const PC_Z = -28;
const CURVE_C: Vec = [-120, PC_Z];

function deg(n: number) {
  return (n * Math.PI) / 180;
}

function arc(cx: number, cz: number, r: number, a0: number, a1: number, n: number): Vec[] {
  const pts: Vec[] = [];
  for (let i = 0; i <= n; i += 1) {
    const t = a0 + ((a1 - a0) * i) / n;
    pts.push([cx + r * Math.cos(t), cz + r * Math.sin(t)]);
  }
  return pts;
}

function rect(x0: number, z0: number, x1: number, z1: number): Vec[] {
  return [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
}

const innerBend = arc(CURVE_C[0], CURVE_C[1], 120, 0, deg(-34), 12);
const outerBend = arc(CURVE_C[0], CURVE_C[1], 180, 0, deg(-22), 10);

const lotPads: { id: string; poly: Vec[]; house: Vec; rot: number; wall: number; side: number }[] =
  [
    {
      id: "801",
      poly: [
        [0, 0],
        [-150, 0],
        [-176, -16],
        [-206, -34],
        innerBend[innerBend.length - 1],
        ...[...innerBend].reverse().slice(1),
      ],
      house: [-42, -28],
      rot: 0,
      wall: 0xf4f0e6,
      side: -1,
    },
    {
      id: "802",
      poly: rect(-150, 0, 0, 80),
      house: [-40, 40],
      rot: 0,
      wall: 0xe7e1d4,
      side: 1,
    },
    {
      id: "803",
      poly: rect(-150, 80, 0, 160),
      house: [-40, 120],
      rot: 0,
      wall: 0xf7f3ec,
      side: 1,
    },
    {
      id: "804",
      poly: rect(-150, 160, 0, 240),
      house: [-40, 200],
      rot: 0,
      wall: 0xefe8dc,
      side: 1,
    },
    {
      id: "805",
      poly: rect(60, 160, 215, 240),
      house: [100, 200],
      rot: Math.PI,
      wall: 0xf4f0e6,
      side: 1,
    },
    {
      id: "806",
      poly: [
        [60, 160],
        [215, 160],
        [215, 75],
        ...[...arc(90, 105, 30, deg(180), deg(270), 8)].reverse(),
      ],
      house: [104, 124],
      rot: Math.PI,
      wall: 0xe9e2d6,
      side: -1,
    },
    {
      id: "807",
      poly: [
        ...arc(90, -15, 30, deg(90), deg(180), 8),
        [60, PC_Z],
        ...outerBend.slice(1),
        [215, -119],
        [215, 15],
        [90, 15],
      ],
      house: [112, -42],
      rot: Math.PI,
      wall: 0xf7f4ee,
      side: 1,
    },
  ];

function belmoreCenter(): Vec[] {
  const pts: Vec[] = [];
  for (let z = 360; z >= PC_Z; z -= 10) pts.push([30, z]);
  pts.push(...arc(CURVE_C[0], CURVE_C[1], 150, 0, deg(-92), 28).slice(1));
  const end = pts[pts.length - 1];
  pts.push([end[0] - 80, end[1]], [end[0] - 210, end[1]]);
  return pts;
}

function buildScene(
  THREE: ThreeNS,
  OrbitControls: typeof import("three/examples/jsm/controls/OrbitControls.js").OrbitControls,
  host: HTMLDivElement,
  onSelect: (id: string) => void,
): Mount {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xd7e0d4);
  scene.fog = new THREE.Fog(0xd7e0d4, 980, 1700);

  const camera = new THREE.PerspectiveCamera(34, 1, 0.5, 2500);
  camera.position.set(-30, 540, -520);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = "h-full w-full touch-none";
  host.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(-10, 0, 10);
  controls.maxPolarAngle = Math.PI / 2.05;
  controls.minPolarAngle = 0.18;
  controls.minDistance = 140;
  controls.maxDistance = 900;
  controls.enableDamping = !reduced;
  controls.autoRotate = false;
  controls.update();

  scene.add(new THREE.HemisphereLight(0xf6f1e6, 0x4d6a55, 1.45));
  const sun = new THREE.DirectionalLight(0xfff6e8, 2.1);
  sun.position.set(40, 360, -280);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -380;
  sun.shadow.camera.right = 380;
  sun.shadow.camera.top = 380;
  sun.shadow.camera.bottom = -380;
  scene.add(sun);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(780, 56),
    new THREE.MeshStandardMaterial({ color: 0x8aa184, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  const world = new THREE.Group();
  // South-looking camera puts +X on the left. Flip the plan so west stays left, matching the plat.
  world.scale.x = -1;
  scene.add(world);

  scene.add(ground);

  world.add(
    lotMesh(
      THREE,
      [
        [-360, -80],
        [-158, -50],
        [-158, 250],
        [-370, 270],
      ],
      0xb7c3ad,
      0.08,
    ),
  );
  world.add(
    lotMesh(
      THREE,
      [
        [-180, 248],
        [230, 248],
        [240, 348],
        [-190, 352],
      ],
      0xb7c3ad,
      0.08,
    ),
  );
  world.add(
    lotMesh(
      THREE,
      [
        [230, 260],
        [540, 250],
        [560, -200],
        [190, -180],
        [210, 30],
        [230, 80],
      ],
      0xddd4c2,
      0.1,
    ),
  );

  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x3c4240,
    roughness: 0.92,
    side: THREE.DoubleSide,
  });
  world.add(ribbon(THREE, belmoreCenter(), 60, roadMat));
  world.add(
    ribbon(
      THREE,
      [
        [-240, 368],
        [340, 358],
      ],
      50,
      roadMat,
    ),
  );
  world.add(
    ribbon(
      THREE,
      [
        [-310, -30],
        [-286, 90],
        [-304, 210],
        [-268, 360],
      ],
      48,
      roadMat,
    ),
  );
  world.add(
    ribbon(
      THREE,
      [
        [200, 362],
        [230, 470],
      ],
      48,
      roadMat,
    ),
  );
  world.add(
    ribbon(
      THREE,
      [
        [30, 45],
        [275, 45],
      ],
      60,
      roadMat,
    ),
  );

  const bulb = new THREE.Mesh(new THREE.CircleGeometry(58, 40), roadMat);
  bulb.rotation.x = -Math.PI / 2;
  bulb.position.set(275, 0.22, 45);
  bulb.receiveShadow = true;
  world.add(bulb);
  const island = new THREE.Mesh(
    new THREE.CircleGeometry(14, 24),
    new THREE.MeshStandardMaterial({ color: 0x5d7a58, roughness: 1 }),
  );
  island.rotation.x = -Math.PI / 2;
  island.position.set(275, 0.3, 45);
  world.add(island);

  const lotMeshes = new Map<string, import("three").Mesh>();
  const grass = 0x4c7a56;
  const picked = 0xd7b07a;

  function paint(id: string) {
    lotMeshes.forEach((mesh, key) => {
      const mat = mesh.material as import("three").MeshStandardMaterial;
      const on = key === id;
      mat.color.set(on ? picked : grass);
      mat.emissive.set(on ? 0x4a3418 : 0x000000);
      mat.emissiveIntensity = on ? 0.35 : 0;
    });
  }

  for (const lot of lotPads) {
    const mesh = lotMesh(THREE, lot.poly, grass, 0.4);
    mesh.userData.id = lot.id;
    lotMeshes.set(lot.id, mesh);
    world.add(mesh);
    world.add(outline(THREE, lot.poly));
    const center = centroid(lot.poly);
    scene.add(label(THREE, lot.id, -center[0], 26, center[1], 28));
    addHouse(THREE, world, lot.house[0], lot.house[1], lot.rot, lot.wall, lot.side);
  }
  paint("801");

  scene.add(label(THREE, "BELMORE WAY", -18, 8, 290, 34));
  scene.add(label(THREE, "SHELBY CIRCLE", -150, 8, 68, 28));
  scene.add(label(THREE, "FUTURE", -340, 6, 120, 28));
  scene.add(label(THREE, "BARCLAY CT", -90, 6, 348, 24));
  scene.add(label(THREE, "NORTH", 220, 8, 270, 26));

  for (const [x, z] of trees) world.add(tree(THREE, x, z));

  const ray = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let downX = 0;
  let downY = 0;
  const canvas = renderer.domElement;

  function onDown(event: PointerEvent) {
    downX = event.clientX;
    downY = event.clientY;
  }
  function onUp(event: PointerEvent) {
    if (Math.hypot(event.clientX - downX, event.clientY - downY) > 6) return;
    const rectBox = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rectBox.left) / rectBox.width) * 2 - 1;
    pointer.y = -((event.clientY - rectBox.top) / rectBox.height) * 2 + 1;
    ray.setFromCamera(pointer, camera);
    const hit = ray.intersectObjects([...lotMeshes.values()])[0];
    const id = hit?.object.userData.id as string | undefined;
    if (!id) return;
    paint(id);
    onSelect(id);
  }
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointerup", onUp);

  function resize() {
    const w = host.clientWidth || 1;
    const h = host.clientHeight || 1;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(host);

  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });

  return {
    setSelected(id: string) {
      paint(id);
    },
    dispose() {
      renderer.setAnimationLoop(null);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      observer.disconnect();
      controls.dispose();
      scene.traverse((obj) => {
        const mesh = obj as import("three").Mesh;
        mesh.geometry?.dispose();
        const mat = mesh.material;
        if (Array.isArray(mat)) mat.forEach((item) => item.dispose());
        else if (mat) mat.dispose();
      });
      renderer.dispose();
      if (canvas.parentElement) canvas.parentElement.removeChild(canvas);
    },
  };
}

const trees: Vec[] = [
  [-230, 40],
  [-250, 140],
  [-220, 220],
  [-190, -20],
  [360, 180],
  [430, 120],
  [400, -20],
  [480, 40],
  [340, -80],
  [-120, 300],
  [120, 310],
];

function ribbon(THREE: ThreeNS, points: Vec[], width: number, material: import("three").Material) {
  const left: import("three").Vector3[] = [];
  const right: import("three").Vector3[] = [];
  for (let i = 0; i < points.length; i += 1) {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const dx = next[0] - prev[0];
    const dz = next[1] - prev[1];
    const len = Math.hypot(dx, dz) || 1;
    const nx = (-dz / len) * (width / 2);
    const nz = (dx / len) * (width / 2);
    left.push(new THREE.Vector3(points[i][0] + nx, 0.16, points[i][1] + nz));
    right.push(new THREE.Vector3(points[i][0] - nx, 0.16, points[i][1] - nz));
  }
  const geom = new THREE.BufferGeometry();
  const verts: number[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = left[i];
    const b = right[i];
    const c = left[i + 1];
    const d = right[i + 1];
    verts.push(
      a.x,
      a.y,
      a.z,
      b.x,
      b.y,
      b.z,
      c.x,
      c.y,
      c.z,
      b.x,
      b.y,
      b.z,
      d.x,
      d.y,
      d.z,
      c.x,
      c.y,
      c.z,
    );
  }
  geom.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  geom.computeVertexNormals();
  const mesh = new THREE.Mesh(geom, material);
  mesh.receiveShadow = true;
  return mesh;
}

function lotMesh(THREE: ThreeNS, poly: Vec[], color: number, lift: number) {
  const shape = new THREE.Shape(poly.map((p) => new THREE.Vector2(p[0], p[1])));
  const geom = new THREE.ExtrudeGeometry(shape, { depth: 0.55, bevelEnabled: false });
  geom.rotateX(Math.PI / 2);
  geom.translate(0, lift, 0);
  const mesh = new THREE.Mesh(
    geom,
    new THREE.MeshStandardMaterial({ color, roughness: 0.95, side: THREE.DoubleSide }),
  );
  mesh.receiveShadow = true;
  return mesh;
}

function outline(THREE: ThreeNS, poly: Vec[]) {
  const pts = [...poly, poly[0]].map((p) => new THREE.Vector3(p[0], 1.05, p[1]));
  return new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color: 0xf7f3ea }),
  );
}

function addHouse(
  THREE: ThreeNS,
  parent: import("three").Object3D,
  x: number,
  z: number,
  rot: number,
  wall: number,
  side: number,
) {
  const group = new THREE.Group();
  const walls = new THREE.MeshStandardMaterial({
    color: wall,
    roughness: 0.78,
    side: THREE.DoubleSide,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x6a5d52,
    roughness: 0.72,
    side: THREE.DoubleSide,
  });
  const trim = new THREE.MeshStandardMaterial({
    color: 0xc4b8a4,
    roughness: 0.6,
    side: THREE.DoubleSide,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(30, 16, 40), walls);
  body.position.set(-15, 8, 0);
  body.castShadow = true;
  body.receiveShadow = true;
  const roof = new THREE.Mesh(gable(THREE, 34, 44, 7), roofMat);
  roof.position.set(-15, 16, 0);
  roof.castShadow = true;
  const gz = 18 * side;
  const garage = new THREE.Mesh(new THREE.BoxGeometry(16, 9, 12), walls);
  garage.position.set(-8, 4.6, gz);
  garage.castShadow = true;
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6.5, 8), trim);
  door.position.set(0.3, 3.4, gz);
  const drive = new THREE.Mesh(
    new THREE.BoxGeometry(40, 0.12, 10),
    new THREE.MeshStandardMaterial({ color: 0x6d675f, roughness: 1 }),
  );
  drive.position.set(20, 0.2, gz);
  drive.receiveShadow = true;
  group.add(body, roof, garage, door, drive);
  group.position.set(x, 0.55, z);
  group.rotation.y = rot;
  parent.add(group);
}

function gable(THREE: ThreeNS, depth: number, width: number, rise: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-depth / 2, 0);
  shape.lineTo(depth / 2, 0);
  shape.lineTo(0, rise);
  shape.closePath();
  const geom = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false });
  geom.translate(0, 0, -width / 2);
  return geom;
}

function tree(THREE: ThreeNS, x: number, z: number) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 1.1, 6, 6),
    new THREE.MeshStandardMaterial({ color: 0x5a4636, roughness: 1 }),
  );
  trunk.position.y = 3;
  const crown = new THREE.Mesh(
    new THREE.SphereGeometry(8, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0x2f5a3c, roughness: 1 }),
  );
  crown.position.y = 10;
  group.add(trunk, crown);
  group.position.set(x, 0, z);
  return group;
}

function label(THREE: ThreeNS, text: string, x: number, y: number, z: number, scale: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Group();
  ctx.clearRect(0, 0, 512, 128);
  ctx.fillStyle = "rgba(26, 36, 32, 0.9)";
  const wide = text.length > 4;
  ctx.fillRect(wide ? 8 : 96, 28, wide ? 496 : 320, 72);
  ctx.fillStyle = "#faf7f2";
  ctx.font = "600 52px Outfit, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 66);
  const map = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map, transparent: true, depthTest: false }),
  );
  sprite.position.set(x, y, z);
  sprite.scale.set(scale * 2.4, scale * 0.6, 1);
  return sprite;
}

function centroid(poly: Vec[]): Vec {
  const x = poly.reduce((sum, p) => sum + p[0], 0) / poly.length;
  const z = poly.reduce((sum, p) => sum + p[1], 0) / poly.length;
  return [x, z];
}

export type { PhaseLot };
