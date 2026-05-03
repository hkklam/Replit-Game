/**
 * Programming Tutor Content Database
 * Maps games to educational content with concepts, code examples, and quizzes
 */

export interface CodeExample {
  title: string;
  description: string;
  code: string;
  language: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface Concept {
  id: string;
  name: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  description: string;
  examples: CodeExample[];
  commonUse: string[];
}

export interface GameLesson {
  gameId: string;
  gameName: string;
  gameIcon: string;
  summary: string;
  uniqueConcepts: Concept[];
  commonConcepts: string[];
  quiz: QuizQuestion[];
}

export interface ConceptSection {
  id: string;
  title: string;
  icon: string;
  tagline: string;
  concepts: Concept[];
  quiz: QuizQuestion[];
}

export const TUTOR_LESSONS: Record<string, GameLesson> = {
  snake: {
    gameId: "snake",
    gameName: "Snake",
    gameIcon: "🐍",
    summary:
      "Snake is a classic arcade game where the player controls a snake that grows longer as it eats food. The main challenge is avoiding collisions with the walls and itself while navigating the grid.",
    uniqueConcepts: [
      {
        id: "state-management",
        name: "State Management & Game Loop",
        difficulty: "beginner",
        description:
          "Managing game state (snake position, food, score) and updating it every frame. This is the backbone of any real-time game.",
        examples: [
          {
            title: "Game State Definition",
            description: "Defining the Snake type to track position and direction",
            code: `type P = { x: number; y: number };
type Snake = { 
  snake: P[]; 
  prevSnake: P[]; 
  dir: P; 
  nd: P; 
  alive: boolean; 
  score: number 
};`,
            language: "typescript",
          },
          {
            title: "Update Loop",
            description: "Updating snake position each frame",
            code: `function updateSnake(state: Snake, food: P) {
  const head = state.snake[0];
  const newHead = { 
    x: head.x + state.dir.x, 
    y: head.y + state.dir.y 
  };
  
  // Check collisions
  if (newHead.x < 0 || newHead.x >= GRID) return false;
  if (state.snake.some(s => s.x === newHead.x && s.y === newHead.y)) return false;
  
  // Add new head
  state.snake.unshift(newHead);
  
  // Check food
  if (newHead.x === food.x && newHead.y === food.y) {
    state.score += 10;
  } else {
    state.snake.pop();
  }
  return true;
}`,
            language: "typescript",
          },
        ],
        commonUse: ["All games", "UI frameworks", "Real-time applications"],
      },
      {
        id: "bfs-pathfinding",
        name: "BFS Pathfinding Algorithm",
        difficulty: "advanced",
        description:
          "Breadth-First Search finds the shortest path from the snake's head to the food. Used in Hard difficulty AI.",
        examples: [
          {
            title: "BFS Path Finding",
            description: "Finding shortest path from snake to food",
            code: `function bfsDir(head: P, body: P[], obstacles: P[], target: P): P | null {
  const key = (p: P) => \`\${p.x},\${p.y}\`;
  const blocked = new Set([...body.slice(1), ...obstacles].map(key));
  const visited = new Set<string>([key(head)]);
  const dirs: P[] = [
    { x: 1, y: 0 },  // right
    { x: -1, y: 0 }, // left
    { x: 0, y: 1 },  // down
    { x: 0, y: -1 }  // up
  ];
  const queue: { pos: P; first: P }[] = [];
  
  // Add all valid starting directions
  for (const d of dirs) {
    const nx = head.x + d.x, ny = head.y + d.y;
    if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) continue;
    if (blocked.has(key({ x: nx, y: ny }))) continue;
    queue.push({ pos: { x: nx, y: ny }, first: d });
  }
  
  // BFS search
  while (queue.length) {
    const { pos, first } = queue.shift()!;
    if (pos.x === target.x && pos.y === target.y) return first;
    
    for (const d of dirs) {
      const nx = pos.x + d.x, ny = pos.y + d.y;
      const nk = key({ x: nx, y: ny });
      if (visited.has(nk) || blocked.has(nk)) continue;
      visited.add(nk);
      queue.push({ pos: { x: nx, y: ny }, first });
    }
  }
  return null;
}`,
            language: "typescript",
          },
        ],
        commonUse: ["Game AI", "Robotics", "Network routing", "GPS navigation"],
      },
      {
        id: "collision-detection",
        name: "Collision Detection",
        difficulty: "beginner",
        description: "Detecting when the snake hits walls, itself, or food on a grid.",
        examples: [
          {
            title: "Simple Collision Check",
            description: "Checking if new position is valid",
            code: `const newHead = { x: head.x + dir.x, y: head.y + dir.y };

// Wall collision
if (newHead.x < 0 || newHead.x >= GRID || newHead.y < 0 || newHead.y >= GRID) {
  return gameOver();
}

// Self collision
if (snake.some(segment => 
  segment.x === newHead.x && segment.y === newHead.y
)) {
  return gameOver();
}

// Food collision
if (newHead.x === food.x && newHead.y === food.y) {
  score += 10;
  food = generateNewFood();
}`,
            language: "typescript",
          },
        ],
        commonUse: ["All games", "Physics engines", "VR applications"],
      },
    ],
    commonConcepts: [
      "React Hooks (useState, useEffect, useRef)",
      "Canvas drawing",
      "Keyboard event handling",
      "Game speed/difficulty management",
    ],
    quiz: [
      {
        id: "q1",
        question:
          "In the Snake game, why is BFS (Breadth-First Search) better than randomly moving?",
        options: [
          "It's faster to compute",
          "It finds the shortest path to food, making the AI efficient",
          "It uses less memory",
          "It looks more like real snake behavior",
        ],
        correctAnswer: 1,
        explanation:
          "BFS guarantees finding the shortest path from the snake's head to the food, which makes the AI optimal at catching food while avoiding obstacles.",
      },
      {
        id: "q2",
        question: "What does the prevSnake array store in the snake state?",
        options: [
          "The direction the snake was moving before",
          "The previous position of the snake for undo operations",
          "A copy of the snake before the last move (used for rendering)",
          "Historical positions for AI learning",
        ],
        correctAnswer: 2,
        explanation:
          "prevSnake stores the snake's previous state, often used for smooth animations or to enable rewind features.",
      },
      {
        id: "q3",
        question:
          "Why do we check `state.snake.some(s => s.x === newHead.x && s.y === newHead.y)` before moving?",
        options: [
          "To prevent the snake from turning 180 degrees",
          "To detect collision with the snake's own body",
          "To check if food is at the new position",
          "To validate the new position is in bounds",
        ],
        correctAnswer: 1,
        explanation:
          "This checks if the snake hits itself by comparing the new head position against all body segments.",
      },
    ],
  },

  pong: {
    gameId: "pong",
    gameName: "Pong",
    gameIcon: "🏓",
    summary:
      "Pong is a two-player paddle game where players control paddles to hit a ball back and forth. The AI opponent predicts ball trajectory and positions itself optimally.",
    uniqueConcepts: [
      {
        id: "physics-simulation",
        name: "Physics Simulation & Ball Prediction",
        difficulty: "intermediate",
        description:
          "Simulating realistic ball movement with velocity and predicting where the ball will be when it reaches the paddle.",
        examples: [
          {
            title: "Ball Physics Update",
            description: "Updating ball position and velocity",
            code: `// Update ball position
state.bx += state.bvx;
state.by += state.bvy;

// Add gravity/air resistance (optional)
state.bvy *= 0.99;

// Bounce off top/bottom walls
if (state.by <= BR) {
  state.by = BR;
  state.bvy = -state.bvy;
} else if (state.by >= H - BR) {
  state.by = H - BR;
  state.bvy = -state.bvy;
}

// Paddle collision
if (state.bx <= PW + BR && 
    state.by >= state.p1y && 
    state.by <= state.p1y + PH) {
  state.bx = PW + BR;
  state.bvx = Math.abs(state.bvx);
  state.bvy += (state.by - (state.p1y + PH/2)) * 0.05;
}`,
            language: "typescript",
          },
          {
            title: "Ball Trajectory Prediction",
            description: "Predicting where ball will be at paddle x position",
            code: `// Predict ball's Y position when it reaches AI paddle
function predictBallY(bx: number, by: number, bvx: number, bvy: number): number {
  if (bvx <= 0) return by; // Ball not moving toward paddle
  
  const distX = (W - 20 - PW - BR) - bx; // Distance to AI paddle
  const frames = distX / Math.max(bvx, 0.1); // How many frames until contact
  
  let pred = by + bvy * frames; // Predicted Y position
  
  // Account for bounces on walls
  const period = (H - BR * 2) * 2;
  pred = pred - BR;
  pred = ((pred % period) + period) % period;
  if (pred > H - BR * 2) pred = period - pred;
  
  return pred + BR;
}`,
            language: "typescript",
          },
        ],
        commonUse: ["Physics engines", "Game development", "Sports simulations"],
      },
      {
        id: "ai-difficulty",
        name: "Adaptive AI Difficulty",
        difficulty: "intermediate",
        description:
          "Creating AI with different difficulty levels by adjusting speed, error rate, and prediction accuracy.",
        examples: [
          {
            title: "AI Configuration by Difficulty",
            description: "Different parameters for each AI difficulty level",
            code: `const AI_CFG: Record<Difficulty, { spd: number; err: number; interval: number; predict: boolean }> = {
  easy:   { spd: 2.0,  err: 75, interval: 28, predict: false },  // Slow, inaccurate, no prediction
  medium: { spd: 3.6,  err: 22, interval: 12, predict: true  },  // Moderate speed and accuracy
  hard:   { spd: 5.6,  err: 5,  interval: 3,  predict: true  },  // Fast, very accurate
};

function stepAI(state: PongState, diff: Difficulty) {
  const cfg = AI_CFG[diff];
  
  // Occasionally update target position
  if (--state.aiTimer <= 0) {
    state.aiTimer = cfg.interval; // Lower interval = faster reactions
    
    // With prediction enabled, calculate ball's Y position
    const targetY = cfg.predict 
      ? predictBallY(state.bx, state.by, state.bvx, state.bvy)
      : state.by;
    
    // Add error (randomness)
    state.aiTarget = targetY + (Math.random() - 0.5) * cfg.err * 2;
  }
  
  // Move paddle toward target
  const center = state.p2y + PH / 2;
  if (center < state.aiTarget - 2) {
    state.p2y = Math.min(H - PH, state.p2y + cfg.spd);
  } else if (center > state.aiTarget + 2) {
    state.p2y = Math.max(0, state.p2y - cfg.spd);
  }
}`,
            language: "typescript",
          },
        ],
        commonUse: ["Game AI", "Machine learning", "Adaptive systems"],
      },
    ],
    commonConcepts: [
      "Canvas drawing and rendering",
      "Event handling (keyboard/touch)",
      "Score management",
      "Game state synchronization (online multiplayer)",
    ],
    quiz: [
      {
        id: "q1",
        question:
          "What does the `predictBallY` function do in the AI opponent?",
        options: [
          "Calculates the ball's current position",
          "Predicts where the ball will be when it reaches the paddle's X position",
          "Determines if the ball will go out of bounds",
          "Tracks the ball's speed",
        ],
        correctAnswer: 1,
        explanation:
          "This function predicts the ball's Y position when it reaches the AI paddle's X position, allowing the AI to move preemptively.",
      },
      {
        id: "q2",
        question: "Why does easy AI have `predict: false` while hard AI has `predict: true`?",
        options: [
          "To save CPU power on easy difficulty",
          "Because easy AI doesn't need to be accurate",
          "Easy AI reacts slower and doesn't predict; hard AI predicts the ball's path for perfect accuracy",
          "It's just a display setting",
        ],
        correctAnswer: 2,
        explanation:
          "Easy AI has no prediction so it just reacts to the current ball position, making it less accurate. Hard AI predicts the future position for optimal play.",
      },
      {
        id: "q3",
        question: "In the ball physics, what does `state.bvy *= 0.99` do?",
        options: [
          "Reverses the ball's Y velocity",
          "Slowly reduces the ball's Y velocity (simulating air resistance/friction)",
          "Increases the ball's Y velocity",
          "Has no effect on gameplay",
        ],
        correctAnswer: 1,
        explanation:
          "Multiplying velocity by 0.99 each frame gradually reduces it, simulating air resistance and making the ball lose upward/downward momentum over time.",
      },
    ],
  },

  tetris: {
    gameId: "tetris",
    gameName: "Tetris",
    gameIcon: "🟦",
    summary:
      "Tetris is a tile-matching puzzle game where players arrange falling Tetris pieces to clear complete rows. Features include rotation, wall kicks, and gravity-based mechanics.",
    uniqueConcepts: [
      {
        id: "matrix-rotation",
        name: "Matrix Rotation (Tetris Pieces)",
        difficulty: "intermediate",
        description:
          "Rotating a tetromino (Tetris piece) 90 degrees clockwise using matrix transformation.",
        examples: [
          {
            title: "Clockwise Matrix Rotation",
            description: "Rotating a 2D array 90 degrees clockwise",
            code: `function rotateCW(m: Matrix): Matrix {
  const R = m.length;      // Number of rows
  const C = m[0].length;   // Number of columns
  
  // Create new matrix with swapped dimensions
  const out: Matrix = Array.from(
    { length: C },
    () => new Array(R).fill(0)
  );
  
  // Rotate: new[c][R-1-r] = old[r][c]
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      out[c][R - 1 - r] = m[r][c];
    }
  }
  
  return out;
}

// Example: I-piece [1,1,1,1] rotates to vertical [1],[1],[1],[1]`,
            language: "typescript",
          },
          {
            title: "Piece Definition",
            description: "How Tetris pieces are defined as matrices",
            code: `const DEFS: Record<string, PieceDef> = {
  I: { 
    color: "#00e5ff", 
    matrix: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    spawnCol: 3
  },
  T: {
    color: "#cc44ff",
    matrix: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    spawnCol: 3
  },
  O: {
    color: "#ffe000",
    matrix: [[1, 1], [1, 1]],
    spawnCol: 4
  }
  // ... other pieces
};`,
            language: "typescript",
          },
        ],
        commonUse: [
          "Graphics transformations",
          "Game development",
          "3D rotations (extended)",
        ],
      },
      {
        id: "wall-kick",
        name: "Wall Kick System (SRS)",
        difficulty: "advanced",
        description:
          "Allowing pieces to rotate even when partially blocked by walls or other pieces using offset adjustments.",
        examples: [
          {
            title: "SRS Wall Kick Implementation",
            description:
              "Standard Rotation System wall kick offsets for rotation near walls",
            code: `// Wall kick offsets: try these positions when rotation fails
const KICKS_NORMAL: [number, number][] = [
  [0, 0],   // Default position
  [0, -1],  // Try 1 left
  [0, 1],   // Try 1 right
  [0, -2],  // Try 2 left
  [0, 2],   // Try 2 right
  [-1, 0]   // Try 1 up
];

const KICKS_I: [number, number][] = [
  [0, 0], [0, -2], [0, 2], [0, -3], [0, 3], [0, 1], [-1, 0]
];

function tryRotate(piece: Piece, board: Board) {
  const rotated = rotateCW(piece.matrix);
  const kicks = piece.type === 'I' ? KICKS_I : KICKS_NORMAL;
  
  // Try each kick offset
  for (const [dr, dc] of kicks) {
    const newRow = piece.row + dr;
    const newCol = piece.col + dc;
    
    if (valid(rotated, newRow, newCol, board)) {
      // Rotation succeeded with this offset
      piece.matrix = rotated;
      piece.row = newRow;
      piece.col = newCol;
      return true;
    }
  }
  
  return false; // Rotation blocked
}`,
            language: "typescript",
          },
        ],
        commonUse: ["Tetris-like games", "Physics engines", "Collision systems"],
      },
      {
        id: "line-clearing",
        name: "Line Clearing & Cascades",
        difficulty: "beginner",
        description:
          "Detecting full rows, removing them, dropping pieces above, and calculating points.",
        examples: [
          {
            title: "Line Detection and Clearing",
            description: "Finding and removing complete lines",
            code: `function clearLines(board: Board) {
  const linesToClear: number[] = [];
  
  // Find all complete lines
  for (let r = 0; r < ROWS; r++) {
    if (board[r].every(cell => cell !== "")) {
      linesToClear.push(r);
    }
  }
  
  // Remove complete lines
  for (const r of linesToClear.reverse()) {
    board.splice(r, 1);
    board.unshift(new Array(COLS).fill("")); // Add empty row at top
  }
  
  // Calculate points
  const points = [0, 100, 300, 500, 800][linesToClear.length];
  return { cleared: linesToClear.length, points };
}`,
            language: "typescript",
          },
        ],
        commonUse: ["Puzzle games", "Match-3 mechanics", "Cascade systems"],
      },
    ],
    commonConcepts: [
      "Canvas rendering",
      "Gravity simulation",
      "Lock delay mechanics",
      "High score persistence",
      "Level progression",
    ],
    quiz: [
      {
        id: "q1",
        question:
          "What does the rotateCW function do to transform an I-piece from horizontal to vertical?",
        options: [
          "It flips the piece upside down",
          "It transposes the matrix and reverses rows (90° clockwise rotation)",
          "It randomly changes the piece orientation",
          "It moves the piece left",
        ],
        correctAnswer: 1,
        explanation:
          "The formula `out[c][R-1-r] = m[r][c]` rotates the matrix 90 degrees clockwise, transforming a 1x4 horizontal piece into a 4x1 vertical piece.",
      },
      {
        id: "q2",
        question: "Why does Tetris use a wall kick system instead of simply blocking rotation?",
        options: [
          "To make the game easier",
          "To allow pieces to rotate near walls by trying offset positions, improving playability",
          "To make pieces move faster",
          "It's just for show",
        ],
        correctAnswer: 1,
        explanation:
          "Wall kicks allow rotation with small adjustments, preventing frustration when a piece can't rotate due to being near a wall. This is expected behavior in modern Tetris.",
      },
      {
        id: "q3",
        question: "In line clearing, why do we `unshift` a new empty row at the top?",
        options: [
          "To make the game easier",
          "To fill the gap left by removed lines and make pieces fall",
          "To add new pieces",
          "It's a visual effect only",
        ],
        correctAnswer: 1,
        explanation:
          "When lines are cleared and removed, we add empty rows at the top to maintain the board size. The pieces above then 'fall' into the empty space.",
      },
    ],
  },

  chess: {
    gameId: "chess",
    gameName: "Chess",
    gameIcon: "♟️",
    summary:
      "Chess is a turn-based strategy game with complex move validation. Each piece type has unique movement rules, and the game includes special moves like castling and en passant.",
    uniqueConcepts: [
      {
        id: "move-generation",
        name: "Move Generation & Validation",
        difficulty: "advanced",
        description:
          "Generating all legal moves for each piece type and validating they don't leave the king in check.",
        examples: [
          {
            title: "Pawn Movement Rules",
            description: "Generating valid pawn moves including promotion",
            code: `const dir = color === "w" ? -1 : 1;
const startRow = color === "w" ? 6 : 1;
const promoRow = color === "w" ? 0 : 7;

function addPawn(tr: number, tc: number) {
  if (tr === promoRow) {
    // Promote to Queen, Rook, Bishop, or Knight
    for (const p of ["Q", "R", "B", "N"]) {
      moves.push({ from: [r, c], to: [tr, tc], promo: p });
    }
  } else {
    moves.push({ from: [r, c], to: [tr, tc] });
  }
}

// One square forward
if (inb(r + dir, c) && !board[r + dir][c]) {
  addPawn(r + dir, c);
  
  // Two squares forward from starting position
  if (r === startRow && !board[r + dir * 2][c]) {
    addPawn(r + dir * 2, c);
  }
}

// Diagonal captures and en passant
for (const dc of [-1, 1]) {
  if (!inb(r + dir, c + dc)) continue;
  
  // Normal capture
  if (board[r + dir][c + dc]?.color !== color && board[r + dir][c + dc]) {
    addPawn(r + dir, c + dc);
  }
  
  // En passant
  if (ep && ep[0] === r + dir && ep[1] === c + dc) {
    moves.push({ from: [r, c], to: [r + dir, c + dc] });
  }
}`,
            language: "typescript",
          },
          {
            title: "Sliding Piece Movement (Bishop/Rook/Queen)",
            description: "Generating moves for pieces that slide across the board",
            code: `function slide(dr: number, dc: number) {
  for (let i = 1; i < 8; i++) {
    const rr = r + dr * i;
    const cc = c + dc * i;
    
    // Stop at board edge
    if (!inb(rr, cc)) break;
    
    // Stop at own piece
    if (board[rr][cc]?.color === color) break;
    
    // Add move
    moves.push({ from: [r, c], to: [rr, cc] });
    
    // Stop at opponent piece (capture)
    if (board[rr][cc]) break;
  }
}

// Bishop: diagonals
if (type === "B" || type === "Q") {
  slide(-1, -1); slide(-1, 1); slide(1, -1); slide(1, 1);
}

// Rook: straight lines
if (type === "R" || type === "Q") {
  slide(-1, 0); slide(1, 0); slide(0, -1); slide(0, 1);
}`,
            language: "typescript",
          },
        ],
        commonUse: [
          "Board game engines",
          "AI planning",
          "State validation",
          "Legal move generation",
        ],
      },
      {
        id: "check-validation",
        name: "Check & Checkmate Detection",
        difficulty: "advanced",
        description:
          "Validating that a move doesn't leave the king in check, and detecting checkmate positions.",
        examples: [
          {
            title: "Check Detection",
            description: "Determining if a king is under attack",
            code: `function isKingInCheck(board: Board, color: Color, castling: Castling): boolean {
  const king = findKing(board, color);
  if (!king) return false;
  
  const [kr, kc] = king;
  
  // Check if any opponent piece can attack the king
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece || piece.color === color) continue; // Not opponent piece
      
      const opponentMoves = pseudoMoves(board, r, c, castling, null);
      
      // If any opponent move targets the king, we're in check
      if (opponentMoves.some(m => m.to[0] === kr && m.to[1] === kc)) {
        return true;
      }
    }
  }
  
  return false;
}`,
            language: "typescript",
          },
        ],
        commonUse: [
          "Chess engines",
          "Game rule validation",
          "AI minimax algorithms",
        ],
      },
      {
        id: "castling-logic",
        name: "Castling & Special Moves",
        difficulty: "intermediate",
        description:
          "Implementing castling (king-rook special move) and tracking castling rights.",
        examples: [
          {
            title: "Castling Implementation",
            description: "Validating and executing castling moves",
            code: `type Castling = { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean };

// In move generation (for white king at [7, 4])
if (type === "K") {
  // Regular king moves...
  
  // Kingside castling (0-0)
  if (castling.wK && !board[7][5] && !board[7][6]) {
    // Check if king and f-square are not under attack
    if (!isAttacked(board, [7, 4]) && !isAttacked(board, [7, 5])) {
      moves.push({ from: [7, 4], to: [7, 6] });
    }
  }
  
  // Queenside castling (0-0-0)
  if (castling.wQ && !board[7][3] && !board[7][2] && !board[7][1]) {
    // Check if king and d-square are not under attack
    if (!isAttacked(board, [7, 4]) && !isAttacked(board, [7, 3])) {
      moves.push({ from: [7, 4], to: [7, 2] });
    }
  }
}

// Track castling rights when king or rook moves
if (piece.type === "K" && piece.color === "w") {
  castling.wK = false;
  castling.wQ = false;
}
if (move.from[0] === 7 && move.from[1] === 7) castling.wK = false; // Rook h-file
if (move.from[0] === 7 && move.from[1] === 0) castling.wQ = false; // Rook a-file`,
            language: "typescript",
          },
        ],
        commonUse: ["Chess engines", "Rule-based game systems"],
      },
    ],
    commonConcepts: [
      "Canvas rendering and piece graphics",
      "Click/tap handling for piece selection",
      "Game state persistence",
      "AI using minimax or evaluation functions",
    ],
    quiz: [
      {
        id: "q1",
        question: "What is the purpose of the `slide` function in Chess move generation?",
        options: [
          "It moves the piece across the board",
          "It generates moves for sliding pieces (Bishop, Rook, Queen) by checking each direction until blocked",
          "It slides the board visually",
          "It prevents illegal moves",
        ],
        correctAnswer: 1,
        explanation:
          "The slide function generates all valid moves in one direction by iterating until it hits a board edge, its own piece, or an opponent piece (which can be captured).",
      },
      {
        id: "q2",
        question:
          "Why must we track castling rights and lose them when the king moves?",
        options: [
          "It's just a rule of chess",
          "Because once the king moves, it can never castling again (it's no longer on its starting square)",
          "To make the game harder",
          "To prevent cheating",
        ],
        correctAnswer: 1,
        explanation:
          "Castling is only legal if the king and rook haven't moved yet. Once either moves, castling rights are permanently lost for that side.",
      },
      {
        id: "q3",
        question:
          "What does `pseudoMoves` generate, and why do we need to filter out moves that leave the king in check?",
        options: [
          "Moves that look good but don't work",
          "All theoretically valid moves for a piece, but we must filter to ensure the king isn't left in check (illegal in real chess)",
          "Moves the AI suggests",
          "Moves that are visually displayed",
        ],
        correctAnswer: 1,
        explanation:
          "pseudoMoves generates all moves without checking check/checkmate, but we must validate that the resulting position doesn't leave our king under attack.",
      },
    ],
  },

  "typing-racer": {
    gameId: "typing-racer",
    gameName: "Typing Racer",
    gameIcon: "⌨️",
    summary:
      "Typing Racer is a real-time competitive typing game where players race to type a passage correctly. It tracks WPM (words per minute), accuracy, and real-time UI updates.",
    uniqueConcepts: [
      {
        id: "wpm-calculation",
        name: "WPM Calculation & Performance Metrics",
        difficulty: "beginner",
        description:
          "Calculating words per minute and tracking typing accuracy in real time.",
        examples: [
          {
            title: "WPM Calculation",
            description: "Computing words per minute from elapsed time and typed text",
            code: `function calcWpm(typed: string, startTime: number): number {
  const elapsed = Date.now() - startTime;
  const minutes = elapsed / 60000; // Convert ms to minutes
  
  if (minutes <= 0) return 0;
  
  // Count words (space-separated tokens)
  const wordCount = typed.trim().split(/\\s+/).length;
  
  // WPM = words / minutes
  return Math.round(wordCount / minutes);
}

// Usage
const startTime = Date.now();
// ... user types ...
const wpm = calcWpm("the quick brown", startTime); // Might be 240 WPM`,
            language: "typescript",
          },
          {
            title: "Real-Time Error Tracking",
            description: "Tracking typing errors as they occur",
            code: `function handleType(value: string, passage: string) {
  let errors = 0;
  
  // Check each character
  for (let i = 0; i < value.length; i++) {
    if (i >= passage.length || value[i] !== passage[i]) {
      errors++;
    }
  }
  
  // Or simpler: check if typed text doesn't match passage start
  const isCorrect = passage.startsWith(value);
  
  return {
    typed: value,
    wpm: calcWpm(value, startTime),
    errors,
    accuracy: ((value.length - errors) / Math.max(value.length, 1) * 100).toFixed(1) + "%",
    done: value === passage
  };
}`,
            language: "typescript",
          },
        ],
        commonUse: [
          "Typing tutors",
          "Performance metrics",
          "Gaming statistics",
          "Productivity apps",
        ],
      },
      {
        id: "real-time-ui-updates",
        name: "Real-Time UI Updates with React Hooks",
        difficulty: "intermediate",
        description:
          "Using React hooks like useEffect and useRef to update the UI continuously without performance issues.",
        examples: [
          {
            title: "Timer Loop with useEffect",
            description: "Updating WPM display every 500ms during gameplay",
            code: `useEffect(() => {
  if (phase === "playing" && !paused) {
    // Set up timer interval that runs while game is active
    timerRef.current = setInterval(() => {
      setP1(s => s.startTime && !s.done 
        ? { ...s, wpm: calcWpm(s.typed, s.startTime) } 
        : s
      );
      setP2(s => s.startTime && !s.done 
        ? { ...s, wpm: calcWpm(s.typed, s.startTime) } 
        : s
      );
    }, 500); // Update every 500ms
  } else {
    // Clean up timer when not playing
    if (timerRef.current) { 
      clearInterval(timerRef.current); 
      timerRef.current = null; 
    }
  }
  
  // Cleanup on unmount
  return () => { 
    if (timerRef.current) clearInterval(timerRef.current); 
  };
}, [phase, paused]);`,
            language: "typescript",
          },
          {
            title: "Character-by-Character Highlighting",
            description: "Highlighting typed vs remaining text with visual feedback",
            code: `function renderHighlight(typed: string, passage: string) {
  return passage.split("").map((ch, i) => {
    let className = "text-muted-foreground";
    
    if (i < typed.length) {
      // Character has been typed
      className = typed[i] === ch 
        ? "text-green-400"  // Correct
        : "bg-red-500/30 text-red-300"; // Wrong
    } else if (i === typed.length) {
      // Current cursor position
      className = "text-white underline";
    }
    
    return <span key={i} className={className}>{ch}</span>;
  });
}`,
            language: "typescript",
          },
        ],
        commonUse: [
          "React applications",
          "Real-time dashboards",
          "Live chat apps",
          "Game development",
        ],
      },
      {
        id: "event-handling",
        name: "Keyboard Event Handling & Focus Management",
        difficulty: "beginner",
        description:
          "Capturing keyboard input and managing focus to ensure smooth user interaction.",
        examples: [
          {
            title: "Textarea Input Handling",
            description: "Tracking typed text with onChange event",
            code: `function handleType(
  player: 1 | 2, 
  value: string, 
  state: PlayerState, 
  setState: (s: PlayerState) => void
) {
  // Don't process if game is not running
  if (state.done || phase !== "playing" || paused) return;
  
  const now = Date.now();
  const startTime = state.startTime ?? now; // Start timer on first input
  const correct = passage.startsWith(value);
  
  const next: PlayerState = {
    typed: value,
    wpm: calcWpm(value, startTime),
    done: value === passage,
    startTime,
    errors: correct ? state.errors : state.errors + 1
  };
  
  setState(next);
  
  // Check for win condition
  if (next.done && !winner) {
    setWinner(player === 1 ? "Player 1" : "Player 2");
    setPhase("done");
  }
}

// JSX
<textarea 
  ref={p1ref}
  disabled={p1.done || phase === "done"}
  value={p1.typed}
  onChange={e => handleType(1, e.target.value, p1, setP1)}
  onFocus={e => e.preventDefault()} // Prevent focus loss
/>`,
            language: "typescript",
          },
        ],
        commonUse: [
          "Web forms",
          "Text editors",
          "Game inputs",
          "Accessibility features",
        ],
      },
    ],
    commonConcepts: [
      "React state management",
      "String manipulation and comparison",
      "Time tracking and Date.now()",
      "Conditional rendering",
    ],
    quiz: [
      {
        id: "q1",
        question:
          "Why do we multiply elapsed time by (Date.now() - startTime) / 60000 before dividing words by minutes?",
        options: [
          "It's a mathematical formula that always works",
          "We're converting milliseconds to minutes so WPM is calculated correctly",
          "It prevents division by zero",
          "It adds difficulty to the calculation",
        ],
        correctAnswer: 1,
        explanation:
          "Date.now() returns milliseconds, so dividing by 60,000 converts to minutes. WPM = words / minutes.",
      },
      {
        id: "q2",
        question:
          "What does the `renderHighlight` function return, and why is it important?",
        options: [
          "The typed text only",
          "A character-by-character highlighted passage showing correct (green), incorrect (red), and remaining (gray) characters",
          "A progress bar",
          "A final score",
        ],
        correctAnswer: 1,
        explanation:
          "This visual feedback helps players see exactly what they've typed correctly/incorrectly and where they are in the passage.",
      },
      {
        id: "q3",
        question:
          "Why do we use useRef for timerRef instead of storing the interval ID in state?",
        options: [
          "Because refs are faster",
          "Because refs persist across renders without causing re-renders, and we don't need to trigger updates when the interval changes",
          "Because state doesn't support functions",
          "It's just a preference",
        ],
        correctAnswer: 1,
        explanation:
          "useRef doesn't cause re-renders when updated, making it perfect for storing mutable values like interval IDs.",
      },
    ],
  },

  "quiz-board": {
    gameId: "quiz-board",
    gameName: "Quiz Board Arena",
    gameIcon: "🎯",
    summary:
      "Quiz Board is a Jeopardy-style trivia game with 1200+ questions across 12 categories. Players select clue values, answer questions, and compete in 1–4 player multiplayer.",
    uniqueConcepts: [
      {
        id: "question-bank-structure",
        name: "Question Bank Organization & Management",
        difficulty: "beginner",
        description:
          "Structuring and managing a large question database with categories, difficulties, and types.",
        examples: [
          {
            title: "Question Entry Type Definition",
            description: "Defining a reusable question data structure",
            code: `export type QEntry = {
  q: string;           // The question/clue
  a: string;           // The answer
  alt?: string[];      // Alternative valid answers (e.g., variations, nicknames)
};

export type QBank = {
  [category: string]: {
    [value: number]: QEntry[];  // e.g., 100, 200, 300, 400, 500
  };
};

// Example usage
const QUESTION_BANK: QBank = {
  "Science & Nature": {
    100: [
      { q: "This gas makes up 78% of Earth's atmosphere.", a: "nitrogen" },
      { q: "Photosynthesis is the process where plants convert light into...", a: "chemical energy", alt: ["energy"] }
    ],
    200: [
      { q: "What is the powerhouse of the cell?", a: "mitochondria" }
    ]
  },
  "World History": {
    100: [
      { q: "In what year did Christopher Columbus sail the ocean blue?", a: "1492" }
    ]
  }
};`,
            language: "typescript",
          },
          {
            title: "Dynamic Category & Value Loading",
            description: "Loading available categories and values from the question bank",
            code: `// Extract all categories
const ALL_CATEGORIES = Object.keys(QUESTION_BANK);

// Extract available values for a category
function getAvailableValues(category: string): number[] {
  return Object.keys(QUESTION_BANK[category] || {})
    .map(Number)
    .sort((a, b) => a - b);
}

// Get a random question from a category/value
function getQuestion(category: string, value: number): QEntry | null {
  const questions = QUESTION_BANK[category]?.[value];
  if (!questions || questions.length === 0) return null;
  return questions[Math.floor(Math.random() * questions.length)];
}`,
            language: "typescript",
          },
        ],
        commonUse: [
          "Quiz apps",
          "Education platforms",
          "Trivia games",
          "Content management",
        ],
      },
      {
        id: "answer-validation",
        name: "Flexible Answer Validation",
        difficulty: "beginner",
        description:
          "Validating user answers with fuzzy matching to handle typos, case differences, and alternative phrasings.",
        examples: [
          {
            title: "Answer Normalization & Checking",
            description: "Normalizing answers and checking for matches",
            code: `// Remove special characters and extra spaces
function normalizeAnswer(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\\s]/g, '')  // Remove punctuation
    .replace(/\\s+/g, ' ')           // Collapse whitespace
    .trim();
}

// Check if user's answer matches the question's answer
function checkAnswer(input: string, entry: QEntry): boolean {
  const norm = normalizeAnswer(input);
  
  if (!norm) return false; // Empty input
  
  // Primary answer
  const primaryNorm = normalizeAnswer(entry.a);
  
  // Allow substring matches both ways
  if (primaryNorm.includes(norm) || norm.includes(primaryNorm)) {
    return true;
  }
  
  // Check alternative answers
  if (entry.alt) {
    for (const alt of entry.alt) {
      const altNorm = normalizeAnswer(alt);
      if (altNorm.includes(norm) || norm.includes(altNorm)) {
        return true;
      }
    }
  }
  
  return false;
}

// Examples
checkAnswer("   NITROGEN   ", { q: "...", a: "nitrogen" }); // true
checkAnswer("mitochondria", { q: "...", a: "Mitochondria" }); // true
checkAnswer("mit", { q: "...", a: "mitochondria" }); // true (substring)`,
            language: "typescript",
          },
        ],
        commonUse: [
          "Quiz systems",
          "Search engines",
          "Spell checkers",
          "Fuzzy matching algorithms",
        ],
      },
      {
        id: "game-state-sync",
        name: "Multiplayer State Synchronization (WebSocket)",
        difficulty: "advanced",
        description:
          "Synchronizing game state across players using WebSocket in real-time multiplayer mode.",
        examples: [
          {
            title: "Game State for Multiplayer",
            description: "Tracking state that needs syncing between players",
            code: `interface QBGameState {
  category: string;
  value: number;
  clue: string;
  answer: string;
  answered: boolean;
  answeredBy?: string;        // Which player answered
  scores: Record<string, number>; // Player -> score
  turn: string;               // Current player's turn
  availableClues: Set<string>; // Format: "category-value"
  gamePhase: "lobby" | "playing" | "finished";
}

// WebSocket message format
type QBMessage = 
  | { type: "clue_selected"; player: string; category: string; value: number }
  | { type: "answer_submitted"; player: string; answer: string; correct: boolean }
  | { type: "score_updated"; scores: Record<string, number> }
  | { type: "game_ended"; winner: string };

// Example: Broadcasting when a clue is answered
function broadcastAnswer(isCorrect: boolean, player: string, points: number) {
  socket.emit("message", {
    type: "answer_submitted",
    player,
    answer: "...",
    correct: isCorrect
  });
  
  if (isCorrect) {
    scores[player] = (scores[player] || 0) + points;
    socket.emit("message", {
      type: "score_updated",
      scores
    });
  }
}`,
            language: "typescript",
          },
        ],
        commonUse: [
          "Multiplayer games",
          "Real-time collaboration",
          "Live quizzes",
          "Competitive gaming platforms",
        ],
      },
    ],
    commonConcepts: [
      "Canvas rendering for board layout",
      "Event handling for category/value selection",
      "Timer management for answer submission",
      "Score calculation and leaderboards",
      "Online multiplayer via WebSocket",
    ],
    quiz: [
      {
        id: "q1",
        question:
          "What is the benefit of storing alternative answers (alt field) in question entries?",
        options: [
          "It makes the question harder",
          "It allows accepting multiple valid phrasings (e.g., 'USA', 'United States', 'America') without marking correct answers as wrong",
          "It stores backups of the answer",
          "It's for debugging only",
        ],
        correctAnswer: 1,
        explanation:
          "Alternative answers let you accept valid variations of the correct answer, improving user experience in trivia games.",
      },
      {
        id: "q2",
        question:
          "Why do we normalize answers by removing punctuation and lowercasing before comparison?",
        options: [
          "To save memory",
          "So that 'NITROGEN', 'nitrogen', and 'nitrogen,' all match the answer 'nitrogen'",
          "To make the game easier",
          "It's required by JavaScript",
        ],
        correctAnswer: 1,
        explanation:
          "Normalization ensures users aren't penalized for capitalization or punctuation variations.",
      },
      {
        id: "q3",
        question:
          "How does answer validation support substring matching, and why is this useful?",
        options: [
          "It allows typos",
          "If a normalized answer includes the input or vice versa, it's accepted. This lets 'mit' match 'mitochondria'",
          "It's a bug in the validation",
          "It makes all answers correct",
        ],
        correctAnswer: 1,
        explanation:
          "Substring matching is forgiving and rewards partial knowledge while avoiding penalizing correct answers that are abbreviated.",
      },
    ],
  },
};

  "flappy-bird": {
    gameId: "flappy-bird",
    gameName: "Flappy Bird",
    gameIcon: "🐦",
    summary:
      "Flappy Bird challenges players to navigate a bird through gaps in pipes by tapping to flap. The core challenge is gravity simulation, procedurally generated obstacles, and pixel-perfect collision detection.",
    uniqueConcepts: [
      {
        id: "gravity-simulation",
        name: "Gravity & Jump Physics",
        difficulty: "beginner",
        description:
          "Simulating gravity means constantly pulling the bird downward each frame. A 'flap' gives an upward velocity boost that gravity then gradually overcomes — just like real physics.",
        examples: [
          {
            title: "Gravity & Flap System",
            description: "Core physics loop for the bird",
            code: `const GRAVITY = 0.5;       // Downward acceleration per frame
const FLAP_FORCE = -9;     // Upward velocity on tap (negative = up)
const MAX_FALL = 12;       // Terminal velocity cap

interface BirdState {
  y: number;        // Vertical position
  vy: number;       // Vertical velocity
}

// Called every frame (e.g. in requestAnimationFrame)
function updateBird(bird: BirdState): BirdState {
  const vy = Math.min(bird.vy + GRAVITY, MAX_FALL); // Apply gravity, cap speed
  const y  = bird.y + vy;                            // Move bird
  return { y, vy };
}

// Called on tap / spacebar
function flap(bird: BirdState): BirdState {
  return { ...bird, vy: FLAP_FORCE }; // Instant upward boost
}`,
            language: "typescript",
          },
        ],
        commonUse: ["Platformer games", "Physics engines", "Space simulations"],
      },
      {
        id: "procedural-generation",
        name: "Procedural Obstacle Generation",
        difficulty: "intermediate",
        description:
          "Pipes spawn at random heights and scroll leftward continuously. Randomizing the gap position each time creates infinite variety without hand-crafting levels.",
        examples: [
          {
            title: "Pipe Spawning",
            description: "Generating and scrolling pipes",
            code: `const PIPE_GAP   = 160;   // Vertical space between top & bottom pipe
const PIPE_SPEED = 3;     // Pixels per frame moving left
const PIPE_INTERVAL = 90; // Frames between new pipes

interface Pipe {
  x: number;
  gapTop: number; // Y of gap top edge
}

function spawnPipe(canvasH: number): Pipe {
  const minGapTop = 60;
  const maxGapTop = canvasH - PIPE_GAP - 60;
  return {
    x: canvasW,
    gapTop: Math.random() * (maxGapTop - minGapTop) + minGapTop,
  };
}

function updatePipes(pipes: Pipe[], frame: number): Pipe[] {
  let updated = pipes.map(p => ({ ...p, x: p.x - PIPE_SPEED }));

  // Remove off-screen pipes
  updated = updated.filter(p => p.x > -PIPE_WIDTH);

  // Spawn new pipe at interval
  if (frame % PIPE_INTERVAL === 0) {
    updated.push(spawnPipe(canvasH));
  }
  return updated;
}`,
            language: "typescript",
          },
        ],
        commonUse: ["Endless runners", "Roguelikes", "Dungeon generation"],
      },
      {
        id: "aabb-collision",
        name: "AABB Collision Detection",
        difficulty: "beginner",
        description:
          "Axis-Aligned Bounding Box (AABB) checks if two rectangles overlap. It is the most common collision method for 2D games because it is fast and simple.",
        examples: [
          {
            title: "Rectangle Overlap Test",
            description: "Checking bird against pipe rectangles",
            code: `interface Rect {
  x: number; y: number;
  w: number; h: number;
}

// Returns true if two rectangles overlap
function aabbOverlap(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

// Build pipe rects from a Pipe object
function pipeRects(pipe: Pipe): [Rect, Rect] {
  const top    = { x: pipe.x, y: 0,                w: PIPE_W, h: pipe.gapTop };
  const bottom = { x: pipe.x, y: pipe.gapTop + PIPE_GAP, w: PIPE_W, h: 9999 };
  return [top, bottom];
}

// Check bird against all pipes
function checkCollisions(bird: Rect, pipes: Pipe[]): boolean {
  for (const pipe of pipes) {
    const [top, bot] = pipeRects(pipe);
    if (aabbOverlap(bird, top) || aabbOverlap(bird, bot)) return true;
  }
  return false;
}`,
            language: "typescript",
          },
        ],
        commonUse: ["All 2D games", "UI drag-and-drop", "Hit-testing"],
      },
    ],
    commonConcepts: [
      "requestAnimationFrame game loop",
      "Canvas 2D rendering",
      "Score tracking and high-score persistence",
      "Difficulty scaling over time",
    ],
    quiz: [
      {
        id: "q1",
        question: "Why is terminal velocity (MAX_FALL) capped in the gravity simulation?",
        options: [
          "To save CPU time",
          "To prevent the bird from falling infinitely fast, keeping the game fair and realistic",
          "Because JavaScript can't handle large numbers",
          "To make the game look better",
        ],
        correctAnswer: 1,
        explanation:
          "Uncapped gravity would cause the bird to plummet off-screen almost instantly at high frame rates. Capping velocity mirrors real-world air resistance.",
      },
      {
        id: "q2",
        question: "What does AABB stand for and why is it useful?",
        options: [
          "Advanced Algorithm for Bounding Boxes — it is the most accurate method",
          "Axis-Aligned Bounding Box — simple rectangle overlap test, very fast",
          "Animated Axis-Based Bouncing — it handles moving objects",
          "Automatic Area-Based Boundary — built into game engines",
        ],
        correctAnswer: 1,
        explanation:
          "AABB checks if two axis-aligned rectangles overlap with just four comparisons, making it extremely fast even when checking hundreds of objects per frame.",
      },
      {
        id: "q3",
        question: "How does procedural generation create 'infinite' levels in Flappy Bird?",
        options: [
          "It loads a hidden level file with millions of pipes",
          "It randomly places pipe gaps at different heights each spawn interval",
          "It reuses the same 10 pipes over and over",
          "It uses AI to place pipes",
        ],
        correctAnswer: 1,
        explanation:
          "By randomising the gap position for each new pipe, the game creates a never-repeating sequence of obstacles from a simple formula — no pre-made levels needed.",
      },
    ],
  },

  "tower-defense": {
    gameId: "tower-defense",
    gameName: "Tower Defense",
    gameIcon: "🏰",
    summary:
      "Tower Defense tasks players with placing defensive towers along a path to stop waves of enemies reaching the base. It showcases pathfinding, wave management, tower targeting, and projectile physics.",
    uniqueConcepts: [
      {
        id: "wave-management",
        name: "Enemy Wave Management",
        difficulty: "intermediate",
        description:
          "Enemies arrive in waves with increasing difficulty. A wave system controls how many enemies spawn, at what intervals, and with what stats — allowing smooth difficulty progression.",
        examples: [
          {
            title: "Wave & Enemy Spawner",
            description: "Defining waves and spawning enemies over time",
            code: `interface EnemyDef {
  hp: number;
  speed: number;
  reward: number; // Gold on kill
}

interface Wave {
  count: number;
  interval: number; // Frames between each spawn
  enemy: EnemyDef;
}

const WAVES: Wave[] = [
  { count: 10, interval: 60, enemy: { hp: 50,  speed: 1,   reward: 5  } },
  { count: 15, interval: 45, enemy: { hp: 80,  speed: 1.5, reward: 8  } },
  { count: 20, interval: 30, enemy: { hp: 150, speed: 2,   reward: 12 } },
];

// Spawner state
let waveIdx = 0, spawned = 0, spawnTimer = 0;

function updateSpawner(frame: number, enemies: Enemy[]) {
  const wave = WAVES[waveIdx];
  if (!wave || spawned >= wave.count) return;

  spawnTimer++;
  if (spawnTimer >= wave.interval) {
    spawnTimer = 0;
    enemies.push(createEnemy(wave.enemy)); // Spawn at path start
    spawned++;
    if (spawned >= wave.count) {
      waveIdx++;   // Advance to next wave when all spawned
      spawned = 0;
    }
  }
}`,
            language: "typescript",
          },
        ],
        commonUse: ["Tower defense", "RTS games", "Dungeon crawlers"],
      },
      {
        id: "tower-targeting",
        name: "Tower Targeting & Projectiles",
        difficulty: "intermediate",
        description:
          "Each tower scans enemies within its range, selects a target, and fires a projectile. The projectile moves toward the target's current position and deals damage on contact.",
        examples: [
          {
            title: "Target Selection & Projectile",
            description: "Finding nearest enemy and firing",
            code: `interface Tower {
  x: number; y: number;
  range: number;   // Pixels
  damage: number;
  fireRate: number; // Frames between shots
  cooldown: number;
}

// Pick the enemy that has progressed furthest along the path
function pickTarget(tower: Tower, enemies: Enemy[]): Enemy | null {
  return enemies
    .filter(e => dist(tower, e) <= tower.range)
    .sort((a, b) => b.progress - a.progress)[0] ?? null;
}

// Simple linear projectile moving toward target position
function updateProjectile(proj: Projectile): Projectile {
  const dx = proj.tx - proj.x;
  const dy = proj.ty - proj.y;
  const len = Math.hypot(dx, dy);
  if (len < proj.speed) {
    // Reached target — deal damage
    applyDamage(proj.targetId, proj.damage);
    return { ...proj, done: true };
  }
  return {
    ...proj,
    x: proj.x + (dx / len) * proj.speed,
    y: proj.y + (dy / len) * proj.speed,
  };
}`,
            language: "typescript",
          },
        ],
        commonUse: ["TD games", "RTS units", "Missile systems", "Auto-aim"],
      },
      {
        id: "grid-placement",
        name: "Grid-Based Placement System",
        difficulty: "beginner",
        description:
          "The map is a 2D grid. Towers snap to grid cells, and cells are marked occupied so enemies and paths can navigate around them — all managed by a simple 2D array.",
        examples: [
          {
            title: "Grid Management",
            description: "Placing and tracking towers on a 2D grid",
            code: `const CELL = 48; // Pixel size of each grid cell

// Snap pixel coordinates to grid cell indices
const toCell = (px: number) => Math.floor(px / CELL);

// Convert cell indices back to pixel center
const toPixel = (cell: number) => cell * CELL + CELL / 2;

// Grid: 0 = open, 1 = path, 2 = tower
const grid: number[][] = Array.from({ length: ROWS }, () =>
  new Array(COLS).fill(0)
);

function placeTower(cx: number, cy: number): boolean {
  if (grid[cy][cx] !== 0) return false; // Cell occupied
  grid[cy][cx] = 2;                     // Mark as tower
  return true;
}

function removeTower(cx: number, cy: number) {
  grid[cy][cx] = 0; // Free the cell
}

// Convert mouse position to grid cell (for hover highlight)
function mouseToCell(mx: number, my: number) {
  return { cx: toCell(mx), cy: toCell(my) };
}`,
            language: "typescript",
          },
        ],
        commonUse: ["Strategy games", "City builders", "Board games", "Puzzle games"],
      },
    ],
    commonConcepts: [
      "requestAnimationFrame game loop",
      "Canvas 2D rendering for path and towers",
      "Resource economy (gold, lives)",
      "UI overlays for tower shop",
    ],
    quiz: [
      {
        id: "q1",
        question: "Why do we pick the enemy with the highest 'progress' value as the tower's target?",
        options: [
          "It is the easiest enemy to hit",
          "It is the closest to the base — prioritising it prevents enemies from reaching the goal",
          "It has the most HP",
          "It moves the slowest",
        ],
        correctAnswer: 1,
        explanation:
          "Targeting the most-progressed enemy is the default 'First' strategy, ensuring the most dangerous (closest to escaping) enemy is eliminated first.",
      },
      {
        id: "q2",
        question: "What is the role of the grid 2D array in Tower Defense?",
        options: [
          "It stores player scores",
          "It tracks which cells are open, path, or occupied — enabling placement validation and pathfinding",
          "It controls the tower's firing rate",
          "It is used only for rendering",
        ],
        correctAnswer: 1,
        explanation:
          "The grid is the single source of truth for the map state. Placement validation, pathfinding, and rendering all query the same grid array.",
      },
      {
        id: "q3",
        question: "How does increasing wave difficulty work in the wave management system above?",
        options: [
          "The player gets fewer towers",
          "Each wave has enemies with higher HP, speed, and rewards — and a shorter spawn interval",
          "The path gets longer each wave",
          "Enemies gain extra lives",
        ],
        correctAnswer: 1,
        explanation:
          "Each WAVES entry increases enemy HP, speed, and count while decreasing the spawn interval — a simple data-driven approach that scales challenge without code changes.",
      },
    ],
  },

  "uno": {
    gameId: "uno",
    gameName: "Uno",
    gameIcon: "🃏",
    summary:
      "Uno is a card-matching game where players shed all cards in hand. It involves a deck of cards, a rules engine to validate plays, hand management, and AI decision-making for computer opponents.",
    uniqueConcepts: [
      {
        id: "rules-engine",
        name: "Rules Engine & Card Validation",
        difficulty: "intermediate",
        description:
          "A rules engine checks whether a card is legally playable given the current discard pile. A card is valid if it matches the colour, number, or is a wild card.",
        examples: [
          {
            title: "Card Validity Check",
            description: "Checking if a card can be played",
            code: `type Colour = "red" | "yellow" | "green" | "blue" | "wild";
type Value  = "0"–"9" | "skip" | "reverse" | "draw2" | "wild" | "wild4";

interface Card {
  colour: Colour;
  value:  Value;
}

// A card is playable if:
//  1. It matches the current colour, OR
//  2. It matches the current value/type, OR
//  3. It is a wild card
function canPlay(card: Card, topCard: Card, currentColour: Colour): boolean {
  if (card.colour === "wild") return true;          // Wilds are always playable
  if (card.colour === currentColour) return true;   // Colour match
  if (card.value  === topCard.value) return true;   // Value/type match
  return false;
}

// Apply a played card's effect to the game state
function applyEffect(card: Card, state: GameState): GameState {
  switch (card.value) {
    case "skip":    return { ...state, skip: true };
    case "reverse": return { ...state, direction: -state.direction };
    case "draw2":   return { ...state, pendingDraw: 2 };
    case "wild4":   return { ...state, pendingDraw: 4 };
    default:        return state;
  }
}`,
            language: "typescript",
          },
        ],
        commonUse: ["Card games", "Board game engines", "Game rule validators"],
      },
      {
        id: "deck-management",
        name: "Deck & Hand Management",
        difficulty: "beginner",
        description:
          "A deck is an array of cards shuffled randomly. Drawing removes from the front; if the deck empties, the discard pile is reshuffled and reused. Hands are per-player arrays.",
        examples: [
          {
            title: "Deck Building & Shuffle",
            description: "Creating and shuffling the Uno deck",
            code: `function buildDeck(): Card[] {
  const colours: Colour[] = ["red", "yellow", "green", "blue"];
  const numbers = ["0","1","2","3","4","5","6","7","8","9"];
  const specials = ["skip","reverse","draw2"];
  const deck: Card[] = [];

  for (const colour of colours) {
    // One 0, two of each 1-9, two of each special
    deck.push({ colour, value: "0" });
    for (const v of [...numbers.slice(1), ...specials]) {
      deck.push({ colour, value: v as Value });
      deck.push({ colour, value: v as Value });
    }
  }
  // 4 Wild + 4 Wild Draw 4
  for (let i = 0; i < 4; i++) {
    deck.push({ colour: "wild", value: "wild" });
    deck.push({ colour: "wild", value: "wild4" });
  }
  return shuffle(deck); // Fisher-Yates shuffle
}

function drawCard(deck: Card[], hand: Card[], discardPile: Card[]): Card[] {
  if (deck.length === 0) {
    // Reshuffle discard pile into deck (keep top card)
    const [top, ...rest] = discardPile.reverse();
    deck.push(...shuffle(rest));
    discardPile.length = 0;
    discardPile.push(top);
  }
  hand.push(deck.pop()!);
  return hand;
}`,
            language: "typescript",
          },
        ],
        commonUse: ["Card games", "Board games", "Randomised item drops in RPGs"],
      },
      {
        id: "ai-hand-decision",
        name: "AI Hand Decision Making",
        difficulty: "intermediate",
        description:
          "An AI player ranks cards to play: first it prefers action cards to disrupt opponents, then colour matches, then wild cards as a last resort — keeping them in reserve.",
        examples: [
          {
            title: "Simple AI Card Selection",
            description: "AI picking the best card to play",
            code: `function aiChooseCard(
  hand: Card[],
  topCard: Card,
  currentColour: Colour
): Card | null {
  const playable = hand.filter(c => canPlay(c, topCard, currentColour));
  if (playable.length === 0) return null; // Must draw

  // Priority order: action cards > colour match > wilds
  const actionTypes: Value[] = ["draw2", "skip", "reverse", "wild4"];
  
  // 1. Try to play an action card (disrupt opponents)
  const action = playable.find(c => actionTypes.includes(c.value));
  if (action) return action;

  // 2. Play a colour-matching number card
  const colourMatch = playable.find(c => c.colour === currentColour && c.colour !== "wild");
  if (colourMatch) return colourMatch;

  // 3. Fall back to wild (choose most-held colour)
  return playable.find(c => c.colour === "wild") ?? playable[0];
}

// Best colour to call on a wild: the AI's most-held colour
function bestColour(hand: Card[]): Colour {
  const counts = { red: 0, yellow: 0, green: 0, blue: 0 };
  for (const c of hand) if (c.colour !== "wild") counts[c.colour as keyof typeof counts]++;
  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]) as Colour;
}`,
            language: "typescript",
          },
        ],
        commonUse: ["Card game AI", "Board game bots", "Decision trees"],
      },
    ],
    commonConcepts: [
      "Turn-based game state management",
      "React state for hand rendering",
      "Animation for card play/draw",
      "Direction and skip tracking",
    ],
    quiz: [
      {
        id: "q1",
        question: "Why is the wild card always playable regardless of the current colour?",
        options: [
          "It is a bug in the rules engine",
          "Wild cards have no colour, so they match any situation and let the player set a new colour",
          "It matches every value",
          "Wild cards are only playable on number cards",
        ],
        correctAnswer: 1,
        explanation:
          "Uno rules specify that wild cards override all colour restrictions, making them the most powerful cards — and why the AI holds onto them until necessary.",
      },
      {
        id: "q2",
        question: "What happens when the draw deck runs out of cards?",
        options: [
          "The game ends immediately",
          "The discard pile (minus the top card) is reshuffled and becomes the new draw deck",
          "Players can no longer draw cards",
          "The deck resets to a fresh 108-card deck",
        ],
        correctAnswer: 1,
        explanation:
          "To keep the game going, the discard pile is reshuffled and reused. Only the top card stays in the discard pile.",
      },
      {
        id: "q3",
        question: "Why does the AI prioritise action cards (skip, draw2) over plain colour matches?",
        options: [
          "Action cards score more points",
          "Action cards disrupt opponents by forcing draws or skipping turns — aggressive plays reduce rivals' card counts faster",
          "Plain cards cannot be played on the first turn",
          "The AI runs faster with fewer card checks",
        ],
        correctAnswer: 1,
        explanation:
          "Action cards create a direct disadvantage for opponents (extra draws, skipped turns), which is often worth more strategically than simply matching a colour.",
      },
    ],
  },

  "pac-man": {
    gameId: "pac-man",
    gameName: "Pac-Man",
    gameIcon: "👾",
    summary:
      "Pac-Man requires navigating a maze to collect pellets while avoiding ghosts. The depth lies in the ghost AI — each ghost switches between Chase, Scatter, and Frightened modes giving the game its unpredictability.",
    uniqueConcepts: [
      {
        id: "ghost-ai-modes",
        name: "Ghost AI: Chase, Scatter & Frightened",
        difficulty: "advanced",
        description:
          "Each ghost uses a finite state machine to switch between three modes. In Chase they target Pac-Man. In Scatter they retreat to their corner. In Frightened (after a power pellet) they move randomly and can be eaten.",
        examples: [
          {
            title: "Ghost FSM & Target Selection",
            description: "How a ghost decides where to move each frame",
            code: `type GhostMode = "chase" | "scatter" | "frightened";

interface Ghost {
  x: number; y: number;
  mode: GhostMode;
  scatterTarget: { x: number; y: number }; // Corner
}

// Each ghost has a different chase strategy
function getChaseTarget(ghost: Ghost, pacman: Position): Position {
  switch (ghost.name) {
    case "blinky":
      return pacman; // Directly targets Pac-Man
    case "pinky":
      // Targets 4 tiles ahead of Pac-Man's direction
      return { x: pacman.x + pacman.dx * 4, y: pacman.y + pacman.dy * 4 };
    case "inky":
      // Complex: uses Blinky's position as well
      const ref = { x: pacman.x + pacman.dx * 2, y: pacman.y + pacman.dy * 2 };
      return { x: 2 * ref.x - blinky.x, y: 2 * ref.y - blinky.y };
    default:
      return pacman;
  }
}

function ghostTarget(ghost: Ghost, pacman: Position): Position {
  if (ghost.mode === "scatter")    return ghost.scatterTarget;
  if (ghost.mode === "frightened") return randomOpenTile(); // Random
  return getChaseTarget(ghost, pacman);                     // Chase
}`,
            language: "typescript",
          },
        ],
        commonUse: ["Game AI", "Finite state machines", "NPC behaviour"],
      },
      {
        id: "maze-navigation",
        name: "Maze Navigation & Tile-Based Movement",
        difficulty: "intermediate",
        description:
          "Pac-Man and ghosts move tile by tile on a grid. Legal moves are decided by checking the maze array. Movement is committed when the character reaches the center of a tile (a waypoint).",
        examples: [
          {
            title: "Tile-Based Movement",
            description: "Moving character to adjacent tile if open",
            code: `// Maze: 0 = wall, 1 = open, 2 = pellet, 3 = power pellet
const MAZE: number[][] = [ /* 28×31 grid */ ];
const TILE = 16; // px per tile

interface Actor {
  tileX: number; tileY: number; // Current tile
  dir:  { dx: number; dy: number }; // Current direction
  nextDir: { dx: number; dy: number }; // Queued direction
}

function isOpen(tx: number, ty: number): boolean {
  return MAZE[ty]?.[tx] !== 0; // Not a wall
}

function tryMove(actor: Actor): Actor {
  const { tileX, tileY, dir, nextDir } = actor;

  // Try queued direction first (player input buffer)
  const nx = tileX + nextDir.dx;
  const ny = tileY + nextDir.dy;
  if (isOpen(nx, ny)) {
    return { ...actor, tileX: nx, tileY: ny, dir: nextDir };
  }

  // Otherwise continue in current direction
  const cx = tileX + dir.dx;
  const cy = tileY + dir.dy;
  if (isOpen(cx, cy)) {
    return { ...actor, tileX: cx, tileY: cy };
  }

  return actor; // Blocked — stay put
}`,
            language: "typescript",
          },
        ],
        commonUse: ["Maze games", "Tile-based RPGs", "Grid-based AI"],
      },
    ],
    commonConcepts: [
      "Canvas 2D rendering of the maze",
      "Pellet and power-pellet collection state",
      "Score multiplier for eating ghosts",
      "Timer-based mode switching (scatter/chase cycles)",
    ],
    quiz: [
      {
        id: "q1",
        question: "What is Blinky's chase strategy compared to Pinky's?",
        options: [
          "Blinky chases a corner; Pinky targets Pac-Man directly",
          "Blinky targets Pac-Man directly; Pinky targets 4 tiles ahead of Pac-Man",
          "Both ghosts target the same tile",
          "Blinky avoids Pac-Man; Pinky chases",
        ],
        correctAnswer: 1,
        explanation:
          "Blinky is the direct pursuer. Pinky tries to get ahead of Pac-Man — these different strategies create flanking situations that make the game challenging.",
      },
      {
        id: "q2",
        question: "Why does Pac-Man buffer the 'next direction' input?",
        options: [
          "To make controls feel more responsive — input is accepted before the current tile is fully cleared",
          "To slow the game down",
          "To replay the last move",
          "Next direction is only for ghosts",
        ],
        correctAnswer: 0,
        explanation:
          "Buffering the next direction means the player can press a key slightly early and the character will turn as soon as the corridor opens up — making controls feel smooth.",
      },
      {
        id: "q3",
        question: "What does the Frightened mode do to ghost behaviour?",
        options: [
          "Ghosts freeze in place",
          "Ghosts move randomly and can be eaten by Pac-Man for bonus points",
          "Ghosts become faster",
          "Ghosts chase Pac-Man twice as aggressively",
        ],
        correctAnswer: 1,
        explanation:
          "Frightened mode is triggered by power pellets. Ghosts move randomly (making them predictable to exploit) and become vulnerable to being eaten for increasing point bonuses.",
      },
    ],
  },

  "bubble-shooter": {
    gameId: "bubble-shooter",
    gameName: "Bubble Shooter",
    gameIcon: "🫧",
    summary:
      "Bubble Shooter tasks players with firing coloured bubbles at a grid to form groups of three or more, which then pop. The core programming challenges are angle/trajectory calculation, hex-grid layout, and flood-fill chain popping.",
    uniqueConcepts: [
      {
        id: "trajectory-angle",
        name: "Trajectory Calculation (Trigonometry)",
        difficulty: "intermediate",
        description:
          "The bubble travels in a straight line at an angle determined by where the player clicked. Math.atan2 converts the (dx, dy) vector from the cannon to the cursor into an angle, which drives the velocity vector.",
        examples: [
          {
            title: "Angle & Velocity from Mouse",
            description: "Calculating bubble direction from mouse click",
            code: `const BUBBLE_SPEED = 12; // pixels per frame

interface BubbleShot {
  x: number; y: number;   // Current position
  vx: number; vy: number; // Velocity per frame
}

// Called when player clicks to shoot
function shoot(cannonX: number, cannonY: number, mouseX: number, mouseY: number): BubbleShot {
  const dx = mouseX - cannonX;
  const dy = mouseY - cannonY;
  const angle = Math.atan2(dy, dx); // Angle in radians

  return {
    x:  cannonX,
    y:  cannonY,
    vx: Math.cos(angle) * BUBBLE_SPEED,
    vy: Math.sin(angle) * BUBBLE_SPEED,
  };
}

// Update position each frame
function moveBubble(b: BubbleShot, canvasW: number): BubbleShot {
  let { x, y, vx, vy } = b;
  x += vx; y += vy;

  // Bounce off left/right walls
  if (x - RADIUS < 0)       { x = RADIUS;       vx = Math.abs(vx); }
  if (x + RADIUS > canvasW) { x = canvasW - RADIUS; vx = -Math.abs(vx); }

  return { x, y, vx, vy };
}`,
            language: "typescript",
          },
        ],
        commonUse: ["Shooting games", "Billiards", "Pinball", "Ricochet physics"],
      },
      {
        id: "flood-fill-pop",
        name: "Flood-Fill Chain Reaction (Popping Bubbles)",
        difficulty: "advanced",
        description:
          "When a bubble lands and forms a group of 3+, all connected same-colour bubbles are popped using flood-fill — the same algorithm that powers the paint-bucket tool.",
        examples: [
          {
            title: "BFS Flood Fill Pop",
            description: "Finding all connected same-colour bubbles to pop",
            code: `interface BubbleGrid {
  [key: string]: { colour: string } | null;
}

// Hex-grid neighbours (offset coordinates)
function hexNeighbours(r: number, c: number): [number, number][] {
  const even = c % 2 === 0;
  return [
    [r - 1, c], [r + 1, c],           // Above, Below
    [r, c - 1], [r, c + 1],           // Left, Right
    [r + (even ? -1 : 1), c - 1],     // Diagonal left
    [r + (even ? -1 : 1), c + 1],     // Diagonal right
  ];
}

// BFS to find all connected bubbles of the same colour
function findGroup(grid: BubbleGrid, startR: number, startC: number): string[] {
  const colour = grid[\`\${startR},\${startC}\`]?.colour;
  if (!colour) return [];

  const visited = new Set<string>();
  const queue   = [\`\${startR},\${startC}\`];

  while (queue.length) {
    const key = queue.shift()!;
    if (visited.has(key)) continue;
    visited.add(key);

    const [r, c] = key.split(",").map(Number);
    for (const [nr, nc] of hexNeighbours(r, c)) {
      const nk = \`\${nr},\${nc}\`;
      if (!visited.has(nk) && grid[nk]?.colour === colour) queue.push(nk);
    }
  }
  return [...visited]; // Keys of all bubbles in group
}

function tryPop(grid: BubbleGrid, r: number, c: number) {
  const group = findGroup(grid, r, c);
  if (group.length >= 3) group.forEach(k => delete grid[k]); // Pop!
}`,
            language: "typescript",
          },
        ],
        commonUse: ["Match-3 games", "Paint bucket tool", "Connectivity analysis"],
      },
    ],
    commonConcepts: [
      "Hex-grid coordinate systems",
      "Canvas rendering of circular bubbles",
      "Colour randomisation for next bubble preview",
      "Gravity drop for floating bubbles after pop",
    ],
    quiz: [
      {
        id: "q1",
        question: "What does Math.atan2(dy, dx) return in the trajectory calculation?",
        options: [
          "The distance from cannon to cursor",
          "The angle (in radians) of the line from cannon to cursor — used to set the bubble's velocity direction",
          "The speed of the bubble",
          "The number of bounces the bubble will make",
        ],
        correctAnswer: 1,
        explanation:
          "Math.atan2 returns the angle of a vector defined by (dx, dy). Multiplying by cos/sin gives a velocity vector pointing in that direction.",
      },
      {
        id: "q2",
        question: "Why is BFS (flood-fill) used to find bubbles to pop rather than a simple loop?",
        options: [
          "BFS is faster than a loop",
          "Groups of bubbles can form any connected shape — BFS explores all connections regardless of shape",
          "Bubbles can only pop in straight lines",
          "BFS handles wall bouncing",
        ],
        correctAnswer: 1,
        explanation:
          "A group of same-colour bubbles can be any connected shape on the hex grid. BFS explores all reachable neighbours recursively, correctly finding L-shapes, clusters, and more.",
      },
      {
        id: "q3",
        question: "How does the bubble bounce off walls without a physics engine?",
        options: [
          "The game detects the wall and restarts the shot",
          "When the bubble's x exceeds the canvas edge, the horizontal velocity (vx) is negated — reversing direction",
          "Walls are not implemented in bubble shooter",
          "The angle is recalculated from the mouse position each frame",
        ],
        correctAnswer: 1,
        explanation:
          "Negating vx mirrors the horizontal velocity component, creating a perfect reflection bounce off vertical walls — no physics engine required.",
      },
    ],
  },

  "racing": {
    gameId: "racing",
    gameName: "Racing",
    gameIcon: "🏎️",
    summary:
      "The racing game challenges players to control a car around a track as fast as possible. Key concepts include vehicle physics (steering, drift), track collision, lap detection, and rubber-band AI for competitive racing.",
    uniqueConcepts: [
      {
        id: "vehicle-physics",
        name: "Vehicle Steering & Drift Physics",
        difficulty: "intermediate",
        description:
          "A car's movement is governed by its heading (angle) and speed. Steering rotates the heading, but adding lateral friction creates realistic drift — the car slides before fully rotating.",
        examples: [
          {
            title: "Car Physics Update",
            description: "Heading, velocity, drift simulation",
            code: `interface Car {
  x: number; y: number;
  angle: number;   // Heading in radians
  speed: number;   // Forward speed
  vx: number;      // World-space velocity X
  vy: number;      // World-space velocity Y
}

const ACCEL       = 0.3;
const FRICTION    = 0.92;   // Speed decay
const STEER_SPEED = 0.05;   // Radians per frame
const DRIFT_GRIP  = 0.85;   // Lower = more drift (0–1)

function updateCar(car: Car, input: { left: boolean; right: boolean; up: boolean }): Car {
  let { angle, speed, vx, vy } = car;

  // Steering (only effective when moving)
  if (input.left)  angle -= STEER_SPEED * (speed / 5);
  if (input.right) angle += STEER_SPEED * (speed / 5);

  // Acceleration
  if (input.up) speed = Math.min(speed + ACCEL, 8);
  speed *= FRICTION; // Natural deceleration

  // Target velocity (forward direction of car)
  const targetVx = Math.cos(angle) * speed;
  const targetVy = Math.sin(angle) * speed;

  // Blend between current velocity and target (creates drift)
  vx = vx * (1 - DRIFT_GRIP) + targetVx * DRIFT_GRIP;
  vy = vy * (1 - DRIFT_GRIP) + targetVy * DRIFT_GRIP;

  return { ...car, x: car.x + vx, y: car.y + vy, angle, speed, vx, vy };
}`,
            language: "typescript",
          },
        ],
        commonUse: ["Racing games", "Spacecraft controls", "Top-down shooters"],
      },
      {
        id: "lap-detection",
        name: "Lap Detection with Checkpoints",
        difficulty: "intermediate",
        description:
          "Laps are counted by passing through a series of invisible checkpoints in order. This prevents cheating shortcuts and ensures the player completes the full track.",
        examples: [
          {
            title: "Checkpoint System",
            description: "Validating lap completion via ordered checkpoints",
            code: `interface Checkpoint {
  x: number; y: number;
  radius: number;
}

const CHECKPOINTS: Checkpoint[] = [
  { x: 400, y: 300, radius: 40 },
  { x: 700, y: 150, radius: 40 },
  { x: 700, y: 500, radius: 40 },
  // ... more around the track
];

interface LapState {
  nextCheckpoint: number; // Which checkpoint to hit next
  laps: number;
}

function checkCheckpoints(car: { x: number; y: number }, lap: LapState): LapState {
  const cp = CHECKPOINTS[lap.nextCheckpoint];
  const dist = Math.hypot(car.x - cp.x, car.y - cp.y);

  if (dist < cp.radius) {
    const next = lap.nextCheckpoint + 1;

    // Completed all checkpoints = full lap
    if (next >= CHECKPOINTS.length) {
      return { nextCheckpoint: 0, laps: lap.laps + 1 };
    }
    return { ...lap, nextCheckpoint: next };
  }
  return lap; // No checkpoint reached
}`,
            language: "typescript",
          },
        ],
        commonUse: ["Racing games", "Obstacle courses", "Navigation systems"],
      },
    ],
    commonConcepts: [
      "Canvas transform / rotation for car rendering",
      "Keyboard input buffering",
      "Track boundary collision detection",
      "Minimap rendering (scaled canvas)",
    ],
    quiz: [
      {
        id: "q1",
        question: "What does the DRIFT_GRIP constant control in the car physics?",
        options: [
          "How fast the car accelerates",
          "How quickly the car's actual velocity aligns with its heading — lower values create more slide/drift",
          "How tight the steering is",
          "Maximum top speed",
        ],
        correctAnswer: 1,
        explanation:
          "DRIFT_GRIP blends between the car's current world velocity and its heading velocity. At 1.0 there is no drift; at 0 the car slides completely sideways.",
      },
      {
        id: "q2",
        question: "Why do checkpoints need to be passed in order to count a lap?",
        options: [
          "To make the game code simpler",
          "To prevent shortcut cheating — the player must drive the full track path",
          "Checkpoints do not need to be in order",
          "To slow down fast players",
        ],
        correctAnswer: 1,
        explanation:
          "Without ordered checkpoints, a player could cut across the infield, trigger the finish line, and count a fake lap. Ordered checkpoints enforce the correct track path.",
      },
      {
        id: "q3",
        question: "Why is speed multiplied by FRICTION each frame even without braking?",
        options: [
          "It is a bug",
          "It simulates natural deceleration (air resistance, rolling resistance) — without it the car would maintain speed forever",
          "Friction increases score",
          "It prevents the car from going in reverse",
        ],
        correctAnswer: 1,
        explanation:
          "In real life cars always experience drag. Multiplying by a value just below 1 each frame gradually reduces speed, creating a realistic coast-to-stop feel.",
      },
    ],
  },

  "battleship": {
    gameId: "battleship",
    gameName: "Battleship",
    gameIcon: "🚢",
    summary:
      "Battleship is a two-player strategy game where each player places ships on a grid and takes turns guessing the opponent's ship locations. Core concepts include 2D grid state, ship placement validation, and AI hunt-and-target strategy.",
    uniqueConcepts: [
      {
        id: "ship-placement",
        name: "Ship Placement & Validation",
        difficulty: "beginner",
        description:
          "Ships occupy sequential cells horizontally or vertically. Placement must validate that ships stay within bounds, don't overlap each other, and don't leave adjacency conflicts.",
        examples: [
          {
            title: "Ship Placement Validation",
            description: "Checking if a ship can be placed at a position",
            code: `const GRID_SIZE = 10;

interface Ship {
  row: number; col: number;
  size: number;
  horizontal: boolean;
}

// Get all cells a ship would occupy
function shipCells(ship: Ship): [number, number][] {
  return Array.from({ length: ship.size }, (_, i) => [
    ship.row + (ship.horizontal ? 0 : i),
    ship.col + (ship.horizontal ? i : 0),
  ] as [number, number]);
}

function canPlace(ship: Ship, placedShips: Ship[]): boolean {
  const cells = shipCells(ship);

  // Check bounds
  for (const [r, c] of cells) {
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return false;
  }

  // Check overlap with existing ships
  const occupied = new Set(placedShips.flatMap(s => shipCells(s).map(([r,c]) => \`\${r},\${c}\`)));
  for (const [r, c] of cells) {
    if (occupied.has(\`\${r},\${c}\`)) return false;
  }
  return true;
}`,
            language: "typescript",
          },
        ],
        commonUse: ["Board games", "Grid puzzles", "Map editors"],
      },
      {
        id: "ai-hunt-target",
        name: "AI Hunt & Target Strategy",
        difficulty: "advanced",
        description:
          "A smart Battleship AI uses two modes: Hunt (random shots until a hit) and Target (systematically checks adjacent cells after a hit to sink the ship).",
        examples: [
          {
            title: "Hunt & Target AI",
            description: "AI switching between random and targeted shots",
            code: `type ShotResult = "miss" | "hit" | "sunk";
type AIMode = "hunt" | "target";

interface AIState {
  mode: AIMode;
  hitStack: [number, number][]; // Cells to try after a hit
  triedCells: Set<string>;
}

function aiShoot(ai: AIState, opponentGrid: ShotResult[][]): [number, number] {
  if (ai.mode === "target" && ai.hitStack.length > 0) {
    // Target mode: pop from stack of adjacent cells to try
    return ai.hitStack.pop()!;
  }

  // Hunt mode: random untried cell
  let r: number, c: number;
  do {
    r = Math.floor(Math.random() * GRID_SIZE);
    c = Math.floor(Math.random() * GRID_SIZE);
  } while (ai.triedCells.has(\`\${r},\${c}\`));
  return [r, c];
}

function aiProcessResult(ai: AIState, result: ShotResult, r: number, c: number): AIState {
  const triedCells = new Set(ai.triedCells).add(\`\${r},\${c}\`);
  
  if (result === "hit") {
    // Add all 4 adjacent cells to explore
    const neighbours: [number, number][] = [[r-1,c],[r+1,c],[r,c-1],[r,c+1]]
      .filter(([nr, nc]) => nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE 
                         && !triedCells.has(\`\${nr},\${nc}\`)) as [number, number][];
    return { mode: "target", hitStack: [...ai.hitStack, ...neighbours], triedCells };
  }
  if (result === "sunk") {
    // Ship sunk — go back to hunting
    return { mode: "hunt", hitStack: [], triedCells };
  }
  return { ...ai, triedCells };
}`,
            language: "typescript",
          },
        ],
        commonUse: ["Turn-based game AI", "Search algorithms", "Probability-based AI"],
      },
    ],
    commonConcepts: [
      "2D array state for two boards",
      "Turn-based game loop",
      "CSS Grid / Canvas for board rendering",
      "Win condition detection (all ships sunk)",
    ],
    quiz: [
      {
        id: "q1",
        question: "What triggers the AI to switch from Hunt mode to Target mode?",
        options: [
          "After 5 random misses",
          "When the AI scores a hit — it then focuses on adjacent cells to finish sinking the ship",
          "At the start of each turn",
          "When only 2 ships remain",
        ],
        correctAnswer: 1,
        explanation:
          "A hit means part of a ship is at that location. Target mode pushes all 4 adjacent cells onto a stack to systematically sink the rest of the ship.",
      },
      {
        id: "q2",
        question: "Why does shipCells() return an array instead of just marking the grid directly?",
        options: [
          "It is slower to use arrays",
          "It returns the list of cells for reuse in validation, rendering, and hit detection without duplicating logic",
          "The grid cannot be marked during placement",
          "Arrays are required by TypeScript",
        ],
        correctAnswer: 1,
        explanation:
          "Returning the cell list separates data from side effects — the same function can be used to validate placement, draw ship highlights, and detect hits.",
      },
      {
        id: "q3",
        question: "What happens when the AI sinks a ship in Target mode?",
        options: [
          "The AI keeps targeting adjacent cells",
          "The AI resets to Hunt mode and clears its hit stack since the ship is fully sunk",
          "The AI stops shooting for one turn",
          "The AI switches to a different grid",
        ],
        correctAnswer: 1,
        explanation:
          "Once a ship is confirmed sunk, Target mode is no longer needed. The AI clears its hitStack and returns to random Hunt mode to find the next ship.",
      },
    ],
  },
};

// ─── CONCEPT SECTIONS ─────────────────────────────────────────────────────────

export const BEGINNER_CONCEPTS: ConceptSection = {
  id: "beginner",
  title: "Beginner Concepts",
  icon: "🌱",
  tagline: "The foundations every programmer needs — start here if you are new to coding.",
  concepts: [
    {
      id: "variables",
      name: "Variables & Data Types",
      difficulty: "beginner",
      description:
        "Variables are labelled boxes that store information. In JavaScript/TypeScript, you use let (changeable) and const (fixed). Every value has a type: number, string, boolean, null, undefined, array, or object.",
      examples: [
        {
          title: "Declaring Variables",
          description: "let vs const and the common data types",
          code: `// const: value never changes
const MAX_SCORE = 100;
const PLAYER_NAME = "Harry";

// let: value can change
let score = 0;
let isAlive = true;
let health = 3;

// Arrays: ordered lists
const highScores: number[] = [450, 300, 200];

// Objects: grouped related data
const player = {
  name: "Harry",
  score: 0,
  lives: 3,
  position: { x: 100, y: 200 }
};

// TypeScript types prevent bugs
let username: string = "Harry";
// username = 42; // ❌ Error: number is not a string`,
          language: "typescript",
        },
        {
          title: "Type Coercion Gotchas",
          description: "Common JavaScript type traps beginners hit",
          code: `// "+" with strings concatenates rather than adds
console.log("5" + 3);   // "53"  ← not 8!
console.log(5 + 3);     // 8    ← correct

// Use Number() to convert strings to numbers
const input = "42";
const num = Number(input); // 42

// Falsy values (evaluate to false in conditions)
// false, 0, "", null, undefined, NaN
if (0)         console.log("nope"); // skipped
if ("")        console.log("nope"); // skipped
if ("Harry")   console.log("yes");  // runs ✓`,
          language: "typescript",
        },
      ],
      commonUse: ["Every program ever written", "Storing game state", "User input", "Config"],
    },
    {
      id: "functions",
      name: "Functions",
      difficulty: "beginner",
      description:
        "A function is a reusable block of code with a name. You give it inputs (parameters), it does work, and returns an output. Arrow functions are the modern short form used everywhere in React.",
      examples: [
        {
          title: "Function Basics",
          description: "Regular and arrow function syntax",
          code: `// Regular function
function add(a: number, b: number): number {
  return a + b;
}

// Arrow function (same thing, shorter)
const add = (a: number, b: number): number => a + b;

// Default parameters
function greet(name: string = "Player"): string {
  return \`Hello, \${name}!\`;
}
greet();         // "Hello, Player!"
greet("Harry");  // "Hello, Harry!"

// Functions can return objects
function createPlayer(name: string) {
  return { name, score: 0, lives: 3 };
}
const p = createPlayer("Harry");
console.log(p.score); // 0`,
          language: "typescript",
        },
        {
          title: "Higher-Order Functions",
          description: "Functions that take or return other functions",
          code: `// Array methods take functions as arguments
const scores = [10, 45, 30, 80, 60];

// map: transform each item
const doubled = scores.map(s => s * 2);
// [20, 90, 60, 160, 120]

// filter: keep items that pass the test
const topScores = scores.filter(s => s >= 50);
// [80, 60]

// reduce: collapse array to single value
const total = scores.reduce((sum, s) => sum + s, 0);
// 225

// sort: order items (note: modifies original!)
const ranked = [...scores].sort((a, b) => b - a);
// [80, 60, 45, 30, 10]`,
          language: "typescript",
        },
      ],
      commonUse: ["Code organisation", "Event handlers", "Array processing", "React components"],
    },
    {
      id: "conditionals",
      name: "Conditionals & Control Flow",
      difficulty: "beginner",
      description:
        "Conditionals let your program make decisions. if/else checks a condition; switch handles many cases; the ternary operator is a compact one-liner for simple true/false choices.",
      examples: [
        {
          title: "if / else / switch",
          description: "Making decisions in code",
          code: `// if / else if / else
function getGrade(score: number): string {
  if (score >= 90) {
    return "A";
  } else if (score >= 80) {
    return "B";
  } else if (score >= 70) {
    return "C";
  } else {
    return "F";
  }
}

// Switch (cleaner for many exact-value cases)
function directionLabel(key: string): string {
  switch (key) {
    case "ArrowUp":    return "up";
    case "ArrowDown":  return "down";
    case "ArrowLeft":  return "left";
    case "ArrowRight": return "right";
    default:           return "none";
  }
}

// Ternary operator: condition ? ifTrue : ifFalse
const status = isAlive ? "playing" : "game over";`,
          language: "typescript",
        },
        {
          title: "Logical Operators",
          description: "&& || ! and short-circuit evaluation",
          code: `const age = 15;
const hasPermission = true;

// AND: both must be true
if (age >= 13 && hasPermission) {
  console.log("Access granted");
}

// OR: at least one must be true
if (age < 13 || !hasPermission) {
  console.log("Access denied");
}

// Short-circuit: && stops at first false
// Commonly used in React JSX rendering
const playerName = user && user.name; // null if user is null

// Nullish coalescing: use right side if left is null/undefined
const displayName = playerName ?? "Guest";`,
          language: "typescript",
        },
      ],
      commonUse: ["Input validation", "Game rules", "UI visibility", "Error handling"],
    },
    {
      id: "loops",
      name: "Loops & Iteration",
      difficulty: "beginner",
      description:
        "Loops repeat code multiple times. for loops run a fixed number of times, while loops run until a condition is false, and for...of iterates every item in an array.",
      examples: [
        {
          title: "Loop Types",
          description: "for, while, for...of, and forEach",
          code: `// Classic for loop
for (let i = 0; i < 10; i++) {
  console.log("Frame:", i);
}

// while loop (runs while condition is true)
let lives = 3;
while (lives > 0) {
  playGame();
  lives--;
}

// for...of (cleaner iteration over arrays)
const players = ["Alice", "Bob", "Harry"];
for (const player of players) {
  console.log(\`Welcome, \${player}!\`);
}

// forEach (same as for...of but functional style)
players.forEach((player, index) => {
  console.log(\`\${index + 1}. \${player}\`);
});

// Loop with break / continue
for (let i = 0; i < 100; i++) {
  if (i === 5) continue; // Skip 5
  if (i === 8) break;    // Stop at 8
  console.log(i);        // Prints 0-4, 6-7
}`,
          language: "typescript",
        },
        {
          title: "Looping Over 2D Grids",
          description: "Nested loops for game boards and grids",
          code: `// Nested loops for a game grid
const ROWS = 5, COLS = 5;
const grid: string[][] = [];

// Build an empty grid
for (let r = 0; r < ROWS; r++) {
  grid[r] = [];
  for (let c = 0; c < COLS; c++) {
    grid[r][c] = "."; // Empty cell
  }
}

// Render the grid
for (const row of grid) {
  console.log(row.join(" ")); // ". . . . ."
}

// Find a value in a grid
function findInGrid(grid: string[][], target: string): [number, number] | null {
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] === target) return [r, c];
    }
  }
  return null; // Not found
}`,
          language: "typescript",
        },
      ],
      commonUse: ["Grid rendering", "Processing game objects", "Animation frames", "Data processing"],
    },
    {
      id: "arrays-objects",
      name: "Arrays & Objects",
      difficulty: "beginner",
      description:
        "Arrays store ordered lists of items (accessed by index 0, 1, 2…). Objects store key-value pairs — perfect for grouping related data like a player's name, score, and position.",
      examples: [
        {
          title: "Array Operations",
          description: "Adding, removing, and finding items",
          code: `const items: string[] = ["sword", "shield", "potion"];

// Reading
console.log(items[0]);       // "sword"
console.log(items.length);   // 3
console.log(items.at(-1));   // "potion" (last item)

// Adding
items.push("bow");            // Add to end
items.unshift("helmet");      // Add to front

// Removing
items.pop();                  // Remove from end → "bow"
items.shift();                // Remove from front → "helmet"
items.splice(1, 1);           // Remove 1 item at index 1

// Searching
items.includes("sword");      // true
items.indexOf("potion");      // 1 (or -1 if not found)
items.find(i => i.startsWith("s")); // "sword"

// Non-mutating copies (important in React!)
const sorted = [...items].sort();
const withGold = [...items, "gold"];`,
          language: "typescript",
        },
        {
          title: "Object Patterns",
          description: "Destructuring, spread, and optional chaining",
          code: `const player = { name: "Harry", score: 150, lives: 3, level: 2 };

// Destructuring: extract values by name
const { name, score } = player;
console.log(name);  // "Harry"

// Spread: copy and update (immutable pattern)
const updatedPlayer = { ...player, score: 200 };
// Original unchanged: player.score still 150

// Optional chaining: safe access on possibly-null objects
const user = getUser(); // might return null
const displayName = user?.profile?.name ?? "Guest";

// Dynamic keys
const scores: Record<string, number> = {};
scores["Alice"] = 100;
scores["Bob"]   = 200;

// Object.entries: iterate key-value pairs
for (const [name, score] of Object.entries(scores)) {
  console.log(\`\${name}: \${score}\`);
}`,
          language: "typescript",
        },
      ],
      commonUse: ["Game state", "Player lists", "Inventory systems", "Configuration"],
    },
    {
      id: "error-handling",
      name: "Error Handling",
      difficulty: "beginner",
      description:
        "Programs can fail — network requests time out, JSON is malformed, or code has bugs. try/catch lets you handle errors gracefully instead of crashing the entire app.",
      examples: [
        {
          title: "try / catch / finally",
          description: "Graceful error handling",
          code: `// Basic try/catch
function parseScore(input: string): number {
  try {
    const score = JSON.parse(input);
    if (typeof score !== "number") throw new Error("Not a number");
    return score;
  } catch (err) {
    console.error("Invalid score:", err);
    return 0; // Safe fallback
  } finally {
    console.log("Parsing attempted"); // Always runs
  }
}

// Custom errors
class GameError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "GameError";
  }
}

function loadGame(id: string) {
  if (!id) throw new GameError("No game ID provided", "INVALID_ID");
  // ...
}

try {
  loadGame("");
} catch (err) {
  if (err instanceof GameError) {
    console.error(\`Game error [\${err.code}]: \${err.message}\`);
  }
}`,
          language: "typescript",
        },
      ],
      commonUse: ["API calls", "JSON parsing", "File I/O", "Form validation"],
    },
  ],
  quiz: [
    {
      id: "bq1",
      question: "What is the difference between let and const in JavaScript/TypeScript?",
      options: [
        "let is faster; const is slower",
        "const cannot be reassigned after declaration; let can be reassigned",
        "const only works for numbers; let works for all types",
        "They are identical",
      ],
      correctAnswer: 1,
      explanation:
        "const binds the variable permanently to its initial value. let allows reassignment. Both are block-scoped (unlike the older var).",
    },
    {
      id: "bq2",
      question: "What does scores.filter(s => s >= 50) return?",
      options: [
        "The number of scores above 50",
        "A new array containing only scores that are 50 or higher",
        "The first score above 50",
        "It modifies the original array to remove scores below 50",
      ],
      correctAnswer: 1,
      explanation:
        "filter() returns a new array of items where the callback returns true. It never modifies the original array.",
    },
    {
      id: "bq3",
      question: "Why should you use [...items].sort() instead of items.sort() when you need the original order preserved?",
      options: [
        "Spread syntax makes sorting faster",
        "sort() mutates the original array; spreading first creates a copy so the original stays unchanged",
        "sort() does not work without the spread syntax",
        "There is no difference",
      ],
      correctAnswer: 1,
      explanation:
        "Array.sort() sorts in place, which mutates the original. Creating a copy with spread [...items] first lets you sort without affecting the source array — critical in React where state should be treated as immutable.",
    },
    {
      id: "bq4",
      question: "What is the ternary operator and when would you use it?",
      options: [
        "A loop that runs three times",
        "A compact one-liner for simple true/false choices: condition ? valueIfTrue : valueIfFalse",
        "A function that takes three parameters",
        "A TypeScript-only feature",
      ],
      correctAnswer: 1,
      explanation:
        "The ternary operator replaces a simple if/else with a single expression. It is especially common in JSX: {isLoggedIn ? <Dashboard /> : <Login />}.",
    },
  ],
};

export const COMMON_CONCEPTS: ConceptSection = {
  id: "common",
  title: "Common Concepts",
  icon: "⚙️",
  tagline: "Programming patterns shared across every game in this hub — from React hooks to async JavaScript.",
  concepts: [
    {
      id: "react-hooks",
      name: "React Hooks (useState, useEffect, useRef)",
      difficulty: "intermediate",
      description:
        "React Hooks are special functions that let components manage state and side effects without class syntax. useState holds data, useEffect runs code when data changes, and useRef holds a value that does NOT trigger re-renders.",
      examples: [
        {
          title: "useState — Reactive State",
          description: "State that re-renders the component when changed",
          code: `import { useState } from "react";

function ScoreBoard() {
  // [currentValue, setterFunction] = useState(initialValue)
  const [score, setScore] = useState(0);
  const [playerName, setPlayerName] = useState("Harry");

  const addPoints = (pts: number) => {
    // Always use the setter — never mutate state directly!
    setScore(prev => prev + pts);  // Use callback for derived values
  };

  // Computed value from state — no extra useState needed
  const grade = score >= 100 ? "A" : score >= 70 ? "B" : "C";

  return (
    <div>
      <p>{playerName}: {score} pts ({grade})</p>
      <button onClick={() => addPoints(10)}>+10</button>
    </div>
  );
}`,
          language: "typescript",
        },
        {
          title: "useEffect — Side Effects",
          description: "Running code when state changes or on mount",
          code: `import { useState, useEffect, useRef } from "react";

function GameTimer() {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return; // Do nothing if paused

    // Start interval
    const id = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);

    // Cleanup: runs when component unmounts or deps change
    return () => clearInterval(id);
  }, [running]); // Re-runs when 'running' changes

  return <div>{seconds}s <button onClick={() => setRunning(r => !r)}>Toggle</button></div>;
}

// useRef: holds a value without causing re-renders
function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "blue";
    ctx.fillRect(0, 0, 100, 100);
  }, []);

  return <canvas ref={canvasRef} width={400} height={300} />;
}`,
          language: "typescript",
        },
      ],
      commonUse: ["All React components", "Game loops", "API calls", "DOM access"],
    },
    {
      id: "async-await",
      name: "Asynchronous JavaScript (Promises & async/await)",
      difficulty: "intermediate",
      description:
        "JavaScript runs on one thread, so long tasks (network requests, file reads) run asynchronously — they start and complete later. Promises represent future values; async/await makes them readable like synchronous code.",
      examples: [
        {
          title: "async / await Pattern",
          description: "Fetching data without blocking the UI",
          code: `// Without async/await (Promise chain — harder to read)
fetch("/api/scores")
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));

// With async/await (same thing, much clearer)
async function loadScores(): Promise<Score[]> {
  try {
    const res  = await fetch("/api/scores");      // Wait for response
    if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
    const data = await res.json();               // Wait for JSON parse
    return data as Score[];
  } catch (err) {
    console.error("Failed to load scores:", err);
    return [];
  }
}

// Parallel requests (run at the same time)
async function loadAll() {
  const [scores, players] = await Promise.all([
    loadScores(),
    loadPlayers(), // Both start immediately
  ]);
  return { scores, players };
}`,
          language: "typescript",
        },
        {
          title: "Using async in React useEffect",
          description: "Fetching data when a component mounts",
          code: `import { useState, useEffect } from "react";

function Leaderboard() {
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    // Can't make useEffect itself async, so define and call inline
    async function fetchScores() {
      try {
        setLoading(true);
        const res  = await fetch("/api/leaderboard");
        const data = await res.json();
        setScores(data);
      } catch {
        setError("Failed to load scores");
      } finally {
        setLoading(false);
      }
    }
    fetchScores();
  }, []); // Empty deps = run once on mount

  if (loading) return <p>Loading…</p>;
  if (error)   return <p>Error: {error}</p>;
  return <ul>{scores.map(s => <li key={s.id}>{s.name}: {s.score}</li>)}</ul>;
}`,
          language: "typescript",
        },
      ],
      commonUse: ["API requests", "Database queries", "File uploads", "WebSocket messages"],
    },
    {
      id: "typescript-basics",
      name: "TypeScript: Types & Interfaces",
      difficulty: "intermediate",
      description:
        "TypeScript adds static typing to JavaScript. You define the shape of data with interfaces, use union types for multiple possibilities, and generics for reusable typed functions — all caught at compile time before runtime bugs.",
      examples: [
        {
          title: "Interfaces & Types",
          description: "Defining data shapes",
          code: `// Interface: describes object shape
interface Player {
  id: string;
  name: string;
  score: number;
  lives?: number;   // Optional field (may be undefined)
  readonly level: number; // Cannot be reassigned
}

// Type alias (can describe unions, primitives, etc.)
type Direction = "up" | "down" | "left" | "right";
type Tile = "empty" | "wall" | "pellet" | "powerup";
type Grid = Tile[][];

// Generic: works with any type
function getFirst<T>(arr: T[]): T | null {
  return arr.length > 0 ? arr[0] : null;
}
getFirst<number>([1, 2, 3]);   // 1
getFirst<string>(["a", "b"]);  // "a"

// Discriminated union (exhaustive type checking)
type GameEvent =
  | { type: "score"; points: number }
  | { type: "die";   livesLeft: number }
  | { type: "win";   finalScore: number };

function handleEvent(e: GameEvent) {
  switch (e.type) {
    case "score": return addScore(e.points);
    case "die":   return showDeath(e.livesLeft);
    case "win":   return showVictory(e.finalScore);
    // TypeScript errors if a case is missing!
  }
}`,
          language: "typescript",
        },
      ],
      commonUse: ["All TypeScript projects", "API response types", "Game state typing", "Component props"],
    },
    {
      id: "event-handling",
      name: "Event-Driven Programming",
      difficulty: "beginner",
      description:
        "Programs react to events — keystrokes, clicks, timers, network messages. Attaching a listener function to an event is the core model for interactive applications and all games in this hub.",
      examples: [
        {
          title: "Keyboard & Mouse Events",
          description: "Handling input in games",
          code: `// React synthetic events (JSX)
<button onClick={(e) => handleClick(e)}>Click me</button>
<input onChange={(e) => setName(e.target.value)} />

// Native DOM events (for game loops)
useEffect(() => {
  const handleKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft")  moveLeft();
    if (e.key === "ArrowRight") moveRight();
    if (e.key === " ") { e.preventDefault(); jump(); }
  };

  window.addEventListener("keydown", handleKey);
  return () => window.removeEventListener("keydown", handleKey); // Cleanup!
}, []);

// Tracking held keys (for smooth movement)
const keys = useRef<Set<string>>(new Set());

useEffect(() => {
  const down = (e: KeyboardEvent) => keys.current.add(e.key);
  const up   = (e: KeyboardEvent) => keys.current.delete(e.key);

  window.addEventListener("keydown", down);
  window.addEventListener("keyup",   up);
  return () => {
    window.removeEventListener("keydown", down);
    window.removeEventListener("keyup",   up);
  };
}, []);`,
          language: "typescript",
        },
      ],
      commonUse: ["All games", "Forms", "Real-time updates", "UI interactions"],
    },
    {
      id: "localstorage",
      name: "Local Storage & State Persistence",
      difficulty: "beginner",
      description:
        "localStorage lets you save data in the browser that persists even when the page is refreshed or closed — perfect for high scores, settings, and game progress.",
      examples: [
        {
          title: "Saving & Loading Data",
          description: "Persisting scores and settings with localStorage",
          code: `// Save to localStorage (always stringified)
function saveHighScore(score: number) {
  localStorage.setItem("highScore", String(score));
}

// Load from localStorage (parse carefully)
function loadHighScore(): number {
  const raw = localStorage.getItem("highScore");
  return raw ? Number(raw) : 0; // Default 0 if not found
}

// Saving complex objects with JSON
interface GameSettings {
  volume: number;
  difficulty: "easy" | "medium" | "hard";
  playerName: string;
}

function saveSettings(settings: GameSettings) {
  localStorage.setItem("gameSettings", JSON.stringify(settings));
}

function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem("gameSettings");
    return raw ? JSON.parse(raw) : { volume: 0.5, difficulty: "medium", playerName: "Player" };
  } catch {
    return { volume: 0.5, difficulty: "medium", playerName: "Player" };
  }
}

// React hook pattern
function useLocalStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : defaultValue;
    } catch { return defaultValue; }
  });

  const set = (v: T) => {
    setValue(v);
    localStorage.setItem(key, JSON.stringify(v));
  };
  return [value, set] as const;
}`,
          language: "typescript",
        },
      ],
      commonUse: ["High scores", "User settings", "Game progress", "Shopping carts"],
    },
  ],
  quiz: [
    {
      id: "cq1",
      question: "Why do you need to return a cleanup function from useEffect?",
      options: [
        "To make the component re-render",
        "To cancel subscriptions, intervals, or event listeners when the component unmounts or dependencies change — preventing memory leaks",
        "To reset state to its initial value",
        "Cleanup is optional and has no effect",
      ],
      correctAnswer: 1,
      explanation:
        "Without cleanup, event listeners and intervals keep running even after the component is removed from the screen, wasting memory and causing bugs.",
    },
    {
      id: "cq2",
      question: "What is the difference between useRef and useState?",
      options: [
        "useRef is for numbers; useState is for strings",
        "Changing a useRef value does NOT cause a re-render; changing useState does",
        "useRef is deprecated in modern React",
        "They are identical",
      ],
      correctAnswer: 1,
      explanation:
        "useRef holds a mutable value in .current that persists across renders without triggering re-renders — ideal for DOM elements, interval IDs, and game loop data.",
    },
    {
      id: "cq3",
      question: "Why can't you make the useEffect callback itself async?",
      options: [
        "async functions aren't allowed in React",
        "useEffect expects the callback to return a cleanup function or nothing — an async function always returns a Promise, not a cleanup function",
        "await doesn't work inside useEffect",
        "You can make it async with no consequences",
      ],
      correctAnswer: 1,
      explanation:
        "The solution is to define an inner async function and immediately call it: async function load() { … } load(); — this keeps the outer callback synchronous.",
    },
    {
      id: "cq4",
      question: "What does Promise.all([fetchA(), fetchB()]) do differently from calling them sequentially?",
      options: [
        "It runs them one after the other",
        "It starts both requests simultaneously and waits for both to complete — often twice as fast as sequential awaits",
        "It only uses the first result",
        "It catches errors for you automatically",
      ],
      correctAnswer: 1,
      explanation:
        "Sequential awaits run one-at-a-time. Promise.all fires all requests at once and resolves when all complete, dramatically reducing total wait time.",
    },
  ],
};

export const ADVANCED_CONCEPTS: ConceptSection = {
  id: "advanced",
  title: "Advanced Concepts",
  icon: "🚀",
  tagline: "Algorithms, data structures, and design patterns that power the most complex features in this hub.",
  concepts: [
    {
      id: "data-structures",
      name: "Data Structures: Stacks, Queues & Sets",
      difficulty: "intermediate",
      description:
        "Choosing the right data structure makes code faster and cleaner. A Stack (LIFO) is used for undo history. A Queue (FIFO) is used for BFS and event processing. A Set is perfect for fast membership checks.",
      examples: [
        {
          title: "Stack, Queue, Set Patterns",
          description: "Implementing the three most common structures",
          code: `// ── STACK (Last In, First Out) ──────────────────────────
class Stack<T> {
  private items: T[] = [];
  push(item: T)     { this.items.push(item); }
  pop(): T | undefined  { return this.items.pop(); }
  peek(): T | undefined { return this.items.at(-1); }
  get size()        { return this.items.length; }
}

// Use case: undo history
const moveHistory = new Stack<Move>();
moveHistory.push({ from: "a1", to: "a2" });
moveHistory.pop(); // Undo last move

// ── QUEUE (First In, First Out) ──────────────────────
class Queue<T> {
  private items: T[] = [];
  enqueue(item: T) { this.items.push(item); }
  dequeue(): T | undefined { return this.items.shift(); }
  get size()       { return this.items.length; }
}

// Use case: BFS frontier, enemy spawn queue
const spawnQueue = new Queue<EnemyType>();
spawnQueue.enqueue("fast");
const next = spawnQueue.dequeue();

// ── SET (No duplicates, O(1) lookup) ─────────────────
const visited = new Set<string>();
visited.add("0,0");
visited.has("0,0");  // true  (O(1) — much faster than .includes())
visited.delete("0,0");
visited.size;        // 0`,
          language: "typescript",
        },
      ],
      commonUse: ["BFS/DFS algorithms", "Undo systems", "Deduplication", "Cache lookups"],
    },
    {
      id: "sorting-searching",
      name: "Sorting & Searching Algorithms",
      difficulty: "intermediate",
      description:
        "Sorting and searching are the most common algorithmic tasks. JavaScript's built-in sort uses a hybrid algorithm. Binary search finds items in O(log n) — 10× faster than linear search on large sorted arrays.",
      examples: [
        {
          title: "Sorting & Binary Search",
          description: "Practical algorithm implementations",
          code: `// Leaderboard sort (descending score, then by name)
function rankPlayers(players: Player[]): Player[] {
  return [...players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score; // Score desc
    return a.name.localeCompare(b.name);               // Name asc
  });
}

// Binary search: find a score in a sorted array in O(log n)
function binarySearch(sortedScores: number[], target: number): number {
  let lo = 0, hi = sortedScores.length - 1;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (sortedScores[mid] === target) return mid;     // Found!
    if (sortedScores[mid] < target)   lo = mid + 1;  // Search right half
    else                              hi = mid - 1;  // Search left half
  }
  return -1; // Not found
}

// Insertion point (where to insert a new score in leaderboard)
function insertionPoint(sortedDesc: number[], newScore: number): number {
  return sortedDesc.findIndex(s => s < newScore) ?? sortedDesc.length;
}`,
          language: "typescript",
        },
      ],
      commonUse: ["Leaderboards", "Search features", "Game AI targeting", "Database indexes"],
    },
    {
      id: "design-patterns",
      name: "Design Patterns: Observer & Factory",
      difficulty: "advanced",
      description:
        "Design patterns are reusable solutions to common problems. The Observer pattern decouples event producers from consumers (used in WebSocket). The Factory pattern creates objects without specifying the exact class — used in game entity creation.",
      examples: [
        {
          title: "Observer Pattern (Event Emitter)",
          description: "Decoupled event-based communication",
          code: `// Simple event emitter — the basis of all event systems
class EventEmitter<Events extends Record<string, any>> {
  private listeners: {
    [K in keyof Events]?: Array<(data: Events[K]) => void>
  } = {};

  on<K extends keyof Events>(event: K, fn: (data: Events[K]) => void) {
    (this.listeners[event] ??= []).push(fn);
    return () => this.off(event, fn); // Returns unsubscribe function
  }

  off<K extends keyof Events>(event: K, fn: (data: Events[K]) => void) {
    this.listeners[event] = this.listeners[event]?.filter(f => f !== fn);
  }

  emit<K extends keyof Events>(event: K, data: Events[K]) {
    this.listeners[event]?.forEach(fn => fn(data));
  }
}

// Usage in a game
type GameEvents = {
  "score": { points: number; player: string };
  "died":  { lives: number };
  "won":   { finalScore: number };
};

const gameEvents = new EventEmitter<GameEvents>();

// Subscribe (e.g., UI components)
const unsub = gameEvents.on("score", ({ points, player }) => {
  console.log(\`\${player} scored \${points}!\`);
});

// Publish (game logic)
gameEvents.emit("score", { points: 100, player: "Harry" });
unsub(); // Clean up`,
          language: "typescript",
        },
        {
          title: "Factory Pattern",
          description: "Creating game entities with a factory function",
          code: `type EnemyType = "basic" | "fast" | "tank" | "boss";

interface Enemy {
  type: EnemyType;
  hp: number;
  speed: number;
  damage: number;
  reward: number;
}

// Factory: one place to create enemies
function createEnemy(type: EnemyType, wave: number): Enemy {
  const base: Record<EnemyType, Omit<Enemy, "type">> = {
    basic: { hp: 50,  speed: 1.0, damage: 1, reward: 5  },
    fast:  { hp: 30,  speed: 2.5, damage: 1, reward: 8  },
    tank:  { hp: 200, speed: 0.6, damage: 3, reward: 20 },
    boss:  { hp: 500, speed: 0.8, damage: 5, reward: 50 },
  };

  // Scale with wave number
  const template = base[type];
  return {
    type,
    hp:     Math.round(template.hp    * (1 + wave * 0.1)),
    speed:  template.speed,
    damage: template.damage,
    reward: template.reward,
  };
}

// Usage: clean call site — no 'new' or complex constructors
const enemy = createEnemy("boss", 5);`,
          language: "typescript",
        },
      ],
      commonUse: ["Event systems", "Plugin architectures", "Game entity creation", "UI component libraries"],
    },
    {
      id: "memoisation",
      name: "Performance: Memoization & Debouncing",
      difficulty: "advanced",
      description:
        "Memoization caches expensive function results — if the same inputs are seen again, return the cached result instantly. Debouncing limits how often a function runs — critical for search inputs and resize handlers.",
      examples: [
        {
          title: "Memoization",
          description: "Caching expensive computations",
          code: `// Memoize: cache results by input
function memoize<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn
): (...args: TArgs) => TReturn {
  const cache = new Map<string, TReturn>();
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key)!; // Cache hit
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

// Expensive chess evaluation: memoize to avoid re-computing
const evalPosition = memoize((fen: string): number => {
  // ... complex board evaluation ...
  return score;
});

evalPosition("rnbqkbnr/..."); // Computes
evalPosition("rnbqkbnr/..."); // Instant cache hit

// React's built-in memoization
import { useMemo, useCallback } from "react";

// useMemo: memoize computed values
const sortedScores = useMemo(
  () => [...scores].sort((a, b) => b - a),
  [scores] // Only recompute when scores changes
);

// useCallback: memoize functions (stable reference)
const handleScore = useCallback((pts: number) => {
  setScore(s => s + pts);
}, []); // Never re-created`,
          language: "typescript",
        },
        {
          title: "Debouncing",
          description: "Limiting how often a function fires",
          code: `// Debounce: wait until input stops changing
function debounce<T extends (...args: any[]) => void>(fn: T, delayMs: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  }) as T;
}

// Search input: only search after user stops typing for 300ms
const searchQuestions = debounce((query: string) => {
  fetch(\`/api/search?q=\${query}\`).then(/* ... */);
}, 300);

// Window resize: only recalculate after resize stops
const handleResize = debounce(() => {
  setCanvasSize({ w: window.innerWidth, h: window.innerHeight });
}, 150);

window.addEventListener("resize", handleResize);`,
          language: "typescript",
        },
      ],
      commonUse: ["Search inputs", "Scroll/resize handlers", "AI evaluation", "API rate limiting"],
    },
    {
      id: "websocket",
      name: "WebSocket: Real-Time Communication",
      difficulty: "advanced",
      description:
        "HTTP is request-response: the client asks, the server answers. WebSocket is a persistent two-way connection — either side can send a message at any time. This powers the live multiplayer in Brain Race and Quiz Board.",
      examples: [
        {
          title: "WebSocket Client",
          description: "Connecting and messaging on the client",
          code: `// Connecting to a WebSocket server
const socket = new WebSocket("wss://your-server.com/ws");

socket.onopen = () => {
  console.log("Connected!");
  socket.send(JSON.stringify({ type: "join", room: "ABCD" }));
};

socket.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  switch (msg.type) {
    case "player_joined":
      setPlayers(p => [...p, msg.player]);
      break;
    case "score_update":
      setScores(msg.scores);
      break;
    case "game_over":
      showResults(msg.winner);
      break;
  }
};

socket.onclose = () => {
  console.log("Disconnected — attempting reconnect…");
  setTimeout(connect, 2000);
};

socket.onerror = (err) => {
  console.error("WebSocket error:", err);
};

// Sending a message
function submitAnswer(answer: string) {
  socket.send(JSON.stringify({ type: "answer", answer, timestamp: Date.now() }));
}`,
          language: "typescript",
        },
      ],
      commonUse: ["Multiplayer games", "Live chat", "Collaborative tools", "Stock tickers"],
    },
  ],
  quiz: [
    {
      id: "aq1",
      question: "What is the time complexity advantage of using a Set for membership checks over Array.includes()?",
      options: [
        "O(n²) vs O(n)",
        "O(log n) vs O(1)",
        "O(1) vs O(n) — Set lookups are constant time regardless of size",
        "They have the same complexity",
      ],
      correctAnswer: 2,
      explanation:
        "Set uses a hash table internally, making .has() O(1) regardless of set size. Array.includes() scans every element — O(n) — which is much slower for large collections.",
    },
    {
      id: "aq2",
      question: "When would you use the Factory pattern instead of directly using 'new MyClass()'?",
      options: [
        "When the class has no constructor",
        "When object creation logic is complex, varies by type, or you want to centralise and scale configuration — keeping call sites clean",
        "Factory pattern is only for TypeScript",
        "When you want slower object creation",
      ],
      correctAnswer: 1,
      explanation:
        "Factories centralise creation logic. Changing how enemies scale with waves only requires changing the factory — all callers benefit automatically.",
    },
    {
      id: "aq3",
      question: "What problem does debouncing solve for a search input?",
      options: [
        "It makes the input field faster",
        "It prevents dozens of API requests firing on every keystroke — waiting until the user stops typing before sending one request",
        "It caches search results",
        "It validates the input format",
      ],
      correctAnswer: 1,
      explanation:
        "Without debounce, typing 'snake' triggers 5 separate API calls (s → sn → sna → snak → snake). With a 300ms debounce, only the final query fires.",
    },
    {
      id: "aq4",
      question: "Why does WebSocket enable real-time multiplayer while regular HTTP requests cannot?",
      options: [
        "HTTP is too slow to use for games",
        "WebSocket keeps a persistent connection open — either side can send data instantly at any time, without polling",
        "WebSocket sends larger packets",
        "HTTP requires HTTPS; WebSocket does not",
      ],
      correctAnswer: 1,
      explanation:
        "HTTP is request-response: the server can only reply when asked. WebSocket allows the server to push data to clients instantly — essential for synchronised multiplayer.",
    },
  ],
};

export const BACKEND_CONCEPTS: ConceptSection = {
  id: "backend",
  title: "Backend Concepts",
  icon: "🖥️",
  tagline: "How servers, databases, and APIs work — the invisible half of every web application.",
  concepts: [
    {
      id: "http-rest",
      name: "HTTP & REST APIs",
      difficulty: "beginner",
      description:
        "HTTP is the language of the web. Every time your browser loads a page or a game fetches scores, it sends an HTTP request. REST APIs follow conventions for how to name URLs and which method to use for each action.",
      examples: [
        {
          title: "HTTP Methods & Status Codes",
          description: "The vocabulary of web communication",
          code: `// HTTP METHODS
// GET    — Read data (never changes anything)
// POST   — Create new data
// PUT    — Fully replace existing data
// PATCH  — Partially update existing data
// DELETE — Remove data

// HTTP STATUS CODES
// 200 OK          — Success
// 201 Created     — Resource was created
// 400 Bad Request — Client sent invalid data
// 401 Unauthorized— Not logged in
// 403 Forbidden   — Logged in but no permission
// 404 Not Found   — Resource doesn't exist
// 500 Server Error— Something crashed on the server

// REST URL conventions for a leaderboard API:
// GET    /api/scores          → Get all scores
// GET    /api/scores/:id      → Get one score
// POST   /api/scores          → Submit a new score
// DELETE /api/scores/:id      → Delete a score

// Making REST calls from the client
const res = await fetch("/api/scores", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ playerName: "Harry", score: 450 }),
});

if (!res.ok) {
  const err = await res.json();
  throw new Error(err.message);
}
const saved = await res.json(); // { id: "abc123", score: 450, ... }`,
          language: "typescript",
        },
      ],
      commonUse: ["All web APIs", "Game leaderboards", "User auth", "Data fetching"],
    },
    {
      id: "express-server",
      name: "Express.js Server",
      difficulty: "intermediate",
      description:
        "Express is a minimal Node.js web framework used in this hub's API server. You define routes, add middleware (for authentication, logging, body parsing), and handle errors.",
      examples: [
        {
          title: "Express Route Setup",
          description: "Building a leaderboard API",
          code: `import express from "express";
const app = express();

// Middleware: runs on every request before route handlers
app.use(express.json());          // Parse JSON bodies
app.use(cors());                  // Allow cross-origin requests
app.use(requestLogger);           // Log every request

// GET all scores (sorted, limited)
app.get("/api/scores", async (req, res) => {
  try {
    const { game = "snake", limit = "10" } = req.query;
    const scores = await db.query(
      "SELECT * FROM scores WHERE game = $1 ORDER BY score DESC LIMIT $2",
      [game, Number(limit)]
    );
    res.json(scores.rows);
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

// POST a new score
app.post("/api/scores", async (req, res) => {
  const { playerName, score, game } = req.body;

  // Validate input
  if (!playerName || typeof score !== "number" || score < 0) {
    return res.status(400).json({ error: "Invalid score data" });
  }

  const result = await db.query(
    "INSERT INTO scores (player_name, score, game) VALUES ($1, $2, $3) RETURNING *",
    [playerName, score, game]
  );
  res.status(201).json(result.rows[0]);
});

app.listen(3001, () => console.log("API running on :3001"));`,
          language: "typescript",
        },
        {
          title: "Middleware Pattern",
          description: "Authentication middleware for protected routes",
          code: `import { Request, Response, NextFunction } from "express";

// Middleware: function(req, res, next)
// Call next() to pass to the next handler
// Call res.json() to end the chain early

function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const payload = verifyJwt(token); // Throws if invalid
    req.user = payload;               // Attach user to request
    next();                           // Proceed to route handler
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Apply middleware to specific routes
app.get("/api/profile",  authenticate, getProfile);  // Protected
app.post("/api/scores",  authenticate, postScore);   // Protected
app.get("/api/leaderboard",            getLeaderboard); // Public`,
          language: "typescript",
        },
      ],
      commonUse: ["REST APIs", "Authentication", "File uploads", "WebSocket servers"],
    },
    {
      id: "databases",
      name: "Databases: SQL & CRUD",
      difficulty: "intermediate",
      description:
        "A database stores persistent data. SQL databases (like PostgreSQL) store data in tables with rows and columns. The four fundamental operations are Create, Read, Update, Delete (CRUD).",
      examples: [
        {
          title: "SQL CRUD Operations",
          description: "Creating and querying a scores table",
          code: `-- Create the table (schema)
CREATE TABLE scores (
  id          SERIAL PRIMARY KEY,
  player_name VARCHAR(50)  NOT NULL,
  score       INTEGER      NOT NULL CHECK (score >= 0),
  game        VARCHAR(30)  NOT NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- CREATE: Insert a new score
INSERT INTO scores (player_name, score, game)
VALUES ('Harry', 450, 'snake')
RETURNING *;

-- READ: Get top 10 scores for snake
SELECT player_name, score, created_at
FROM   scores
WHERE  game = 'snake'
ORDER  BY score DESC
LIMIT  10;

-- UPDATE: Correct a score
UPDATE scores
SET    score = 500
WHERE  id = 42;

-- DELETE: Remove a score
DELETE FROM scores WHERE id = 42;

-- Aggregation: stats per game
SELECT
  game,
  COUNT(*)         AS total_games,
  MAX(score)       AS high_score,
  AVG(score)::INT  AS avg_score
FROM scores
GROUP BY game
ORDER BY high_score DESC;`,
          language: "sql",
        },
        {
          title: "Using PostgreSQL in Node.js",
          description: "Querying a database from Express",
          code: `import { Pool } from "pg";

// Connection pool: reuses connections efficiently
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum simultaneous connections
});

// Parameterised queries ($1, $2) PREVENT SQL INJECTION
async function saveScore(playerName: string, score: number, game: string) {
  const result = await db.query(
    \`INSERT INTO scores (player_name, score, game)
     VALUES ($1, $2, $3)
     RETURNING id, created_at\`,
    [playerName, score, game]  // Parameters: never interpolated directly
  );
  return result.rows[0];
}

async function getTopScores(game: string, limit = 10) {
  const result = await db.query(
    \`SELECT player_name, score, created_at
     FROM   scores
     WHERE  game = $1
     ORDER  BY score DESC
     LIMIT  $2\`,
    [game, limit]
  );
  return result.rows; // Array of row objects
}`,
          language: "typescript",
        },
      ],
      commonUse: ["Leaderboards", "User accounts", "Game progress", "Analytics"],
    },
    {
      id: "authentication",
      name: "Authentication: JWT & Password Hashing",
      difficulty: "advanced",
      description:
        "Authentication verifies who a user is. Passwords are hashed (never stored plain) using bcrypt. After login, the server issues a JWT (JSON Web Token) — a signed token the client sends with every protected request.",
      examples: [
        {
          title: "Password Hashing & JWT",
          description: "Secure login flow",
          code: `import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const SALT_ROUNDS = 12; // Higher = slower hash (more secure)
const JWT_SECRET  = process.env.JWT_SECRET!; // Never hard-code!

// REGISTER: Hash password before saving
async function registerUser(email: string, password: string) {
  // Hash the password — bcrypt adds a random salt automatically
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  await db.query(
    "INSERT INTO users (email, password_hash) VALUES ($1, $2)",
    [email, hashedPassword]
  );
}

// LOGIN: Compare hashed passwords
async function loginUser(email: string, password: string): Promise<string> {
  const user = await db.query("SELECT * FROM users WHERE email = $1", [email]);
  if (!user.rows[0]) throw new Error("User not found");

  // bcrypt.compare hashes the input and compares to stored hash
  const valid = await bcrypt.compare(password, user.rows[0].password_hash);
  if (!valid) throw new Error("Wrong password");

  // Issue JWT — signed with secret, expires in 24h
  const token = jwt.sign(
    { userId: user.rows[0].id, email },
    JWT_SECRET,
    { expiresIn: "24h" }
  );
  return token;
}

// VERIFY: Check JWT on protected routes
function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET); // Throws if invalid or expired
}`,
          language: "typescript",
        },
      ],
      commonUse: ["User accounts", "Protecting API routes", "Session management"],
    },
    {
      id: "websocket-server",
      name: "WebSocket Server with ws",
      difficulty: "advanced",
      description:
        "The api-server in this hub uses the ws library to manage real-time connections for multiplayer games. Rooms group players together; messages are broadcast to all members of a room.",
      examples: [
        {
          title: "WebSocket Room Management",
          description: "Routing messages to the right players",
          code: `import { WebSocketServer, WebSocket } from "ws";

interface Client {
  ws: WebSocket;
  room: string;
  playerId: string;
  playerName: string;
}

const wss = new WebSocketServer({ port: 3002 });
const clients = new Map<WebSocket, Client>(); // ws → client info
const rooms   = new Map<string, Set<WebSocket>>(); // roomCode → members

// Broadcast to all players in a room
function broadcast(room: string, msg: object, exclude?: WebSocket) {
  const payload = JSON.stringify(msg);
  rooms.get(room)?.forEach(ws => {
    if (ws !== exclude && ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  });
}

wss.on("connection", (ws) => {
  ws.on("message", (raw) => {
    const msg = JSON.parse(raw.toString());

    switch (msg.type) {
      case "join_room": {
        const { room, playerName } = msg;
        clients.set(ws, { ws, room, playerId: genId(), playerName });

        // Add to room
        if (!rooms.has(room)) rooms.set(room, new Set());
        rooms.get(room)!.add(ws);

        broadcast(room, { type: "player_joined", playerName }, ws);
        break;
      }
      case "submit_answer": {
        const client = clients.get(ws)!;
        // Evaluate answer, update score, broadcast result
        broadcast(client.room, { type: "score_update", scores: getScores(client.room) });
        break;
      }
    }
  });

  ws.on("close", () => {
    const client = clients.get(ws);
    if (client) {
      rooms.get(client.room)?.delete(ws);
      clients.delete(ws);
      broadcast(client.room, { type: "player_left", playerName: client.playerName });
    }
  });
});`,
          language: "typescript",
        },
      ],
      commonUse: ["Multiplayer games", "Live chat", "Collaborative editors", "Notifications"],
    },
    {
      id: "env-config",
      name: "Environment Variables & Config",
      difficulty: "beginner",
      description:
        "Environment variables store secrets (database passwords, API keys) outside your code — so they never appear in version control. Different environments (dev, production) can have different values for the same variable.",
      examples: [
        {
          title: "Environment Variables in Node.js",
          description: "Safe secret management",
          code: `// .env file (NEVER commit this to git!)
// DATABASE_URL=postgres://user:password@localhost/mydb
// JWT_SECRET=supersecret123
// PORT=3001
// NODE_ENV=development

// Load .env file into process.env (npm i dotenv)
import "dotenv/config";

// Access env vars — always provide a fallback for safety
const PORT        = Number(process.env.PORT ?? 3001);
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET  = process.env.JWT_SECRET;

// Validate required vars at startup (fail fast)
if (!DATABASE_URL) throw new Error("DATABASE_URL is required!");
if (!JWT_SECRET)   throw new Error("JWT_SECRET is required!");

// Config module — centralise all env var access
export const config = {
  port:        PORT,
  databaseUrl: DATABASE_URL,
  jwtSecret:   JWT_SECRET,
  isDev:       process.env.NODE_ENV !== "production",
};

// .gitignore: always ignore your .env file!
// .env
// node_modules/
// dist/`,
          language: "typescript",
        },
      ],
      commonUse: ["API keys", "Database credentials", "Feature flags", "Server ports"],
    },
  ],
  quiz: [
    {
      id: "bkq1",
      question: "Which HTTP method should you use to create a new leaderboard score entry?",
      options: [
        "GET — because you are getting a score saved",
        "POST — POST creates new resources on the server",
        "DELETE — to clear old scores first",
        "PUT — to replace the current score",
      ],
      correctAnswer: 1,
      explanation:
        "POST is the standard method for creating new resources. GET should never modify data, and PUT/PATCH are for updating existing records.",
    },
    {
      id: "bkq2",
      question: "Why should you NEVER store passwords in plain text in a database?",
      options: [
        "Plain text takes more storage",
        "If the database is breached, attackers get every user's password instantly — hashing means breached hashes cannot easily be reversed",
        "Plain text passwords are slower to compare",
        "It is a TypeScript limitation",
      ],
      correctAnswer: 1,
      explanation:
        "bcrypt hashing is one-way — you can verify a password matches a hash, but you cannot reverse a hash to get the original password. This protects users even if your database is compromised.",
    },
    {
      id: "bkq3",
      question: "Why are parameterised queries ($1, $2) required instead of string interpolation?",
      options: [
        "Parameterised queries are faster",
        "String interpolation allows SQL injection — an attacker could input SQL code as a value and manipulate the database",
        "Databases don't support string interpolation",
        "Parameterised queries only work with numbers",
      ],
      correctAnswer: 1,
      explanation:
        "SQL injection is one of the most common web attacks. Parameterised queries send the SQL and data separately — the database treats the parameters as data only, never as executable SQL.",
    },
    {
      id: "bkq4",
      question: "What is the purpose of a JWT (JSON Web Token) after a user logs in?",
      options: [
        "It stores the user's password securely",
        "It is a signed token the client sends with each request to prove identity — the server verifies the signature without a database lookup",
        "It encrypts all HTTP traffic",
        "It tracks the user's browsing history",
      ],
      correctAnswer: 1,
      explanation:
        "JWTs are stateless: the server signs a payload (user ID, role) with a secret. Any request bearing a valid signature can be trusted without a session database query.",
    },
  ],
};

export function getTutorLesson(gameId: string): GameLesson | undefined {
  return TUTOR_LESSONS[gameId];
}

export function getAllGameLessons(): GameLesson[] {
  return Object.values(TUTOR_LESSONS);
}

export const ALL_CONCEPT_SECTIONS: ConceptSection[] = [
  BEGINNER_CONCEPTS,
  COMMON_CONCEPTS,
  ADVANCED_CONCEPTS,
  BACKEND_CONCEPTS,
];
