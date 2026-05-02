// ─── Types ────────────────────────────────────────────────────────────────────
export type GemType = "ruby"|"sapphire"|"emerald"|"topaz"|"amethyst"|"diamond";
export type SpecialType = "striped_h"|"striped_v"|"colorbomb";
export interface Cell { type: GemType; special: SpecialType|null; id: number; }
export type Board = (Cell|null)[][];
export interface MatchGroup { cells:[number,number][]; dir:"h"|"v"; type:GemType; }

// ─── Constants ────────────────────────────────────────────────────────────────
export const COLS=8, ROWS=8;
export const GTYPES:GemType[]=["ruby","sapphire","emerald","topaz","amethyst","diamond"];
export const LEVELS=[
  {id:1, name:"Sweet Start",   target:400,   moves:20},
  {id:2, name:"Sugar Rush",    target:800,   moves:22},
  {id:3, name:"Candy Land",    target:1400,  moves:20},
  {id:4, name:"Gem Garden",    target:2200,  moves:18},
  {id:5, name:"Crystal Cave",  target:3200,  moves:18},
  {id:6, name:"Stone Arch",    target:4500,  moves:17},
  {id:7, name:"Ice Floe",      target:6000,  moves:16},
  {id:8, name:"Lava Fields",   target:8000,  moves:15},
  {id:9, name:"Star Drift",    target:10500, moves:14},
  {id:10,name:"Cosmos",        target:14000, moves:13},
];

// ─── ID counter (reset on board init) ─────────────────────────────────────────
let _id=0;
export const resetIds=()=>{ _id=0; };
export const nextId=()=>++_id;
export const rtype=():GemType=>GTYPES[Math.floor(Math.random()*6)];
export const mkCell=(t?:GemType,sp:SpecialType|null=null):Cell=>({type:t??rtype(),special:sp,id:nextId()});

// ─── Board init (no initial matches) ─────────────────────────────────────────
function wouldMatch(b:Board,r:number,c:number,t:GemType):boolean{
  return (c>=2&&b[r][c-1]?.type===t&&b[r][c-2]?.type===t)||
         (r>=2&&b[r-1]?.[c]?.type===t&&b[r-2]?.[c]?.type===t);
}
export function initBoard():Board{
  const b:Board=Array.from({length:ROWS},()=>Array(COLS).fill(null));
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    let t:GemType,k=0; do{t=rtype();k++;}while(k<30&&wouldMatch(b,r,c,t));
    b[r][c]=mkCell(t);
  }
  return b;
}

// ─── Match detection ──────────────────────────────────────────────────────────
export function getMatchGroups(b:Board):MatchGroup[]{
  const gs:MatchGroup[]=[];
  for(let r=0;r<ROWS;r++){
    let c=0; while(c<COLS){
      const t=b[r][c]?.type; if(!t){c++;continue;}
      let e=c; while(e+1<COLS&&b[r][e+1]?.type===t)e++;
      if(e-c>=2){const cells:[number,number][]=[];for(let i=c;i<=e;i++)cells.push([r,i]);gs.push({cells,dir:"h",type:t});}
      c=e+1;
    }
  }
  for(let c=0;c<COLS;c++){
    let r=0; while(r<ROWS){
      const t=b[r][c]?.type; if(!t){r++;continue;}
      let e=r; while(e+1<ROWS&&b[e+1]?.[c]?.type===t)e++;
      if(e-r>=2){const cells:[number,number][]=[];for(let i=r;i<=e;i++)cells.push([i,c]);gs.push({cells,dir:"v",type:t});}
      r=e+1;
    }
  }
  return gs;
}
export function findMatches(b:Board):Set<string>{
  const s=new Set<string>();
  getMatchGroups(b).forEach(g=>g.cells.forEach(([r,c])=>s.add(`${r},${c}`)));
  return s;
}

// ─── Gravity & fill ───────────────────────────────────────────────────────────
export function applyGravity(b:Board):{id:number;fr:number;tr:number;col:number}[]{
  const falls:{id:number;fr:number;tr:number;col:number}[]=[];
  for(let c=0;c<COLS;c++){
    let w=ROWS-1;
    for(let r=ROWS-1;r>=0;r--){
      if(b[r][c]){if(r!==w){falls.push({id:b[r][c]!.id,fr:r,tr:w,col:c});b[w][c]=b[r][c];b[r][c]=null;}w--;}
    }
  }
  return falls;
}
export function fillBoard(b:Board):{cell:Cell;col:number;row:number;queuePos:number}[]{
  const sp:{cell:Cell;col:number;row:number;queuePos:number}[]=[];
  for(let c=0;c<COLS;c++){
    let empty=0; for(let r=0;r<ROWS;r++) if(!b[r][c])empty++;
    let idx=0; for(let r=0;r<ROWS;r++) if(!b[r][c]){
      const cell=mkCell(); b[r][c]=cell;
      sp.push({cell,col:c,row:r,queuePos:empty-idx}); idx++;
    }
  }
  return sp;
}

// ─── Hint ─────────────────────────────────────────────────────────────────────
export function findHint(b:Board):[[number,number],[number,number]]|null{
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    if(c<COLS-1){
      const t=b[r][c];b[r][c]=b[r][c+1];b[r][c+1]=t;
      const m=findMatches(b).size>0; b[r][c+1]=b[r][c];b[r][c]=t;
      if(m)return[[r,c],[r,c+1]];
    }
    if(r<ROWS-1){
      const t=b[r][c];b[r][c]=b[r+1][c];b[r+1][c]=t;
      const m=findMatches(b).size>0; b[r+1][c]=b[r][c];b[r][c]=t;
      if(m)return[[r,c],[r+1,c]];
    }
  }
  return null;
}
