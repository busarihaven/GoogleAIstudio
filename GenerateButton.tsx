
import React from 'react';
import { PlayIcon } from './icons';

interface GenerateButtonProps {
  onClick: () => void;
  isLoading: boolean;
}

const GenerateButton: React.FC<GenerateButtonProps> = ({ onClick, isLoading }) => {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className="inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-sky-600 rounded-lg shadow-md hover:bg-sky-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-sky-500"
    >
      <PlayIcon />
      {isLoading ? 'Generating...' : 'Generate & Play'}
    </button>
  );
};

export default GenerateButton;
