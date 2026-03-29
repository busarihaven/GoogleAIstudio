
import React from 'react';

interface ScriptInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const ScriptInput: React.FC<ScriptInputProps> = (props) => {
  return (
    <textarea
      {...props}
      rows={10}
      className="w-full bg-slate-900/70 border border-slate-700 rounded-lg p-4 text-slate-300 placeholder-slate-500 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
      placeholder="Enter your dialogue script here..."
    />
  );
};

export default ScriptInput;
