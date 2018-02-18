import { CELL_HEIGHT, CELL_WIDTH } from '../config';

let boardHeight;
let boardWidth;
let numberOfRows;
let numberOfColumns;

const dehighlightAll = (cells) => {
  cells.forEach(row => row.forEach((cell) => {
    if (cell) {
      cell.highlighted = false;
    }
  }));
};

const deselectAll = (cells) => {
  cells.forEach(row => row.forEach((cell) => {
    if (cell) {
      cell.selected = false;
    }
  }));
};

const emptyAll = (cells) => {
  cells.map(row =>
    row.forEach((column) => {
      if (column) {
        column.text = '';
      }
    }));
};

/* eslint-disable no-confusing-arrow */
const toggleDirection = direction => direction === 'across' ? 'down' : 'across';
/* eslint-enable no-confusing-arrow */

const fillCell = ({ cells, row, column, index, number, id, direction, text, hasTurn }) => {
  cells[row][column] = {
    ...cells[row][column],
    text,
    number: index === 0 ? number : cells[row][column] && cells[row][column].number,
    row,
    column,
  };

  if (cells[row][column] && cells[row][column][direction]) {
    if (hasTurn && index >= hasTurn) {
      cells[row][column][direction] = [...cells[row][column][direction], id];
    } else {
      cells[row][column][direction] = [id, ...cells[row][column][direction]];
    }
  } else {
    cells[row][column][direction] = [id];
  }
};

const createCrossword = () => new Promise((resolve, reject) =>
  fetch(process.env.REACT_APP_API_URL)
    .then(response => response.json())
    .then(({ crosswordData }) => {
      numberOfColumns = crosswordData.size.width;
      numberOfRows = crosswordData.size.height;
      const separators = [];

      const cells = Array(numberOfRows).fill()
        .map(() => Array(numberOfColumns).fill());

      const userData = JSON.parse(localStorage.getItem('kryzz') || 'null');

      crosswordData.entries.forEach(({ id, direction, position, length, number, separatorLocations, turns }) => {
        let column = position.x;
        let row = position.y;
        let walkingDirection = direction;
        let turnIndex = 0;

        Array(length)
          .fill()
          .forEach((_, i) => {
            const text = userData && userData[row][column];
            fillCell({ cells, row, column, index: i, number, id, direction, text, hasTurn: turns });

            if (turns && turns.length && turns[turnIndex] - 1 === i) {
              walkingDirection = toggleDirection(walkingDirection);
              turnIndex += 1;
            }

            if (walkingDirection === 'across') {
              column += 1;
            } else {
              row += 1;
            }
          });

        Object.entries(separatorLocations).forEach(([separator, locations]) => {
          if (locations && locations.length) {
            separators.push({ direction, position, separator, locations, id });
          }
        });
      });

      const inputWidth = 100 / numberOfColumns;
      const inputHeight = 100 / numberOfRows;
      boardWidth = (CELL_WIDTH * numberOfColumns) + numberOfColumns + 1 || 0;
      boardHeight = (CELL_HEIGHT * numberOfRows) + numberOfRows + 1 || 0;
      resolve({ cells, separators, numberOfColumns, numberOfRows, boardWidth, boardHeight, inputWidth, inputHeight });
    })
    .catch(e => reject(e)));

const getInputPosition = ({ row = 0, column = 0 }) => {
  const top = (row / numberOfRows) * 100 || 0; // (((row * CELL_HEIGHT) + 2) / boardHeight) * 100 || 0;
  const left = (column / numberOfColumns) * 100 || 0;

  return { left, top };
};

const isValidKey = key => key.match(/^[a-zåäö]{1}$/i) || key === 'Backspace';

const isIgnorableKey = key => key === 'Tab' || !isValidKey(key);

const getCurrentId = (({ currentCell, direction, selection }) => {
  let id;
  if (selection && currentCell && currentCell[direction] && currentCell[direction].includes(selection)) {
    id = selection;
  } else {
    id = currentCell[direction] && currentCell[direction][0];
  }
  /* if (!id) {
    direction = toggleDirection(direction);
    [id] = currentCell[direction];
  } */
  return id;
});

const highlightId = ({ cells, direction, id, currentCell }) => {
  deselectAll(cells);
  dehighlightAll(cells);
  currentCell.selected = true;

  cells
    .map(row =>
      row.forEach((cell) => {
        if (cell && cell[direction] && cell[direction].includes(id)) {
          cell.highlighted = true;
        }
      }));
};

const cellIsStartingWord = ({ cell, direction }) =>
  cell && cell[direction] && cell[direction].find(id => id.startsWith(cell.number));


const cellContainsOtherDirection = ({ currentCell, direction }) =>
  (direction === 'across' && currentCell.down) || (direction === 'down' && currentCell.across);


export { createCrossword, cellContainsOtherDirection, cellIsStartingWord, deselectAll, emptyAll, getInputPosition, getCurrentId, highlightId, isIgnorableKey, toggleDirection };
