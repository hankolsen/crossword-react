import React from 'react';
import LoadingIndicator from '../LoadingIndicator/LoadingIndicator';
import CrosswordBoard from './CrosswordBoard';
import { useCrossword } from './CrosswordContext';

import './Crossword.css';
import ResetButton from './ResetButton';

const Crossword = () => {
  const { isLoading, name, error } = useCrossword();

  if (error) {
    return (
      <div>
        <h1>{error.message}</h1>
      </div>
    );
  }
  if (isLoading) {
    return (
      <div className="crossword">
        <h3>Loading crossword</h3>
        <LoadingIndicator />
      </div>
    );
  }

  return (
    <div className="crossword">
      <h3>{name}</h3>
      <div className="crossword-container">
        <CrosswordBoard />
      </div>
      <ResetButton />
    </div>
  );
};

export default Crossword;
