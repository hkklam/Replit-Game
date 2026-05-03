import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import * as THREE from "three";

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-4 px-4 py-3 border-b border-green-500/30 bg-gradient-to-r from-green-950/60 to-transparent">
        <Link href="/" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-sm transition-all">
          <ArrowLeft className="h-4 w-4" />
          <span>Menu</span>
        </Link>
        <span className="text-2xl select-none" style={{ filter: "drop-shadow(0 0 8px #4ade8080)" }}>⛏️</span>
        <h1 className="text-lg font-bold text-green-400">{title}</h1>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center p-3 gap-3">{children}</div>
    </div>
  );
}

// ─── Block definitions ────────────────────────────────────────────────────────
type BlockType = "grass"|"dirt"|"stone"|"wood"|"leaves"|"sand"|"glass"|"brick"|"snow"|"gold";

const BLOCK_COLORS: Record<BlockType, { top:number; side:number; bottom:number }> = {
  grass:  { top:0x4ade80, side:0x6b7c3c, bottom:0x92400e },
  dirt:   { top:0x92400e, side:0x78350f, bottom:0x7c2d12 },
  stone:  { top:0x6b7280, side:0x4b5563, bottom:0x374151 },
  wood:   { top:0x854d0e, side:0x713f12, bottom:0x854d0e },
  leaves: { top:0x16a34a, side:0x15803d, bottom:0x14532d },
  sand:   { top:0xd97706, side:0xb45309, bottom:0xa16207 },
  glass:  { top:0x7dd3fc, side:0x7dd3fc, bottom:0x7dd3fc },
  brick:  { top:0xb91c1c, side:0x991b1b, bottom:0x7f1d1d },
  snow:   { top:0xf1f5f9, side:0xe2e8f0, bottom:0xcbd5e1 },
  gold:   { top:0xfde047, side:0xfacc15, bottom:0xeab308 },
};

const BLOCK_TYPES = Object.keys(BLOCK_COLORS) as BlockType[];

// ─── World dimensions (≈50% surface area of the previous 90×90 world) ────────
const WORLD_W = 64, WORLD_H = 20, WORLD_D = 64;

// Multi-octave terrain — richer hills, valleys and ridges across the larger map
function terrainHeight(x: number, z: number): number {
  return Math.floor(
    5
    + Math.sin(x * 0.13) * 3   + Math.cos(z * 0.11) * 3
    + Math.sin(x * 0.27 + 0.9) * 2   + Math.cos(z * 0.24 + 0.5) * 2
    + Math.sin((x + z) * 0.09) * 2.5
    + Math.sin(x * 0.06) * Math.cos(z * 0.07) * 4
    + Math.sin(x * 0.42 + z * 0.37) * 0.8
  );
}

// Choose surface block type by height for a biome effect
function surfaceBlock(h: number): BlockType {
  if (h <= 3)  return "sand";
  if (h >= 15) return "snow";
  return "grass";
}

function subSurfaceBlock(depth: number, h: number): BlockType {
  if (h <= 3) return "sand";
  if (depth <= 2) return "dirt";
  return "stone";
}

// Occlusion check — only blocks with at least one exposed face need a mesh
function hasExposedFace(w: (BlockType|null)[][][], x: number, y: number, z: number): boolean {
  const dirs = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]] as const;
  for (const [dx,dy,dz] of dirs) {
    const nx=x+dx, ny=y+dy, nz=z+dz;
    if (nx<0||nx>=WORLD_W||ny<0||ny>=WORLD_H||nz<0||nz>=WORLD_D) return true;
    if (!w[nx][ny][nz]) return true;
  }
  return false;
}

function initWorld(): (BlockType|null)[][][] {
  const w: (BlockType|null)[][][] = Array.from({length:WORLD_W},()=>
    Array.from({length:WORLD_H},()=>Array(WORLD_D).fill(null) as (BlockType|null)[])
  );

  for (let x=0;x<WORLD_W;x++) for(let z=0;z<WORLD_D;z++){
    const h = Math.max(1, Math.min(WORLD_H-2, terrainHeight(x,z)));
    for(let y=0;y<=h;y++){
      if(y===h)   w[x][y][z] = surfaceBlock(h);
      else        w[x][y][z] = subSurfaceBlock(h-y, h);
    }
  }

  // Procedural tree placement — skip sand/snow biomes, avoid edges
  for(let tx=4; tx<WORLD_W-4; tx+=7){
    for(let tz=4; tz<WORLD_D-4; tz+=7){
      // Deterministic jitter so trees look natural
      const jx = Math.round((Math.sin(tx*2.3+tz*1.1)*0.5+0.5)*5);
      const jz = Math.round((Math.cos(tx*0.9+tz*2.7)*0.5+0.5)*5);
      const fx=tx+jx, fz=tz+jz;
      if(fx<=0||fx>=WORLD_W-1||fz<=0||fz>=WORLD_D-1) continue;
      const h = Math.max(1, Math.min(WORLD_H-2, terrainHeight(fx,fz)));
      if(h<4||h>13) continue; // only in grassy biome
      const base=h+1;
      const trunkH = 3+Math.floor((Math.sin(fx+fz)*0.5+0.5)*2); // 3 or 4 tall
      for(let y=base;y<base+trunkH&&y<WORLD_H;y++) w[fx][y][fz]="wood";
      const lh=base+trunkH;
      for(let dx=-2;dx<=2;dx++) for(let dz=-2;dz<=2;dz++) for(let dy=-1;dy<=1;dy++){
        if(Math.abs(dx)===2&&Math.abs(dz)===2) continue; // trim corners
        const nx2=fx+dx,ny2=lh+dy,nz2=fz+dz;
        if(nx2>=0&&nx2<WORLD_W&&ny2>=0&&ny2<WORLD_H&&nz2>=0&&nz2<WORLD_D&&!w[nx2][ny2][nz2])
          w[nx2][ny2][nz2]="leaves";
      }
    }
  }
  return w;
}

function isValidPos(x:number,y:number,z:number):boolean{
  return x>=0&&x<WORLD_W&&y>=0&&y<WORLD_H&&z>=0&&z<WORLD_D;
}

// ─── Material cache ───────────────────────────────────────────────────────────
function makeMaterials(): Record<BlockType, THREE.MeshLambertMaterial[]> {
  const result = {} as Record<BlockType, THREE.MeshLambertMaterial[]>;
  for (const bt of BLOCK_TYPES) {
    const cols = BLOCK_COLORS[bt];
    if (bt === "glass") {
      const mat = new THREE.MeshLambertMaterial({color:cols.top, transparent:true, opacity:0.55});
      result[bt] = [mat,mat,mat,mat,mat,mat];
    } else {
      result[bt] = [
        new THREE.MeshLambertMaterial({color:cols.side}),
        new THREE.MeshLambertMaterial({color:cols.side}),
        new THREE.MeshLambertMaterial({color:cols.top}),
        new THREE.MeshLambertMaterial({color:cols.bottom}),
        new THREE.MeshLambertMaterial({color:cols.side}),
        new THREE.MeshLambertMaterial({color:cols.side}),
      ];
    }
  }
  return result;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Minecraft() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // World is built inside the effect so constants are always current (avoids stale-ref on HMR)
  const worldRef = useRef<(BlockType|null)[][][]>([]);
  const [selectedBlock, setSelectedBlock] = useState<BlockType>("grass");
  const [locked, setLocked] = useState(false);
  const selectedRef = useRef<BlockType>("grass");

  useEffect(()=>{ selectedRef.current=selectedBlock; },[selectedBlock]);

  useEffect(()=>{
    const canvas = canvasRef.current!;
    worldRef.current = initWorld();
    const W = 800, H = 500;

    const testCanvas = document.createElement("canvas");
    const testCtx = testCanvas.getContext("webgl2") || testCanvas.getContext("webgl");
    if (!testCtx) { setLocked(false); return; }

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.018);

    const camera = new THREE.PerspectiveCamera(75, W/H, 0.1, 160);
    const sx=WORLD_W/2, sz=WORLD_D/2;
    const sy=terrainHeight(Math.floor(sx),Math.floor(sz))+3;
    camera.position.set(sx, sy, sz);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({canvas, antialias:true});
    } catch { return; }
    renderer.setSize(W, H); renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFShadowMap;

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.55); scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xfff5e0, 1.1);
    sun.position.set(40, 70, 35); sun.castShadow=true;
    sun.shadow.mapSize.width=1024; sun.shadow.mapSize.height=1024;
    sun.shadow.camera.near=0.5; sun.shadow.camera.far=200;
    sun.shadow.camera.left=-55; sun.shadow.camera.right=55;
    sun.shadow.camera.top=55; sun.shadow.camera.bottom=-55;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xadd8e6,0.25);
    fill.position.set(-30,10,-30); scene.add(fill);

    // Geometry (shared box)
    const boxGeo = new THREE.BoxGeometry(1,1,1);
    const materials = makeMaterials();
    const meshMap = new Map<string, THREE.Mesh>();

    // addMesh — only adds a visual, does NOT modify worldRef
    const addMesh = (x:number,y:number,z:number,type:BlockType)=>{
      const key=`${x},${y},${z}`;
      if(meshMap.has(key)) return;
      const mesh = new THREE.Mesh(boxGeo, materials[type]);
      mesh.position.set(x+0.5, y+0.5, z+0.5);
      mesh.castShadow=true; mesh.receiveShadow=true;
      mesh.userData={pos:[x,y,z],type};
      scene.add(mesh); meshMap.set(key, mesh);
    };

    // addBlock — places a block into world data AND scene
    const addBlock = (x:number,y:number,z:number,type:BlockType)=>{
      worldRef.current[x][y][z]=type;
      addMesh(x,y,z,type);
    };

    // removeBlock — removes from scene & world, then reveals any now-exposed neighbors
    const removeBlock = (x:number,y:number,z:number)=>{
      const key=`${x},${y},${z}`;
      const mesh=meshMap.get(key); if(!mesh)return;
      scene.remove(mesh); meshMap.delete(key);
      worldRef.current[x][y][z]=null;
      const dirs=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]] as const;
      for(const [dx,dy,dz] of dirs){
        const nx=x+dx,ny=y+dy,nz=z+dz;
        if(!isValidPos(nx,ny,nz)) continue;
        const bt=worldRef.current[nx][ny][nz];
        if(bt && !meshMap.has(`${nx},${ny},${nz}`)) addMesh(nx,ny,nz,bt);
      }
    };

    // Build initial world — occlusion culling: skip fully buried blocks
    const w=worldRef.current;
    for(let x=0;x<WORLD_W;x++) for(let y=0;y<WORLD_H;y++) for(let z=0;z<WORLD_D;z++){
      if(w[x][y][z] && hasExposedFace(w,x,y,z)) addMesh(x,y,z,w[x][y][z]!);
    }

    // Selection highlight
    const selGeo = new THREE.BoxGeometry(1.02,1.02,1.02);
    const selMat = new THREE.MeshBasicMaterial({color:0xffffff,wireframe:true,transparent:true,opacity:0.5});
    const selBox = new THREE.Mesh(selGeo,selMat);
    selBox.visible=false; scene.add(selBox);

    // Player controls
    let pitch=0, yaw=Math.PI, isLocked=false;
    const keys=new Set<string>();

    const onPLChange=()=>{ isLocked=document.pointerLockElement===canvas; setLocked(isLocked); };
    const onMouseMove=(e:MouseEvent)=>{
      if(!isLocked)return;
      yaw-=e.movementX*0.002;
      pitch=Math.max(-Math.PI/2+0.02,Math.min(Math.PI/2-0.02,pitch-e.movementY*0.002));
    };
    const onKeyDown=(e:KeyboardEvent)=>{ keys.add(e.code); if(["Space","ShiftLeft","ShiftRight"].includes(e.code))e.preventDefault(); };
    const onKeyUp=(e:KeyboardEvent)=>keys.delete(e.code);

    document.addEventListener("pointerlockchange",onPLChange);
    document.addEventListener("mousemove",onMouseMove);
    document.addEventListener("keydown",onKeyDown);
    document.addEventListener("keyup",onKeyUp);

    // Raycaster
    const raycaster = new THREE.Raycaster();
    const center = new THREE.Vector2(0,0);

    const getTarget=()=>{
      raycaster.setFromCamera(center,camera);
      const hits=raycaster.intersectObjects(Array.from(meshMap.values()));
      if(hits.length>0&&hits[0].distance<8){
        const mesh=hits[0].object as THREE.Mesh;
        const [bx,by,bz]=mesh.userData.pos as number[];
        const face=hits[0].face!.normal.clone();
        return {bx,by,bz,nx:Math.round(face.x),ny:Math.round(face.y),nz:Math.round(face.z)};
      }
      return null;
    };

    const onMouseDown=(e:MouseEvent)=>{
      if(!isLocked){canvas.requestPointerLock();return;}
      const t=getTarget();
      if(!t)return;
      if(e.button===0){
        removeBlock(t.bx,t.by,t.bz);
        selBox.visible=false;
      } else if(e.button===2){
        const nx=t.bx+t.nx, ny=t.by+t.ny, nz=t.bz+t.nz;
        if(isValidPos(nx,ny,nz)&&!worldRef.current[nx][ny][nz]){
          addBlock(nx,ny,nz,selectedRef.current);
        }
      }
    };
    const onContextMenu=(e:Event)=>e.preventDefault();
    canvas.addEventListener("mousedown",onMouseDown);
    canvas.addEventListener("contextmenu",onContextMenu);

    // Block selector 1–0
    const onKeyBlock=(e:KeyboardEvent)=>{
      const idx=parseInt(e.key)-1;
      if(idx>=0&&idx<BLOCK_TYPES.length){ selectedRef.current=BLOCK_TYPES[idx]; setSelectedBlock(BLOCK_TYPES[idx]); }
    };
    document.addEventListener("keydown",onKeyBlock);

    // Animation loop
    let lastTime=performance.now(), rafId=0;
    const animate=()=>{
      rafId=requestAnimationFrame(animate);
      const now=performance.now();
      const dt=Math.min((now-lastTime)/1000,0.05);
      lastTime=now;

      camera.rotation.order="YXZ";
      camera.rotation.y=yaw; camera.rotation.x=pitch;

      const speed=7;
      const mv=new THREE.Vector3();
      if(keys.has("KeyW"))mv.z-=1;
      if(keys.has("KeyS"))mv.z+=1;
      if(keys.has("KeyA"))mv.x-=1;
      if(keys.has("KeyD"))mv.x+=1;
      if(keys.has("Space"))mv.y+=1;
      if(keys.has("ShiftLeft")||keys.has("ShiftRight"))mv.y-=1;
      if(mv.lengthSq()>0){
        mv.normalize();
        const yq=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,yaw,0));
        mv.applyQuaternion(yq);
        camera.position.addScaledVector(mv,speed*dt);
      }
      camera.position.clamp(
        new THREE.Vector3(0.5, 0.5, 0.5),
        new THREE.Vector3(WORLD_W-0.5, WORLD_H+6, WORLD_D-0.5)
      );

      const t=getTarget();
      if(t&&isLocked){ selBox.position.set(t.bx+0.5,t.by+0.5,t.bz+0.5); selBox.visible=true; }
      else { selBox.visible=false; }

      renderer.render(scene,camera);
    };
    animate();

    return()=>{
      cancelAnimationFrame(rafId);
      document.removeEventListener("pointerlockchange",onPLChange);
      document.removeEventListener("mousemove",onMouseMove);
      document.removeEventListener("keydown",onKeyDown);
      document.removeEventListener("keyup",onKeyUp);
      document.removeEventListener("keydown",onKeyBlock);
      canvas.removeEventListener("mousedown",onMouseDown);
      canvas.removeEventListener("contextmenu",onContextMenu);
      if(document.pointerLockElement===canvas)document.exitPointerLock();
      renderer.dispose();
      meshMap.forEach(m=>scene.remove(m));
      for(const mats of Object.values(materials)) mats.forEach(m=>m.dispose());
      boxGeo.dispose(); selGeo.dispose(); selMat.dispose();
    };
  },[]);

  return (
    <Shell title="Minecraft 3D">
      <div className="relative" style={{width:800,maxWidth:"95vw"}}>
        <canvas ref={canvasRef} width={800} height={500}
          className="block rounded-xl w-full cursor-crosshair"
          style={{maxWidth:"95vw",height:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.6)"}}
        />
        {!locked && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/65 rounded-xl gap-3 cursor-pointer select-none"
            onClick={() => { setLocked(true); canvasRef.current?.requestPointerLock(); }}
          >
            <div className="text-6xl">⛏️</div>
            <p className="text-white text-xl font-black">Click to Enter World</p>
            <div className="text-white/60 text-xs text-center space-y-0.5">
              <p>🖱️ Left click = break block · Right click = place block</p>
              <p>⌨️ WASD = move · Space = fly up · Shift = fly down</p>
              <p>🔢 Keys 1–{BLOCK_TYPES.length} to select block type</p>
              <p>ESC to exit mouse lock</p>
            </div>
          </div>
        )}
        {locked && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="relative w-8 h-8">
              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/90 -translate-y-1/2" style={{boxShadow:"0 0 3px rgba(0,0,0,0.8)"}}/>
              <div className="absolute left-1/2 top-0 h-full w-0.5 bg-white/90 -translate-x-1/2" style={{boxShadow:"0 0 3px rgba(0,0,0,0.8)"}}/>
            </div>
          </div>
        )}
        {locked && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 border border-white/20 rounded-lg px-4 py-1.5 text-white text-xs font-bold">
            Selected: {selectedBlock} [{BLOCK_TYPES.indexOf(selectedBlock)+1}]
          </div>
        )}
      </div>

      <div className="flex gap-1.5 flex-wrap justify-center">
        {BLOCK_TYPES.map((bt,i)=>{
          const col=BLOCK_COLORS[bt];
          const topHex="#"+col.top.toString(16).padStart(6,"0");
          return (
            <button key={bt} onClick={()=>{ setSelectedBlock(bt); selectedRef.current=bt; }}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg border text-xs font-bold transition-all ${selectedBlock===bt?"border-white scale-110":"border-border/50 opacity-65 hover:opacity-100"}`}
              style={{background:topHex+"25",color:topHex}}>
              <span className="text-[9px] text-muted-foreground">{i+1}</span>
              {bt}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Free-flight mode · {WORLD_W}×{WORLD_H}×{WORLD_D} voxel world — biomes: sand, grass, stone &amp; snow peaks
      </p>
    </Shell>
  );
}
