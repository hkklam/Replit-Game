// ─── Types ────────────────────────────────────────────────────────────────────
export type GemType = "ruby"|"sapphire"|"emerald"|"topaz"|"amethyst"|"diamond";
export type SpecialType = "striped_h"|"striped_v"|"wrapped"|"cross"|"colorbomb";
export interface Cell { type: GemType; special: SpecialType|null; id: number; }
export type Board = (Cell|null)[][];
export interface MatchGroup {
  cells: [number,number][];
  dir:   "h"|"v";
  type:  GemType;
  special: SpecialType|null; // special to create at the anchor cell (null = plain 3-match)
}

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

// ─── ID counter ───────────────────────────────────────────────────────────────
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
// Returns groups with shape-aware special assignment:
//   3-straight            → special: null
//   4-straight            → special: striped_h / striped_v
//   5+-straight           → special: colorbomb
//   H+V overlap same type → special: wrapped  (L/T corner) or cross (interior +)
export function getMatchGroups(b:Board):MatchGroup[]{
  type Run = { cells:[number,number][]; type:GemType; dir:"h"|"v"; used:boolean };

  // Collect all horizontal runs of length ≥ 3
  const hRuns:Run[]=[];
  for(let r=0;r<ROWS;r++){
    let c=0;
    while(c<COLS){
      const t=b[r][c]?.type; if(!t){c++;continue;}
      let e=c; while(e+1<COLS&&b[r][e+1]?.type===t)e++;
      if(e-c>=2){
        const cells:[number,number][]=[];
        for(let i=c;i<=e;i++) cells.push([r,i]);
        hRuns.push({cells,type:t,dir:"h",used:false});
      }
      c=e+1;
    }
  }

  // Collect all vertical runs of length ≥ 3
  const vRuns:Run[]=[];
  for(let c=0;c<COLS;c++){
    let r=0;
    while(r<ROWS){
      const t=b[r][c]?.type; if(!t){r++;continue;}
      let e=r; while(e+1<ROWS&&b[e+1]?.[c]?.type===t)e++;
      if(e-r>=2){
        const cells:[number,number][]=[];
        for(let i=r;i<=e;i++) cells.push([i,c]);
        vRuns.push({cells,type:t,dir:"v",used:false});
      }
      r=e+1;
    }
  }

  // Index: cell key → hRun index
  const cellH=new Map<string,number>();
  hRuns.forEach((run,i)=>run.cells.forEach(([r,c])=>cellH.set(`${r},${c}`,i)));

  const groups:MatchGroup[]=[];

  // Detect L/T/cross shapes by finding H×V intersections of same type
  for(let vi=0;vi<vRuns.length;vi++){
    const vr=vRuns[vi];
    for(const [r,c] of vr.cells){
      const hi=cellH.get(`${r},${c}`);
      if(hi===undefined) continue;
      const hr=hRuns[hi];
      if(hr.type!==vr.type||hr.used||vr.used) continue;

      // Mark both runs consumed
      hr.used=true; vr.used=true;

      // Merge cells (no duplicates)
      const vUniq=vr.cells.filter(([vR,vC])=>!hr.cells.some(([hR,hC])=>hR===vR&&hC===vC));
      const allCells=[...hr.cells,...vUniq];

      // Classify shape:
      // cross = shared cell is NOT at the end of either run (true + shape)
      //       OR combined >= 7 cells (big shape)
      const hFirst=hr.cells[0],hLast=hr.cells[hr.cells.length-1];
      const vFirst=vr.cells[0],vLast=vr.cells[vr.cells.length-1];
      const atHEnd=(hFirst[0]===r&&hFirst[1]===c)||(hLast[0]===r&&hLast[1]===c);
      const atVEnd=(vFirst[0]===r&&vFirst[1]===c)||(vLast[0]===r&&vLast[1]===c);

      const sp:SpecialType=(!atHEnd&&!atVEnd)||(allCells.length>=7) ? "cross" : "wrapped";
      groups.push({cells:allCells,dir:"h",type:hr.type,special:sp});
      break; // each V-run merges with at most one H-run
    }
  }

  // Remaining straight H-runs
  hRuns.forEach(run=>{
    if(run.used) return;
    let sp:SpecialType|null=null;
    if(run.cells.length>=5)      sp="colorbomb";
    else if(run.cells.length===4) sp="striped_h";
    groups.push({cells:run.cells,dir:"h",type:run.type,special:sp});
  });

  // Remaining straight V-runs
  vRuns.forEach(run=>{
    if(run.used) return;
    let sp:SpecialType|null=null;
    if(run.cells.length>=5)      sp="colorbomb";
    else if(run.cells.length===4) sp="striped_v";
    groups.push({cells:run.cells,dir:"v",type:run.type,special:sp});
  });

  return groups;
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
