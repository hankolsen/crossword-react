/* eslint-disable no-param-reassign */
import React from 'react';
import './Crossword.css';
import { CELL_HEIGHT, CELL_WIDTH } from '../config';
import Separators from '../Separators/Separators';
import Cells from '../Cells/Cells';
import CellInput from '../Cells/CellInput';

class Crossword extends React.Component {


  static dehighlightAll(cells) {
    cells.forEach(row => row.forEach((cell) => {
      if (cell) {
        cell.highlighted = false;
      }
    }));
  }

  static deselectAll(cells) {
    cells.forEach(row => row.forEach((cell) => {
      if (cell) {
        cell.selected = false;
      }
    }));
  }

  static fillCell({ cells, row, column, index, number, id, direction, text }) {
    cells[row][column] = {
      ...cells[row][column],
      text,
      number: index === 0 ? number : cells[row][column] && cells[row][column].number,
      [direction]: id,
    };
  }


  static isIgnorableKey(key) {
    return key === 'Tab' || (!Crossword.isValidKey(key) && key !== 'Backspace');
  }

  static isValidKey(key) {
    return key.match(/^[a-zåäö]{1}$/i);
  }

  static reset() {
    localStorage.removeItem('kryzz');
    window.location.reload();
  }

  static toggleDirection(direction) {
    return direction === 'across' ? 'down' : 'across';
  }


  constructor(props) {
    super(props);

    this.separators = [];

    this.state = {
      isLoading: true,
      direction: 'across',
      top: -100,
      left: -100,
    };

    this.clickHandler = this.clickHandler.bind(this);
    this.keyDownHandler = this.keyDownHandler.bind(this);
    this.keyUpHandler = this.keyUpHandler.bind(this);
    this.inputClickHandler = this.inputClickHandler.bind(this);
  }

  componentDidMount() {
    this.createBoard();
  }


  getInputPosition(row, column) {
    const top = ((row / this.boardHeight) * 100) - (row / this.boardHeight / 10);
    const left = (column / this.boardWidth) * 100;
    return { left, top };
  }

  createBoard() {

    fetch('/api/crossword')
      .then(response => response.json())
      .then(({ crosswordData }) => {
        this.boardWidth = crosswordData.size.width;
        this.boardHeight = crosswordData.size.height;
        const cells = Array(this.boardHeight)
          .fill()
          .map(() => Array(this.boardWidth).fill());

        const data = JSON.parse(localStorage.getItem('kryzz') || 'null');

        crosswordData.entries.forEach(({ id, direction, position, length, number, separatorLocations }) => {
          if (direction === 'across') {
            const row = position.y;
            Array(length)
              .fill()
              .map((_, i) => position.x + i)
              .map((column, index) =>
                Crossword.fillCell({ cells, row, column, index, number, id, direction, text: data && data[row][column] }));
          } else {
            const column = position.x;
            Array(length)
              .fill()
              .map((_, i) => position.y + i)
              .map((row, index) =>
                Crossword.fillCell({ cells, row, column, index, number, id, direction, text: data && data[row][column] }));
          }
          Object.entries(separatorLocations).forEach(([separator, locations]) => {
            if (locations && locations.length) {
              this.separators.push({ direction, position, separator, locations, id });
            }
          });
        });

        const isLoading = false;
        this.setState({ cells, isLoading });
      });
  }

  clickHandler(event, row, column) {
    let { direction } = this.state;
    const cells = Object.assign([], this.state.cells);
    const currentCell = cells[row][column];
    if (currentCell.number && !currentCell.highlighted) {
      const regexp = new RegExp(new RegExp(`${currentCell.number}-`));
      const [across, down] = [currentCell.across, currentCell.down].map(dir => dir && dir.match(regexp)) || [];
      if (direction === 'down' && !down) {
        direction = 'across';
      } else if (direction === 'across' && !across) {
        direction = 'down';
      }
    }
    if (currentCell.selected) {
      direction = Crossword.toggleDirection(direction);
    }
    direction = this.highlightCurrentSelection({ direction, currentCell });

    const { left, top } = this.getInputPosition(row, column);

    this.cellInput.focus();

    this.setState({ cells, direction, top, left, currentCell, row, column });
  }

  highlightCurrentSelection({ direction, currentCell }) {
    const { cells } = this.state;
    let id = currentCell[direction];
    this.cellInput.focus();
    Crossword.deselectAll(cells);
    Crossword.dehighlightAll(cells);
    currentCell.selected = true;
    if (!id) {
      direction = Crossword.toggleDirection(direction);
      id = currentCell[direction];
    }
    if (id) {
      if (direction === 'across') {
        cells
          .map(row => row.filter(cell => cell && cell[direction] === id))
          .filter(arr => arr.length)[0].forEach((cell) => {
            cell.highlighted = true;
          });
      } else {
        cells
          .map(row => row.filter(cell => cell && cell[direction] === id))
          .filter(arr => arr.length).forEach((arr) => {
            arr[0].highlighted = true;
          });
      }
    }
    return direction;
  }

  inputClickHandler() {
    let { direction } = this.state;
    const { currentCell } = this.state;
    direction = Crossword.toggleDirection(direction);
    direction = this.highlightCurrentSelection({ direction, currentCell });
    this.setState({ direction });
  }

  keyUpHandler() {
    // Prevent auto repeat
    this.down = false;
  }

  handleArrowMove({ arrow, direction }) {
    if ((direction === 'down' && arrow === 'Up') || (direction === 'across' && arrow === 'Left')) {
      this.moveToPrevious();
    } if ((direction === 'down' && arrow === 'Down') || (direction === 'across' && arrow === 'Right')) {
      this.moveToNext();
    }
  }

  keyDownHandler(event) {
    if (event.key === 'Shift') {
      return;
    }
    // Prevent auto repeat
    if (this.down) {
      return;
    }
    this.down = true;

    const { key } = event;

    if (event.metaKey) {
      return;
    }

    // Is it an arrow key?
    const [, arrow] = key.match(/Arrow(\w+)$/) || [];

    let { direction } = this.state;
    const { currentCell } = this.state;

    if (arrow) {
      if (direction === 'across' && (arrow === 'Up' || arrow === 'Down')) {
        direction = Crossword.toggleDirection(direction);
        direction = this.highlightCurrentSelection({ direction, currentCell });
        this.setState({ direction }, () => {
          this.handleArrowMove({ arrow, direction });
        });
      } else if (direction === 'down' && (arrow === 'Left' || arrow === 'Right')) {
        direction = Crossword.toggleDirection(direction);
        direction = this.highlightCurrentSelection({ direction, currentCell });
        this.setState({ direction }, () => {
          this.handleArrowMove({ arrow, direction });
        });
      } else {
        this.handleArrowMove({ arrow, direction });
      }
    }

    if (Crossword.isIgnorableKey(key)) {
      event.preventDefault();
      return;
    }

    // Ignore Shift key press, all non alfa characters, unless it is tab or backspace
    if ((!key.match(/^[a-zåäö]{1}$/i) && key !== 'Tab' && key !== 'Backspace' && !arrow)) {
      return;
    }


    if (key === 'Backspace') {
      if (currentCell.text) {
        currentCell.text = '';
        this.setState({ currentCell });
      } else {
        this.moveToPrevious();
      }
    } else {
      currentCell.text = event.key.toUpperCase();
      this.setState({ currentCell });
      this.moveToNext();
    }

    const entries = this.state.cells.map(row => row.map(cell => cell && cell.text));
    localStorage.setItem('kryzz', JSON.stringify(entries));

  }

  moveToPrevious() {
    this.moveToNext(-1);
  }


  moveToNext(dir = 1) {
    const { direction, cells } = this.state;
    let { currentCell, row, column } = this.state;
    if (direction === 'across') {
      column += dir;
    } else {
      row += dir;
      row = Math.max(0, Math.min(row, this.boardHeight - 1));
    }

    currentCell = cells[row][column];
    if (currentCell) {
      Crossword.deselectAll(cells);
      currentCell.selected = true;
      const { left, top } = this.getInputPosition(row, column);
      this.setState({ row, column, currentCell, cells, top, left });
      this.cellInput.focus();
    }

  }


  render() {

    const rectWidth = (CELL_WIDTH * this.boardWidth) + this.boardWidth + 1 || 0;
    const rectHeight = (CELL_HEIGHT * this.boardHeight) + this.boardHeight + 1 || 0;
    const inputWidth = `${100 / this.boardWidth}%`;
    const inputHeight = `${100 / this.boardWidth}%`;
    const { cells, top, left, isLoading } = this.state;

    return (
      <div className="crossword">
        <div className="crossword-container">
          <div className={`crossword-board ${isLoading ? 'hidden' : ''}`}>
            <svg className="crossword__grid" viewBox={`0 0 ${rectWidth} ${rectHeight}`}>
              <rect x="0" y="0" width={rectWidth} height={rectHeight} className="crossword__grid-background" />
              { cells && <Cells cells={cells} clickHandler={this.clickHandler} /> }
              <Separators separators={this.separators} />
            </svg>
            <CellInput
              top={top}
              left={left}
              width={inputWidth}
              height={inputHeight}
              keyDownHandler={this.keyDownHandler}
              keyUpHandler={this.keyUpHandler}
              clickHandler={this.inputClickHandler}
              ref={(input) => { this.cellInput = input; }}
            />
          </div>
          <div className={`loading-message ${isLoading ? '' : 'hidden'}`}>Loading&hellip;</div>
        </div>
        <button onClick={Crossword.reset} className={isLoading ? 'hidden' : ''}>Reset</button>
      </div>
    );
  }
}

export default Crossword;