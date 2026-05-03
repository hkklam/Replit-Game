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

export function getTutorLesson(gameId: string): GameLesson | undefined {
  return TUTOR_LESSONS[gameId];
}

export function getAllGameLessons(): GameLesson[] {
  return Object.values(TUTOR_LESSONS);
}
