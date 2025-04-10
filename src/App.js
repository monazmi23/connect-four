import React, { useState, useEffect } from 'react';
import './App.css';
import Fireworks from './components/Fireworks';

const ROWS = 6;
const COLUMNS = 7;
const MAX_DEPTH = 10; // Increased from 8 to 10

const createBoard = () => Array(ROWS).fill(null).map(() => Array(COLUMNS).fill(null));

function App() {
  const [board, setBoard] = useState(createBoard());
  const [currentPlayer, setCurrentPlayer] = useState('🔴');
  const [winner, setWinner] = useState(null);
  const [vsComputer, setVsComputer] = useState(false);
  const [difficulty, setDifficulty] = useState('easy');
  const [gameStarted, setGameStarted] = useState(false);

  const dropDisc = (colIndex, player = currentPlayer) => {
    if (winner || !gameStarted) return false;

    const newBoard = [...board.map(row => [...row])];

    for (let row = ROWS - 1; row >= 0; row--) {
      if (!newBoard[row][colIndex]) {
        newBoard[row][colIndex] = player;
        setBoard(newBoard);
        checkWinner(newBoard, row, colIndex, player);
        setCurrentPlayer(prev => (prev === '🔴' ? '🟡' : '🔴'));
        return true;
      }
    }

    return false;
  };

  const checkWinner = (board, row, col, player) => {
    const directions = [
      [[0, 1], [0, -1]],
      [[1, 0], [-1, 0]],
      [[1, 1], [-1, -1]],
      [[1, -1], [-1, 1]]
    ];

    for (const [[dx1, dy1], [dx2, dy2]] of directions) {
      let count = 1;

      for (const [dx, dy] of [[dx1, dy1], [dx2, dy2]]) {
        let r = row + dx;
        let c = col + dy;
        while (r >= 0 && r < ROWS && c >= 0 && c < COLUMNS && board[r][c] === player) {
          count++;
          r += dx;
          c += dy;
        }
      }

      if (count >= 4) {
        setWinner(player);
        return;
      }
    }
  };

  const getValidColumns = (board) =>
    board[0].map((_, i) => i).filter(col => board[0][col] === null);

  const simulateDrop = (board, col, player) => {
    const newBoard = board.map(row => [...row]);
    for (let row = ROWS - 1; row >= 0; row--) {
      if (!newBoard[row][col]) {
        newBoard[row][col] = player;
        return [newBoard, row];
      }
    }
    return [null, -1];
  };

  const evaluateBoard = (board, player) => {
    const opponent = player === '🟡' ? '🔴' : '🟡';
    let score = 0;

    // Heavily weight center control
    const centerColumn = board.map(row => row[Math.floor(COLUMNS / 2)]);
    const centerCount = centerColumn.filter(cell => cell === player).length;
    score += centerCount * 15;  // Increased weight for center control

    const evaluateLine = (line, isHorizontal = false) => {
      const playerCount = line.filter(cell => cell === player).length;
      const oppCount = line.filter(cell => cell === opponent).length;
      const emptyCount = line.filter(cell => !cell).length;

      // Immediate threats
      if (oppCount === 4) return -1000000;  // Opponent win
      if (playerCount === 4) return 1000000;  // Player win
      
      // Critical defensive situations
      if (oppCount === 3 && emptyCount === 1) return -50000;  // Must block
      if (oppCount === 2 && emptyCount === 2) {
        // Check if it's a potential double threat
        if (isHorizontal) return -8000;  // Horizontal threats are more dangerous
        return -5000;
      }

      // Offensive opportunities
      if (playerCount === 3 && emptyCount === 1) return 15000;
      if (playerCount === 2 && emptyCount === 2) return 1000;

      // General position evaluation
      return (playerCount * 10) - (oppCount * 15);
    };

    // Evaluate horizontal lines (most important)
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLUMNS - 3; c++) {
        const line = [board[r][c], board[r][c+1], board[r][c+2], board[r][c+3]];
        score += evaluateLine(line, true);
      }
    }

    // Evaluate vertical lines
    for (let r = 0; r < ROWS - 3; r++) {
      for (let c = 0; c < COLUMNS; c++) {
        const line = [board[r][c], board[r+1][c], board[r+2][c], board[r+3][c]];
        score += evaluateLine(line);
      }
    }

    // Evaluate diagonal lines
    for (let r = 0; r < ROWS - 3; r++) {
      for (let c = 0; c < COLUMNS - 3; c++) {
        const line1 = [board[r][c], board[r+1][c+1], board[r+2][c+2], board[r+3][c+3]];
        score += evaluateLine(line1);
      }
    }

    for (let r = 3; r < ROWS; r++) {
      for (let c = 0; c < COLUMNS - 3; c++) {
        const line = [board[r][c], board[r-1][c+1], board[r-2][c+2], board[r-3][c+3]];
        score += evaluateLine(line);
      }
    }

    // Evaluate potential threats
    for (let c = 0; c < COLUMNS; c++) {
      for (let r = ROWS - 1; r >= 0; r--) {
        if (!board[r][c]) {
          // Simulate dropping a piece here
          const tempBoard = board.map(row => [...row]);
          tempBoard[r][c] = opponent;
          
          // Check if this creates a threat
          if (checkWinAt(tempBoard, r, c, opponent)) {
            score -= 20000;  // Heavily penalize allowing opponent threats
          }
          break;
        }
      }
    }

    return score;
  };

  const isTerminal = (board) => {
    return winner || getValidColumns(board).length === 0;
  };

  const minimax = (board, depth, alpha, beta, maximizingPlayer, isRoot = true) => {
    const validColumns = getValidColumns(board);
    
    if (isRoot) {
      // Check for immediate win
      const winningMove = findWinningMove('🟡');
      if (winningMove !== null) return [winningMove, 1000000];
      
      // Check for immediate block
      const blockingMove = findWinningMove('🔴');
      if (blockingMove !== null) return [blockingMove, 500000];
    }

    if (depth === 0 || validColumns.length === 0) {
      return [null, evaluateBoard(board, '🟡')];
    }

    // Sort moves for better pruning
    const moves = validColumns.map(col => {
      const [newBoard] = simulateDrop(board, col, maximizingPlayer ? '🟡' : '🔴');
      const score = evaluateBoard(newBoard, '🟡');
      return { col, score };
    });

    moves.sort((a, b) => maximizingPlayer ? b.score - a.score : a.score - b.score);

    let bestCol = moves[0].col;
    if (maximizingPlayer) {
      let value = -Infinity;
      for (const {col} of moves) {
        const [newBoard] = simulateDrop(board, col, '🟡');
        const [, newScore] = minimax(newBoard, depth - 1, alpha, beta, false, false);
        if (newScore > value) {
          value = newScore;
          bestCol = col;
        }
        alpha = Math.max(alpha, value);
        if (alpha >= beta) break;
      }
      return [bestCol, value];
    } else {
      let value = Infinity;
      for (const {col} of moves) {
        const [newBoard] = simulateDrop(board, col, '🔴');
        const [, newScore] = minimax(newBoard, depth - 1, alpha, beta, true, false);
        if (newScore < value) {
          value = newScore;
          bestCol = col;
        }
        beta = Math.min(beta, value);
        if (alpha >= beta) break;
      }
      return [bestCol, value];
    }
  };

  const findWinningMove = (player) => {
    // First check for immediate wins
    for (const col of getValidColumns(board)) {
      const [tempBoard, row] = simulateDrop(board, col, player);
      if (row >= 0 && checkWinAt(tempBoard, row, col, player)) {
        return col;
      }
    }

    // Then check for opponent's winning moves to block
    const opponent = player === '🔴' ? '🟡' : '🔴';
    for (const col of getValidColumns(board)) {
      const [tempBoard, row] = simulateDrop(board, col, opponent);
      if (row >= 0 && checkWinAt(tempBoard, row, col, opponent)) {
        return col;
      }
    }

    // Check for double threats
    for (const col of getValidColumns(board)) {
      const [tempBoard, row] = simulateDrop(board, col, player);
      if (row >= 0) {
        let threatCount = 0;
        // Check each possible next move
        for (let nextCol = 0; nextCol < COLUMNS; nextCol++) {
          const [nextBoard, nextRow] = simulateDrop(tempBoard, nextCol, player);
          if (nextRow >= 0 && checkWinAt(nextBoard, nextRow, nextCol, player)) {
            threatCount++;
            if (threatCount > 1) return col; // Found a double threat
          }
        }
      }
    }

    return null;
  };

  const checkWinAt = (board, row, col, player) => {
    const directions = [
      [[0, 1], [0, -1]],
      [[1, 0], [-1, 0]],
      [[1, 1], [-1, -1]],
      [[1, -1], [-1, 1]]
    ];

    for (const [[dx1, dy1], [dx2, dy2]] of directions) {
      let count = 1;
      for (const [dx, dy] of [[dx1, dy1], [dx2, dy2]]) {
        let r = row + dx;
        let c = col + dy;
        while (r >= 0 && r < ROWS && c >= 0 && c < COLUMNS && board[r][c] === player) {
          count++;
          r += dx;
          c += dy;
        }
      }
      if (count >= 4) return true;
    }
    return false;
  };

  const computerMove = () => {
    if (winner || currentPlayer !== '🟡') return;

    const validCols = getValidColumns(board);
    let chosenCol;

    if (difficulty === 'easy') {
      chosenCol = validCols[Math.floor(Math.random() * validCols.length)];
    } else if (difficulty === 'medium') {
      chosenCol = findWinningMove('🟡') ?? findWinningMove('🔴') ?? validCols[Math.floor(Math.random() * validCols.length)];
    } else {
      // Hard mode - use enhanced minimax
      const [bestCol] = minimax(board, MAX_DEPTH, -Infinity, Infinity, true);
      chosenCol = bestCol;
    }

    if (chosenCol !== null) {
      dropDisc(chosenCol, '🟡');
    }
  };

  useEffect(() => {
    if (vsComputer && currentPlayer === '🟡' && !winner) {
      setTimeout(computerMove, 300);
    }
  }, [board, currentPlayer, vsComputer, winner]);

  const resetGame = () => {
    setBoard(createBoard());
    setCurrentPlayer('🔴');
    setWinner(null);
    setGameStarted(false);
  };

  const startGame = (vsAI) => {
    resetGame();
    setVsComputer(vsAI);
    if (!vsAI) setGameStarted(true);
  };

  return (
    <div className="App">
      {winner && <Fireworks />}
      <h1>4 in a Row</h1>

      {!gameStarted ? (
        <div>
          <h2>Choose Game Mode</h2>
          <button onClick={() => startGame(false)}>Player vs Player</button>
          <button onClick={() => startGame(true)}>Player vs Computer</button>
          {vsComputer && (
            <>
              <h3>Select Difficulty:</h3>
              <select value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                <option value="easy">Easy 🟢</option>
                <option value="medium">Medium 🔵</option>
                <option value="hard">Hard 🔴 (Minimax)</option>
              </select>
              <br />
              <button onClick={() => setGameStarted(true)}>Start Game</button>
            </>
          )}
        </div>
      ) : (
        <>
          {winner ? (
            <h2 className="winner-text">
              {winner} wins!
            </h2>
          ) : (
            <h2>Current Player: {currentPlayer}</h2>
          )}

          <div className="board">
  {board.map((row, rowIndex) => (
    <div className="row" key={rowIndex}>
      {row.map((cell, colIndex) => (
        <div
          className="cell"
          key={colIndex}
          onClick={() => {
            if (!winner && (!vsComputer || currentPlayer === '🔴')) {
              dropDisc(colIndex);
            }
          }}
        >
          {cell && (
            <div className={`disc ${cell === '🔴' ? 'red' : 'yellow'}`}></div>
          )}
        </div>
      ))}
    </div>
  ))}
</div>

          <button onClick={resetGame}>Reset Game</button>
        </>
      )}
    </div>
  );
}

export default App;



