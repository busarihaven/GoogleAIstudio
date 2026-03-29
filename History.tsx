
import React, { useState, useEffect } from 'react';
import type { Dialogue } from '../App';
import { audioPlayer, createWavBlob, downloadAudio } from '../utils/audioUtils';
import { HistoryIcon, DownloadIcon, ZipIcon, PlayIcon, PauseIcon, StopIcon, RewindIcon, ForwardIcon, TrashIcon } from './icons';

interface HistoryItemProps {
  dialogue: Dialogue;
  onDelete: (id: number) => void;
}

const HistoryItem: React.FC<HistoryItemProps> = ({ dialogue, onDelete }) => {
  const [playbackState, setPlaybackState] = useState<'playing' | 'paused' | 'stopped'>('stopped');
  const [isThisAudio, setIsThisAudio] = useState(false);
  const [progress, setProgress] = useState({ currentTime: 0, duration: 0 });

  useEffect(() => {
    const unsubscribe = audioPlayer.onStateChange((state, audioId) => {
        const isCurrent = String(dialogue.id) === audioId;
        setIsThisAudio(isCurrent);
        if (isCurrent) {
            setPlaybackState(state);
        } else {
            setPlaybackState('stopped');
            setProgress({ currentTime: 0, duration: 0 });
        }
    });

    const unsubscribeProgress = audioPlayer.onProgress(newProgress => {
      if (String(dialogue.id) === audioPlayer.getCurrentAudioId()) {
          setProgress(newProgress);
      }
    });

    return () => {
        unsubscribe();
        unsubscribeProgress();
    };
  }, [dialogue.id]);
  
  const handlePlayPause = () => {
    if (playbackState === 'playing') {
      audioPlayer.pause();
    } else {
      audioPlayer.play(dialogue.audioData, String(dialogue.id));
    }
  };
  
  const handleStop = () => audioPlayer.stop();
  const handleRewind = () => audioPlayer.rewind(5);
  const handleForward = () => audioPlayer.forward(5);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setProgress(prev => ({ ...prev, currentTime: time }));
    audioPlayer.seekTo(time);
  };

  const formatTime = (seconds: number) => {
      if (isNaN(seconds) || seconds < 0) return '0:00';
      const minutes = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDownload = () => {
    const wavBlob = createWavBlob(dialogue.audioData);
    downloadAudio(wavBlob, `dialogue-${dialogue.id}.wav`);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this dialogue?')) {
        onDelete(dialogue.id);
    }
  };
  
  const isActive = isThisAudio && playbackState !== 'stopped';

  return (
    <div className="bg-slate-700/50 p-4 rounded-lg flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <pre className="whitespace-pre-wrap font-sans text-sm text-slate-300 w-full sm:w-3/5 overflow-auto max-h-24 bg-slate-900/50 p-2 rounded-md">
                {dialogue.script}
            </pre>
             {!isActive && (
                <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                    <button
                        onClick={handlePlayPause}
                        className="inline-flex items-center justify-center p-2 w-10 h-10 font-semibold text-white bg-sky-600 rounded-full shadow-md hover:bg-sky-500 transition-all duration-200 ease-in-out transform hover:scale-105"
                        aria-label="Play dialogue"
                    >
                        <PlayIcon />
                    </button>
                    <button
                        onClick={handleDownload}
                        className="inline-flex items-center justify-center p-2 w-10 h-10 font-semibold text-white bg-slate-600 rounded-full shadow-md hover:bg-slate-500 transition-all duration-200 ease-in-out transform hover:scale-105"
                        aria-label="Download dialogue"
                    >
                        <DownloadIcon />
                    </button>
                    <button
                        onClick={handleDelete}
                        className="inline-flex items-center justify-center p-2 w-10 h-10 font-semibold text-rose-400 bg-rose-900/50 rounded-full shadow-md hover:bg-rose-800/70 transition-all duration-200 ease-in-out transform hover:scale-105"
                        aria-label="Delete dialogue"
                    >
                        <TrashIcon />
                    </button>
                </div>
            )}
        </div>

        {isActive && (
             <div className="flex flex-col w-full border-t border-slate-600 pt-3 animate-fade-in">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                         <button onClick={handleRewind} className="p-2 text-white bg-slate-600/50 rounded-full hover:bg-slate-500/50 transition-colors" aria-label="Rewind 5 seconds"><RewindIcon /></button>
                         <button onClick={handlePlayPause} className="p-2 w-10 h-10 text-white bg-sky-600 rounded-full hover:bg-sky-500 transition-colors" aria-label={playbackState === 'playing' ? 'Pause' : 'Play'}>{playbackState === 'playing' ? <PauseIcon /> : <PlayIcon />}</button>
                         <button onClick={handleForward} className="p-2 text-white bg-slate-600/50 rounded-full hover:bg-slate-500/50 transition-colors" aria-label="Forward 5 seconds"><ForwardIcon /></button>
                         <button onClick={handleStop} className="p-2 text-white bg-rose-600 rounded-full hover:bg-rose-500 transition-colors" aria-label="Stop"><StopIcon /></button>
                    </div>
                     <div className="flex items-center gap-2">
                        <button
                            onClick={handleDownload}
                            className="inline-flex items-center justify-center p-2 w-10 h-10 font-semibold text-white bg-slate-600 rounded-full shadow-md hover:bg-slate-500 transition-all duration-200 ease-in-out transform hover:scale-105"
                            aria-label="Download dialogue"
                        >
                            <DownloadIcon />
                        </button>
                        <button
                            onClick={handleDelete}
                            className="inline-flex items-center justify-center p-2 w-10 h-10 font-semibold text-rose-400 bg-rose-900/50 rounded-full shadow-md hover:bg-rose-800/70 transition-all duration-200 ease-in-out transform hover:scale-105"
                            aria-label="Delete dialogue"
                        >
                            <TrashIcon />
                        </button>
                    </div>
                </div>
                 <div className="flex items-center gap-2 mt-2">
                     <span className="text-xs text-slate-400 w-10 text-center">{formatTime(progress.currentTime)}</span>
                     <input
                        type="range"
                        min="0"
                        max={progress.duration || 1}
                        value={progress.currentTime}
                        onInput={handleSeek}
                        className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer range-slider"
                    />
                     <span className="text-xs text-slate-400 w-10 text-center">{formatTime(progress.duration)}</span>
                 </div>
             </div>
        )}
        <style>{`
            @keyframes fade-in {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            .animate-fade-in {
                animation: fade-in 0.3s ease-out forwards;
            }
            .range-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 12px;
                height: 12px;
                background: #0ea5e9; /* sky-500 */
                border-radius: 50%;
                cursor: pointer;
            }
            .range-slider::-moz-range-thumb {
                width: 12px;
                height: 12px;
                background: #0ea5e9; /* sky-500 */
                border-radius: 50%;
                cursor: pointer;
            }
        `}</style>
    </div>
  );
};


interface HistoryProps {
    history: Dialogue[];
    onDownloadAll: () => void;
    isDownloadingAll: boolean;
    onDelete: (id: number) => void;
    onDeleteAll: () => void;
}

const History: React.FC<HistoryProps> = ({ history, onDownloadAll, isDownloadingAll, onDelete, onDeleteAll }) => {
    if (history.length === 0) {
        return null;
    }

    return (
        <div className="mt-8 bg-slate-800/50 rounded-xl shadow-lg ring-1 ring-white/10 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-3">
                    <HistoryIcon />
                    <h2 className="text-2xl font-bold text-white">Dialogue History</h2>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onDownloadAll}
                        disabled={isDownloadingAll || history.length === 0}
                        className="inline-flex mt-4 sm:mt-0 items-center justify-center gap-2 px-4 py-2 font-semibold text-white bg-indigo-600 rounded-lg shadow-md hover:bg-indigo-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all duration-200 ease-in-out transform hover:scale-105"
                    >
                        <ZipIcon />
                        {isDownloadingAll ? 'Zipping...' : 'Download All (.zip)'}
                    </button>
                    <button
                        onClick={onDeleteAll}
                        disabled={isDownloadingAll || history.length === 0}
                        className="inline-flex mt-4 sm:mt-0 items-center justify-center gap-2 px-4 py-2 font-semibold text-rose-300 bg-rose-900/60 rounded-lg shadow-md hover:bg-rose-800/80 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all duration-200 ease-in-out transform hover:scale-105"
                    >
                        <TrashIcon />
                        Delete All
                    </button>
                </div>
            </div>
            <div className="space-y-4">
                {history.map(dialogue => (
                    <HistoryItem key={dialogue.id} dialogue={dialogue} onDelete={onDelete} />
                ))}
            </div>
        </div>
    );
};

export default History;
