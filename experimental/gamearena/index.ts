import {
  getPlayerScores,
  checkWin,
  getValidMoves,
  makeMove,
  isTerminal,
} from "./utils/minimax.js";
import type { Board, Cell } from "./types/connect4.js";

const ROWS = 6;
const COLS = 7;

/**
 * Creates an empty Connect 4 board
 */
function createEmptyBoard(): Board {
  return Array(ROWS)
    .fill(null)
    .map(() => Array(COLS).fill("o"));
}

/**
 * Renders the board with emojis and column numbers
 */
function renderBoard(board: Board): void {
  console.log("\n  1 2 3 4 5 6 7");
  console.log("  ───────────────");

  for (let row = 0; row < ROWS; row++) {
    let line = "│ ";
    for (let col = 0; col < COLS; col++) {
      const cell = board[row][col];
      switch (cell) {
        case "r":
          line += "🔴 ";
          break;
        case "y":
          line += "🟡 ";
          break;
        default:
          line += "⚪ ";
      }
    }
    line += "│";
    console.log(line);
  }

  console.log("  ───────────────");
  console.log("  1 2 3 4 5 6 7\n");
}

/**
 * Gets user input for column selection
 */
async function getColumnInput(player: Cell): Promise<number> {
  const playerName = player === "r" ? "Red" : "Yellow";
  const playerEmoji = player === "r" ? "🔴" : "🟡";

  while (true) {
    const input = prompt(
      `${playerEmoji} ${playerName} player, choose a column (1-7): `
    );

    if (!input) {
      console.log("Please enter a column number.");
      continue;
    }

    const col = parseInt(input.trim());

    if (isNaN(col) || col < 1 || col > 7) {
      console.log("Please enter a number between 1 and 7.");
      continue;
    }

    return col - 1; // Convert to 0-based index
  }
}

/**
 * Main game loop
 */
async function playGame(board: Board = createEmptyBoard()): Promise<void> {
  let currentPlayer: Cell = "r";
  let gameOver = false;
  let winner: Cell | null = null;

  while (!gameOver) {
    // Render current board
    renderBoard(board);

    // Show current scores
    const scores = getPlayerScores(board);
    console.log(
      `📊 Position Scores: Red: ${scores.red}, Yellow: ${scores.yellow}`
    );

    // Get valid moves
    const validMoves = getValidMoves(board);

    // Get player input
    let col: number;
    do {
      col = await getColumnInput(currentPlayer);
      if (!validMoves.includes(col)) {
        console.log("❌ That column is full! Choose another column.");
      }
    } while (!validMoves.includes(col));

    // Make the move
    board = makeMove(board, col, currentPlayer);

    // Check for win or draw
    if (checkWin(board, currentPlayer)) {
      gameOver = true;
      winner = currentPlayer;
    } else if (isTerminal(board)) {
      gameOver = true;
      winner = null; // Draw
    } else {
      // Switch players
      currentPlayer = currentPlayer === "r" ? "y" : "r";
    }
  }

  // Game over - show final board and result
  renderBoard(board);

  if (winner) {
    const winnerName = winner === "r" ? "Red" : "Yellow";
    const winnerEmoji = winner === "r" ? "🔴" : "🟡";
    console.log(`🎉 ${winnerEmoji} ${winnerName} player wins!`);
  } else {
    console.log("🤝 It's a draw! The board is full.");
  }

  console.log("\nThanks for playing Connect 4!");
}

// Start the game
playGame().catch(console.error);
