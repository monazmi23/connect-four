import React, { useState, useEffect } from 'react';
import './App.css';
import Fireworks from './components/Fireworks';

const ROWS = 6;
const COLUMNS = 7;
const MAX_DEPTH = 4;

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

    const centerColumn = board.map(row => row[Math.floor(COLUMNS / 2)]);
    const centerCount = centerColumn.filter(cell => cell === player).length;
    score += centerCount * 3;

    const evaluateLine = (line) => {
      const playerCount = line.filter(cell => cell === player).length;
      const oppCount = line.filter(cell => cell === opponent).length;
      const emptyCount = line.filter(cell => !cell).length;

      if (playerCount === 4) return 100;
      if (playerCount === 3 && emptyCount === 1) return 5;
      if (playerCount === 2 && emptyCount === 2) return 2;
      if (oppCount === 3 && emptyCount === 1) return -4;
      return 0;
    };

    const lines = [];

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLUMNS - 3; c++) {
        lines.push([board[r][c], board[r][c+1], board[r][c+2], board[r][c+3]]);
      }
    }

    for (let r = 0; r < ROWS - 3; r++) {
      for (let c = 0; c < COLUMNS; c++) {
        lines.push([board[r][c], board[r+1][c], board[r+2][c], board[r+3][c]]);
      }
    }

    for (let r = 0; r < ROWS - 3; r++) {
      for (let c = 0; c < COLUMNS - 3; c++) {
        lines.push([board[r][c], board[r+1][c+1], board[r+2][c+2], board[r+3][c+3]]);
      }
    }

    for (let r = 3; r < ROWS; r++) {
      for (let c = 0; c < COLUMNS - 3; c++) {
        lines.push([board[r][c], board[r-1][c+1], board[r-2][c+2], board[r-3][c+3]]);
      }
    }

    for (const line of lines) {
      score += evaluateLine(line);
    }

    return score;
  };

  const isTerminal = (board) => {
    return winner || getValidColumns(board).length === 0;
  };

  const minimax = (board, depth, alpha, beta, maximizingPlayer) => {
    const validColumns = getValidColumns(board);
    const isOver = isTerminal(board) || depth === 0;

    if (isOver) {
      return [null, evaluateBoard(board, '🟡')];
    }

    let bestCol = validColumns[0];

    if (maximizingPlayer) {
      let value = -Infinity;
      for (const col of validColumns) {
        const [newBoard] = simulateDrop(board, col, '🟡');
        const [, newScore] = minimax(newBoard, depth - 1, alpha, beta, false);
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
      for (const col of validColumns) {
        const [newBoard] = simulateDrop(board, col, '🔴');
        const [, newScore] = minimax(newBoard, depth - 1, alpha, beta, true);
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
    for (const col of getValidColumns(board)) {
      const [tempBoard, row] = simulateDrop(board, col, player);
      if (row >= 0) {
        const tempWinner = checkWinAt(tempBoard, row, col, player);
        if (tempWinner) return col;
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
      const [bestCol] = minimax(board, MAX_DEPTH, -Infinity, Infinity, true);
      chosenCol = bestCol ?? validCols[Math.floor(Math.random() * validCols.length)];
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



