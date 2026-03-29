
import React from 'react';
import { MicrophoneIcon } from './icons';

const Header: React.FC = () => {
  return (
    <header className="text-center">
      <div className="inline-flex items-center justify-center bg-slate-700/50 rounded-full p-3 mb-4 ring-1 ring-slate-600">
        <MicrophoneIcon />
      </div>
      <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
        Deep Dialogue Generator
      </h1>
      <p className="mt-3 text-lg text-slate-400 max-w-2xl mx-auto">
        Craft thought-provoking dialogues for your video content. Perfect for exploring complex ideas in philosophy, psychology, and more.
      </p>
    </header>
  );
};

export default Header;