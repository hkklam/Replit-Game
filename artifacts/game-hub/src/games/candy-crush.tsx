import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import * as THREE from "three";
import {
  COLS, ROWS, GTYPES, LEVELS,
  GemType, SpecialType, Cell, Board,
  resetIds, nextId, rtype, mkCell,
  initBoard, getMatchGroups, findMatches,
  applyGravity, fillBoard, findHint,
} from "./candy-crush-board";

// ─── Visuals ──────────────────────────────────────────────────────────────────
const CELL = 1.12;
const GEM_COL: Record<GemType,number> = {
  ruby:0xef4444, sapphire:0x3b82f6, emerald:0x22c55e,
  topaz:0xf59e0b, amethyst:0xa855f7, diamond:0xe2e8f0,
};
const GEM_EMI: Record<GemType,number> = {
  ruby:0x7f1d1d, sapphire:0x1e3a8a, emerald:0x14532d,
  topaz:0x78350f, amethyst:0x4a1d96, diamond:0x374151,
};
const GEM_CSS: Record<GemType,string> = {
  ruby:"#ef4444", sapphire:"#3b82f6", emerald:"#22c55e",
  topaz:"#f59e0b", amethyst:"#a855f7", diamond:"#e2e8f0",
};
const GEM_LABEL: Record<GemType,string> = {
  ruby:"Ruby", sapphire:"Sapphire", emerald:"Emerald",
  topaz:"Topaz", amethyst:"Amethyst", diamond:"Diamond",
};
const ROT_AX: Record<GemType,"x"|"y"|"z"> = {
  ruby:"y", sapphire:"y", emerald:"z", topaz:"y", amethyst:"x", diamond:"y",
};
const ROT_SPD: Record<GemType,number> = {
  ruby:0.85, sapphire:0.5, emerald:0.7, topaz:0, amethyst:1.0, diamond:1.3,
};
const HINT_DELAY = 5000;

// Shared geometry cache
const GEO_CACHE = new Map<GemType, THREE.BufferGeometry>();
function getGeo(t: GemType): THREE.BufferGeometry {
  if (!GEO_CACHE.has(t)) {
    let g: THREE.BufferGeometry;
    switch (t) {
      case "ruby":     g = new THREE.OctahedronGeometry(0.34); break;
      case "sapphire": g = new THREE.BoxGeometry(0.55, 0.55, 0.55); break;
      case "emerald":  g = new THREE.CylinderGeometry(0, 0.38, 0.65, 3); break;
      case "topaz":    g = new THREE.SphereGeometry(0.31, 18, 14); break;
      case "amethyst": g = new THREE.DodecahedronGeometry(0.34); break;
      case "diamond":  g = new THREE.IcosahedronGeometry(0.34); break;
    }
    GEO_CACHE.set(t, g!);
  }
  return GEO_CACHE.get(t)!;
}

// Board cell → Three.js world position (board centred at origin on XZ plane)
function cw(col: number, row: number): [number, number, number] {
  return [(col - (COLS - 1) / 2) * CELL, 0.5, (row - (ROWS - 1) / 2) * CELL];
}

// ─── Component ────────────────────────────────────────────────────────────────
type Phase = "idle"|"selected"|"swapping"|"snapback"|"removing"|"falling"|"win"|"lose";
interface HUD { score: number; moves: number; target: number; lvIdx: number; cascade: number; phase: Phase; }

export default function CandyCrush() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [started, setStarted] = useState(false);
  const [hud, setHud] = useState<HUD>({ score:0, moves:20, target:400, lvIdx:0, cascade:0, phase:"idle" });
  const [overlay, setOverlay] = useState<"none"|"win"|"lose">("none");

  // Restart / next-level exposed to overlay buttons
  const restartRef = useRef<(nextLevel: boolean) => void>(() => {});

  useEffect(() => {
    if (!started) return;
    const canvas = canvasRef.current!;
    const W = 800, H = 520;

    // ── Mutable game state (all inside closure — no re-render per mutation) ───
    resetIds();
    const board: Board = initBoard();
    const meshMap = new Map<number, THREE.Mesh>();

    let phase: Phase = "idle";
    let phaseUntil = 0;
    let phaseOnEnd: (() => void) | null = null;
    let selected: { r: number; c: number } | null = null;
    let score = 0;
    let cascade = 0;
    let lvIdx = 0;
    let moves = LEVELS[0].moves;
    let lastInput = performance.now();
    let hintCells: [[number, number], [number, number]] | null = null;

    const upHud = () =>
      setHud({ score, moves, target: LEVELS[lvIdx].target, lvIdx, cascade, phase });

    // ── Three.js scene ────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d0721);
    scene.fog = new THREE.Fog(0x0d0721, 18, 30);

    const camera = new THREE.PerspectiveCamera(52, W / H, 0.1, 50);
    camera.position.set(0, 11, 7.5);
    camera.lookAt(0, 0, 0.5);

    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); }
    catch { return; }
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const sun = new THREE.DirectionalLight(0xfff0f0, 1.1);
    sun.position.set(5, 10, 5); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    scene.add(sun);
    scene.add(new THREE.HemisphereLight(0x6b21a8, 0x1e1b4b, 0.55));

    // Board platform
    const bw = COLS * CELL + 0.5, bd = ROWS * CELL + 0.5;
    const platform = new THREE.Mesh(
      new THREE.BoxGeometry(bw, 0.14, bd),
      new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.75, metalness: 0.05 }),
    );
    platform.position.set(0, 0.07, 0); platform.receiveShadow = true;
    scene.add(platform);

    // Glowing border
    const borderEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(bw + 0.06, 0.06, bd + 0.06)),
      new THREE.LineBasicMaterial({ color: 0xa78bfa }),
    );
    borderEdges.position.set(0, 0.17, 0);
    scene.add(borderEdges);

    // Cell grid
    const gridMat = new THREE.LineBasicMaterial({ color: 0x312e81, transparent: true, opacity: 0.35 });
    for (let c = 0; c <= COLS; c++) {
      const x = (c - COLS / 2) * CELL;
      const pts = [new THREE.Vector3(x, 0.15, -ROWS / 2 * CELL), new THREE.Vector3(x, 0.15, ROWS / 2 * CELL)];
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
    }
    for (let r = 0; r <= ROWS; r++) {
      const z = (r - ROWS / 2) * CELL;
      const pts = [new THREE.Vector3(-COLS / 2 * CELL, 0.15, z), new THREE.Vector3(COLS / 2 * CELL, 0.15, z)];
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
    }

    // Selection ring (yellow torus on XZ)
    const selRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.44, 0.045, 8, 28),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.9 }),
    );
    selRing.rotation.x = Math.PI / 2; selRing.visible = false;
    scene.add(selRing);

    // ── Spawn / rebuild a gem mesh ─────────────────────────────────────────────
    function spawnMesh(cell: Cell, col: number, row: number, startHigh = false): THREE.Mesh {
      const [wx, wy, wz] = cw(col, row);
      const isCB = cell.special === "colorbomb";
      const isStr = cell.special === "striped_h" || cell.special === "striped_v";
      const mat = new THREE.MeshStandardMaterial({
        color:  isCB ? 0xc084fc : GEM_COL[cell.type],
        emissive: isCB ? new THREE.Color(0x7c3aed) :
                  isStr ? new THREE.Color(0xffffff) :
                  new THREE.Color(GEM_EMI[cell.type]),
        emissiveIntensity: (isCB || isStr) ? 0.5 : 0.3,
        metalness: 0.3, roughness: 0.2,
        transparent: true, opacity: 1,
      });
      const mesh = new THREE.Mesh(getGeo(cell.type), mat);
      mesh.castShadow = true;
      const startY = startHigh ? wy + 10 : wy;
      mesh.userData = {
        id: cell.id, type: cell.type, special: cell.special, col, row,
        cx: wx, cy: startY, cz: wz,
        tx: wx, ty: wy,    tz: wz,
        vx: 0, vy: 0, vz: 0,
        cs: startHigh ? 0 : 1, vs: 0, ts: 1,
        alpha: 1, ta: 1,
        rotAx: ROT_AX[cell.type], rotSpd: ROT_SPD[cell.type],
        removing: false, hintT: 0, hint: false,
      };
      mesh.position.set(wx, startY, wz);
      if (startHigh) mesh.scale.setScalar(0);
      scene.add(mesh);
      return mesh;
    }

    // Rebuild board meshes (called on init + restart)
    function buildMeshes() {
      meshMap.forEach(m => scene.remove(m)); meshMap.clear();
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const cell = board[r][c]; if (!cell) continue;
        const m = spawnMesh(cell, c, r, false);
        meshMap.set(cell.id, m);
      }
    }
    buildMeshes();

    // ── Game logic ─────────────────────────────────────────────────────────────
    function setPhase(p: Phase, ms: number, onEnd?: () => void) {
      phase = p; phaseUntil = performance.now() + ms; phaseOnEnd = onEnd ?? null;
    }

    function checkWinLose() {
      if (score >= LEVELS[lvIdx].target) { phase = "win"; setOverlay("win"); upHud(); return; }
      if (moves <= 0) { phase = "lose"; setOverlay("lose"); upHud(); }
    }

    /** Expand striped / colorbomb effects in-place on the remove set */
    function expandSpecials(toRemove: Set<string>) {
      const extra = new Set<string>();
      toRemove.forEach(key => {
        const [r, c] = key.split(",").map(Number);
        const cell = board[r][c]; if (!cell) return;
        if (cell.special === "striped_h") for (let i = 0; i < COLS; i++) extra.add(`${r},${i}`);
        else if (cell.special === "striped_v") for (let i = 0; i < ROWS; i++) extra.add(`${i},${c}`);
      });
      extra.forEach(k => toRemove.add(k));
    }

    function doRemoval(toRemove: Set<string>, pts: number) {
      expandSpecials(toRemove);
      score += Math.round(pts * Math.pow(1.5, cascade));

      // Null board cells + start removal animation
      const removingIds: number[] = [];
      toRemove.forEach(key => {
        const [r, c] = key.split(",").map(Number);
        const cell = board[r][c]; if (!cell) return;
        board[r][c] = null;
        const m = meshMap.get(cell.id); if (!m) return;
        m.userData.ts = 0; m.userData.ta = 0; m.userData.removing = true;
        removingIds.push(cell.id);
      });

      setPhase("removing", 380, () => {
        // Remove meshes from scene
        removingIds.forEach(id => { const m = meshMap.get(id); if (m) { scene.remove(m); meshMap.delete(id); } });

        // Gravity: slide existing gems down
        const falls = applyGravity(board);
        falls.forEach(({ id, tr, col }) => {
          const m = meshMap.get(id); if (!m) return;
          const [tx, ty, tz] = cw(col, tr);
          m.userData.tx = tx; m.userData.ty = ty; m.userData.tz = tz;
          m.userData.col = col; m.userData.row = tr;
        });

        // Spawn new gems from above
        const spawns = fillBoard(board);
        spawns.forEach(({ cell, col, row, queuePos }) => {
          const [wx, wy, wz] = cw(col, row);
          const m = spawnMesh(cell, col, row, false);
          m.userData.cy = wy + queuePos * CELL + 1.5;
          m.userData.tx = wx; m.userData.ty = wy; m.userData.tz = wz;
          m.userData.cs = 1; m.userData.ts = 1;
          m.position.set(wx, m.userData.cy, wz);
          meshMap.set(cell.id, m);
        });

        setPhase("falling", 580, () => {
          const next = findMatches(board);
          if (next.size > 0) {
            cascade++;
            doRemoval(next, next.size * 30);
          } else {
            cascade = 0; phase = "idle"; hintCells = null;
            lastInput = performance.now();
            checkWinLose(); upHud();
          }
        });
        upHud();
      });
    }

    function attemptSwap(r1: number, c1: number, r2: number, c2: number) {
      selected = null; selRing.visible = false;
      const cell1 = board[r1][c1]!;
      const cell2 = board[r2][c2]!;
      const [x1, y1, z1] = cw(c1, r1);
      const [x2, y2, z2] = cw(c2, r2);
      const m1 = meshMap.get(cell1.id)!;
      const m2 = meshMap.get(cell2.id)!;

      // Arc toward each other
      m1.userData.tx = x2; m1.userData.ty = y2 + 0.65; m1.userData.tz = z2;
      m2.userData.tx = x1; m2.userData.ty = y1 + 0.65; m2.userData.tz = z1;

      setPhase("swapping", 280, () => {
        // Land at final height
        m1.userData.ty = y2; m2.userData.ty = y1;

        // ── Color bomb activation ────────────────────────────────────────────
        const isCB1 = cell1.special === "colorbomb";
        const isCB2 = cell2.special === "colorbomb";
        if (isCB1 || isCB2) {
          const targetType = isCB1 ? cell2.type : cell1.type;
          const toRemove = new Set<string>();
          for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
            if (board[r][c]?.type === targetType || board[r][c]?.special === "colorbomb")
              toRemove.add(`${r},${c}`);
          }
          board[r1][c1] = cell2; board[r2][c2] = cell1;
          m1.userData.col = c2; m1.userData.row = r2;
          m2.userData.col = c1; m2.userData.row = r1;
          moves--; cascade = 0;
          doRemoval(toRemove, toRemove.size * 80);
          return;
        }

        // ── Normal swap ──────────────────────────────────────────────────────
        board[r1][c1] = cell2; board[r2][c2] = cell1;
        m1.userData.col = c2; m1.userData.row = r2;
        m2.userData.col = c1; m2.userData.row = r1;

        const groups = getMatchGroups(board);
        const matchSet = new Set<string>();
        groups.forEach(g => g.cells.forEach(([r, c]) => matchSet.add(`${r},${c}`)));

        if (matchSet.size === 0) {
          // Snap back
          board[r1][c1] = cell1; board[r2][c2] = cell2;
          m1.userData.col = c1; m1.userData.row = r1;
          m2.userData.col = c2; m2.userData.row = r2;
          m1.userData.tx = x1; m1.userData.ty = y1; m1.userData.tz = z1;
          m2.userData.tx = x2; m2.userData.ty = y2; m2.userData.tz = z2;
          setPhase("snapback", 260, () => { phase = "idle"; upHud(); });
          return;
        }

        // ── Create special gems for match-4 / match-5 ────────────────────────
        groups.forEach(g => {
          if (g.cells.length < 4) return;
          const sp: SpecialType = g.cells.length >= 5 ? "colorbomb"
            : (g.dir === "h" ? "striped_h" : "striped_v");
          // Place at the cell the player moved; fall back to midpoint
          const moved = g.cells.find(([gr, gc]) => (gr === r2 && gc === c2) || (gr === r1 && gc === c1))
            ?? g.cells[Math.floor(g.cells.length / 2)];
          const key = `${moved[0]},${moved[1]}`;
          matchSet.delete(key); // keep this cell — it becomes the special gem

          const old = board[moved[0]][moved[1]]!;
          const newCell = mkCell(g.type, sp);
          board[moved[0]][moved[1]] = newCell;
          // Update existing mesh in-place
          const mOld = meshMap.get(old.id)!;
          meshMap.delete(old.id);
          meshMap.set(newCell.id, mOld);
          mOld.userData.id = newCell.id;
          mOld.userData.special = sp;
          const mat = mOld.material as THREE.MeshStandardMaterial;
          if (sp === "colorbomb") { mat.color.set(0xc084fc); mat.emissive.set(0x7c3aed); mat.emissiveIntensity = 0.55; }
          else { mat.emissive.set(0xffffff); mat.emissiveIntensity = 0.5; }
          mOld.userData.ts = 1.35; // pop scale
          setTimeout(() => { if (meshMap.has(newCell.id)) meshMap.get(newCell.id)!.userData.ts = 1; }, 250);
        });

        moves--; cascade = 0;
        doRemoval(matchSet, matchSet.size * 30);
      });
    }

    // ── Click / select ─────────────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    function liftGem(id: number, lifted: boolean) {
      const m = meshMap.get(id); if (!m) return;
      const [, wy] = cw(m.userData.col, m.userData.row);
      m.userData.ty = lifted ? wy + 0.35 : wy;
    }

    const onClick = (e: MouseEvent) => {
      if (phase !== "idle" && phase !== "selected") return;
      lastInput = performance.now();
      hintCells = null;
      meshMap.forEach(m => { m.userData.hint = false; m.userData.hintT = 0; });

      const rect = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects([...meshMap.values()]);

      if (!hits.length) {
        if (selected) liftGem(board[selected.r][selected.c]?.id ?? -1, false);
        selected = null; selRing.visible = false; phase = "idle"; upHud(); return;
      }

      const hitId = (hits[0].object as THREE.Mesh).userData.id as number;
      let hitR = -1, hitC = -1;
      outer: for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        if (board[r][c]?.id === hitId) { hitR = r; hitC = c; break outer; }
      }
      if (hitR < 0) return;

      if (phase === "idle") {
        selected = { r: hitR, c: hitC }; phase = "selected";
        liftGem(hitId, true);
        const [sx, , sz] = cw(hitC, hitR);
        selRing.position.set(sx, 0.53, sz); selRing.visible = true;
        upHud();
      } else if (phase === "selected" && selected) {
        // Deselect same gem
        if (selected.r === hitR && selected.c === hitC) {
          liftGem(hitId, false);
          selected = null; selRing.visible = false; phase = "idle"; upHud(); return;
        }
        const dr = Math.abs(hitR - selected.r), dc = Math.abs(hitC - selected.c);
        const prevId = board[selected.r][selected.c]?.id ?? -1;
        liftGem(prevId, false);
        if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
          attemptSwap(selected.r, selected.c, hitR, hitC);
        } else {
          // Re-select new gem
          selected = { r: hitR, c: hitC };
          liftGem(hitId, true);
          const [sx, , sz] = cw(hitC, hitR);
          selRing.position.set(sx, 0.53, sz);
        }
      }
    };
    canvas.addEventListener("click", onClick);

    // ── Restart (wired to overlay buttons via ref) ─────────────────────────────
    restartRef.current = (nextLevel: boolean) => {
      if (nextLevel && lvIdx < LEVELS.length - 1) lvIdx++;
      resetIds();
      const nb = initBoard();
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) board[r][c] = nb[r][c];
      score = 0; moves = LEVELS[lvIdx].moves; cascade = 0;
      phase = "idle"; phaseUntil = 0; phaseOnEnd = null;
      selected = null; selRing.visible = false;
      hintCells = null; lastInput = performance.now();
      buildMeshes(); setOverlay("none"); upHud();
    };

    // ── Animation loop ─────────────────────────────────────────────────────────
    const KP = 210, DP = 23, KS = 300;
    let lastT = performance.now(), rafId = 0;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min((now - lastT) / 1000, 0.05);
      lastT = now;

      // Phase timer
      if (phaseOnEnd && phaseUntil > 0 && now >= phaseUntil) {
        const fn = phaseOnEnd; phaseOnEnd = null; phaseUntil = 0; fn();
      }

      // Hint: activate after idle timeout
      if (phase === "idle" && now - lastInput > HINT_DELAY && !hintCells) {
        hintCells = findHint(board);
        if (hintCells) hintCells.forEach(([r, c]) => {
          const m = meshMap.get(board[r][c]?.id ?? -1);
          if (m) m.userData.hint = true;
        });
      }

      // Spring physics for all gems
      meshMap.forEach(m => {
        const d = m.userData;

        // Hint bounce override
        if (d.hint) {
          d.hintT += dt;
          const [, by] = cw(d.col, d.row);
          d.ty = by + 0.18 * Math.abs(Math.sin(d.hintT * 4.2));
        }

        // Position spring (X/Z tighter, Y bouncier)
        const kx = KP, kz = KP, ky = KP * 1.3;
        const dx = KP, dz = KP, dy = DP * 1.1;
        d.vx += (d.tx - d.cx) * kx * dt; d.vx *= Math.max(0, 1 - dx * dt); d.cx += d.vx * dt;
        d.vy += (d.ty - d.cy) * ky * dt; d.vy *= Math.max(0, 1 - dy * dt); d.cy += d.vy * dt;
        d.vz += (d.tz - d.cz) * kz * dt; d.vz *= Math.max(0, 1 - dz * dt); d.cz += d.vz * dt;

        // Scale spring
        d.vs += (d.ts - d.cs) * KS * dt; d.vs *= Math.max(0, 1 - DP * dt); d.cs += d.vs * dt;

        // Opacity lerp
        d.alpha += (d.ta - d.alpha) * 10 * dt;

        // Idle rotation
        if (d.rotSpd) m.rotation[d.rotAx as "x" | "y" | "z"] += d.rotSpd * dt;

        // Apply to Three.js mesh
        m.position.set(d.cx, d.cy, d.cz);
        m.scale.setScalar(Math.max(0.001, d.cs));
        (m.material as THREE.MeshStandardMaterial).opacity = Math.max(0, Math.min(1, d.alpha));
      });

      // Selection ring follows selected gem
      if (selRing.visible && selected) {
        const m = meshMap.get(board[selected.r]?.[selected.c]?.id ?? -1);
        if (m) selRing.position.set(m.userData.cx, 0.53, m.userData.cz);
        const s = 1 + 0.1 * Math.sin(now * 0.009);
        selRing.scale.setScalar(s);
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      canvas.removeEventListener("click", onClick);
      meshMap.forEach(m => scene.remove(m));
      renderer.dispose();
    };
  }, [started]);

  const lv = LEVELS[hud.lvIdx];
  const pct = Math.min(100, Math.round((hud.score / lv.target) * 100));
  const lowMoves = hud.moves <= 5 && hud.moves > 0;

  // ── Splash screen (shown before game starts) ───────────────────────────────
  if (!started) {
    return (
      <div className="min-h-screen bg-[#0d0721] flex flex-col">
        <header className="flex items-center gap-4 px-4 py-3 border-b border-purple-500/30 bg-gradient-to-r from-purple-950/60 to-transparent">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /><span className="text-sm">Hub</span>
          </Link>
          <span className="text-2xl select-none">💎</span>
          <h1 className="text-lg font-bold text-purple-300">Candy Crush 3D</h1>
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-lg w-full rounded-2xl border border-purple-500/30 bg-black/40 overflow-hidden"
            style={{ boxShadow: "0 0 60px rgba(139,92,246,0.3)" }}>
            {/* Hero */}
            <div className="relative p-8 text-center"
              style={{ background: "linear-gradient(135deg,#1e1b4b 0%,#2d1b69 50%,#1e1b4b 100%)" }}>
              <div className="text-7xl mb-3 select-none">💎</div>
              <h2 className="text-3xl font-black text-white mb-1">Candy Crush 3D</h2>
              <p className="text-purple-300/70 text-sm">Match gems · Cascade combos · 10 levels</p>
              {/* Gem showcase */}
              <div className="flex justify-center gap-3 mt-5">
                {GTYPES.map((t, i) => (
                  <div key={t} className="flex flex-col items-center gap-1"
                    style={{ animation: `bounce 1s ease-in-out ${i * 0.1}s infinite alternate` }}>
                    <div className="w-8 h-8 rounded-full shadow-lg"
                      style={{ background: GEM_CSS[t], boxShadow: `0 0 12px ${GEM_CSS[t]}88` }} />
                  </div>
                ))}
              </div>
            </div>
            {/* Info */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-purple-950/50 rounded-xl p-3">
                  <div className="text-2xl font-black text-purple-300">10</div>
                  <div className="text-xs text-purple-400/60 mt-0.5">Levels</div>
                </div>
                <div className="bg-purple-950/50 rounded-xl p-3">
                  <div className="text-2xl font-black text-purple-300">6</div>
                  <div className="text-xs text-purple-400/60 mt-0.5">Gem Types</div>
                </div>
                <div className="bg-purple-950/50 rounded-xl p-3">
                  <div className="text-2xl font-black text-purple-300">3D</div>
                  <div className="text-xs text-purple-400/60 mt-0.5">Rendered</div>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2 text-purple-200/70">
                  <span className="text-purple-400 shrink-0">✦</span>
                  <span>Click a gem, then click an adjacent gem to swap them</span>
                </div>
                <div className="flex items-start gap-2 text-purple-200/70">
                  <span className="text-yellow-400 shrink-0">✦</span>
                  <span>Match 4 in a line → <strong className="text-yellow-300">Striped gem</strong> clears entire row or column</span>
                </div>
                <div className="flex items-start gap-2 text-purple-200/70">
                  <span className="text-pink-400 shrink-0">✦</span>
                  <span>Match 5 → <strong className="text-pink-300">Color Bomb</strong> clears all gems of a color</span>
                </div>
                <div className="flex items-start gap-2 text-purple-200/70">
                  <span className="text-green-400 shrink-0">✦</span>
                  <span>Cascades multiply your score by ×1.5 per chain</span>
                </div>
              </div>
              <button
                onClick={() => setStarted(true)}
                className="w-full py-3 rounded-xl font-black text-lg text-white transition-all duration-200 hover:scale-105 active:scale-95"
                style={{ background: "linear-gradient(135deg,#7c3aed,#db2777)", boxShadow: "0 0 30px rgba(139,92,246,0.5)" }}>
                ▶ Play Now
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Game screen ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0d0721] flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-4 px-4 py-3 border-b border-purple-500/30 bg-gradient-to-r from-purple-950/60 to-transparent">
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /><span className="text-sm">Hub</span>
        </Link>
        <span className="text-2xl select-none">💎</span>
        <h1 className="text-lg font-bold text-purple-300">Candy Crush 3D</h1>
        <span className="ml-auto text-sm text-purple-400/60">Level {hud.lvIdx + 1} · {lv.name}</span>
      </header>

      <div className="flex-1 flex flex-col items-center p-3 gap-3">
        {/* HUD bar */}
        <div className="w-full max-w-[800px] flex items-center gap-4 px-4 py-2 bg-black/40 rounded-xl border border-purple-800/40">
          <div className="flex-1 min-w-0">
            <div className="flex justify-between text-xs text-purple-300/70 mb-1">
              <span className="font-black text-white text-lg leading-none">{hud.score.toLocaleString()}</span>
              <span>Target {lv.target.toLocaleString()}</span>
            </div>
            <div className="h-2 bg-purple-950 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: "linear-gradient(90deg,#a855f7,#ec4899)" }} />
            </div>
          </div>
          {hud.cascade > 0 && (
            <div className="px-2 py-1 rounded-lg bg-yellow-500/20 border border-yellow-400/50 text-yellow-300 text-xs font-black animate-pulse whitespace-nowrap">
              Cascade ×{(1.5 ** hud.cascade).toFixed(1)}
            </div>
          )}
          <div className={`text-center min-w-[56px] ${lowMoves ? "text-red-400 animate-pulse" : "text-white"}`}>
            <div className={`text-3xl font-black leading-none ${lowMoves ? "text-red-400" : "text-purple-200"}`}>{hud.moves}</div>
            <div className="text-[10px] text-purple-400/70 uppercase tracking-wide">moves</div>
          </div>
        </div>

        {/* Canvas */}
        <div className="relative rounded-2xl overflow-hidden shadow-2xl"
          style={{ border: "2px solid rgba(167,139,250,0.25)", boxShadow: "0 0 40px rgba(139,92,246,0.25)" }}>
          <canvas ref={canvasRef} width={800} height={520}
            className="block cursor-pointer select-none"
            style={{ maxWidth: "95vw", height: "auto" }} />

          {/* Win overlay */}
          {overlay === "win" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 gap-4 rounded-2xl">
              <div className="text-6xl">🏆</div>
              <p className="text-3xl font-black text-yellow-300">Level Complete!</p>
              <p className="text-purple-300 text-sm">Score: {hud.score.toLocaleString()}</p>
              <div className="flex gap-3">
                {hud.lvIdx < LEVELS.length - 1 && (
                  <button onClick={() => restartRef.current(true)}
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition-colors">
                    Next Level →
                  </button>
                )}
                <button onClick={() => restartRef.current(false)}
                  className="px-6 py-2 bg-black/40 hover:bg-black/60 text-purple-300 border border-purple-600/50 rounded-xl font-bold transition-colors">
                  Replay
                </button>
              </div>
            </div>
          )}

          {/* Lose overlay */}
          {overlay === "lose" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 gap-4 rounded-2xl">
              <div className="text-6xl">💔</div>
              <p className="text-3xl font-black text-red-400">Out of Moves!</p>
              <p className="text-purple-300 text-sm">{hud.score.toLocaleString()} / {lv.target.toLocaleString()} pts</p>
              <button onClick={() => restartRef.current(false)}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition-colors">
                Try Again
              </button>
            </div>
          )}

          {/* Controls hint */}
          <div className="absolute bottom-2 right-3 text-xs text-purple-400/40 pointer-events-none select-none">
            Click gem → click adjacent to swap
          </div>
        </div>

        {/* Gem legend */}
        <div className="flex flex-wrap justify-center gap-2">
          {GTYPES.map(t => (
            <div key={t} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/30 border border-white/10 text-xs">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: GEM_CSS[t] }} />
              <span className="text-white/60">{GEM_LABEL[t]}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/30 border border-purple-400/30 text-xs">
            <span className="w-2.5 h-2.5 rounded-full inline-block bg-purple-400" />
            <span className="text-purple-300">Match 4 = Striped · Match 5 = Color Bomb</span>
          </div>
        </div>

        {/* Level progress strip */}
        <div className="flex gap-1">
          {LEVELS.map((l, i) => (
            <div key={l.id} title={l.name}
              className={`h-1.5 w-6 rounded-full transition-all ${i < hud.lvIdx ? "bg-purple-500" : i === hud.lvIdx ? "bg-purple-300" : "bg-purple-900"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
