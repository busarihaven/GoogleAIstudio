import React, { useState, useEffect } from 'react';
import { audioPlayer } from '../utils/audioUtils';
import type { Dialogue } from '../App';
import { PlayIcon, PauseIcon, StopIcon, RewindIcon, ForwardIcon } from './icons';

interface PlaybackControlsProps {
  dialogue: Dialogue | null;
}

const PlaybackControls: React.FC<PlaybackControlsProps> = ({ dialogue }) => {
  const [playbackState, setPlaybackState] = useState<'playing' | 'paused' | 'stopped'>('stopped');
  const [isThisAudio, setIsThisAudio] = useState(false);
  const [progress, setProgress] = useState({ currentTime: 0, duration: 0 });

  useEffect(() => {
    const unsubscribeState = audioPlayer.onStateChange((state, audioId) => {
      const isCurrent = dialogue ? String(dialogue.id) === audioId : false;
      setIsThisAudio(isCurrent);

      if (isCurrent) {
        setPlaybackState(state);
      } else {
        setPlaybackState('stopped');
        setProgress({ currentTime: 0, duration: 0 });
      }
    });

    const unsubscribeProgress = audioPlayer.onProgress(newProgress => {
      if (dialogue && String(dialogue.id) === audioPlayer.getCurrentAudioId()) {
          setProgress(newProgress);
      }
    });

    return () => {
        unsubscribeState();
        unsubscribeProgress();
    };
  }, [dialogue]);
  
  const handlePlayPause = () => {
    if (!dialogue) return;
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

  if (!dialogue || !isThisAudio) {
    return null;
  }

  return (
      <div className="mt-6 flex flex-col items-center justify-center gap-3 bg-slate-700/50 p-4 rounded-lg animate-fade-in">
          <p className="text-sm font-semibold text-slate-300">Now Playing: Latest Dialogue</p>
          <div className="flex items-center gap-4">
              <button onClick={handleRewind} disabled={playbackState === 'stopped'} className="p-2 text-white bg-slate-600/50 rounded-full hover:bg-slate-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Rewind 5 seconds"><RewindIcon /></button>
              <button onClick={handlePlayPause} className="p-2 w-12 h-12 text-white bg-sky-600 rounded-full hover:bg-sky-500 transition-colors" aria-label={playbackState === 'playing' ? 'Pause' : 'Play'}>{playbackState === 'playing' ? <PauseIcon /> : <PlayIcon />}</button>
              <button onClick={handleForward} disabled={playbackState === 'stopped'} className="p-2 text-white bg-slate-600/50 rounded-full hover:bg-slate-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Forward 5 seconds"><ForwardIcon /></button>
              <button onClick={handleStop} disabled={playbackState === 'stopped'} className="p-2 text-white bg-rose-600 rounded-full hover:bg-rose-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Stop"><StopIcon /></button>
          </div>
          <div className="flex items-center gap-2 mt-2 w-full max-w-sm">
            <span className="text-xs text-slate-400 w-10 text-center">{formatTime(progress.currentTime)}</span>
            <input
                type="range"
                min="0"
                max={progress.duration || 1}
                value={progress.currentTime}
                onInput={handleSeek}
                disabled={playbackState === 'stopped'}
                className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer range-slider disabled:bg-slate-800"
            />
            <span className="text-xs text-slate-400 w-10 text-center">{formatTime(progress.duration)}</span>
          </div>
          <style>{`
            @keyframes fade-in {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
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
                margin-top: -5px;
            }
            .range-slider:disabled::-webkit-slider-thumb {
                background: #475569; /* slate-600 */
                cursor: not-allowed;
            }
            .range-slider::-moz-range-thumb {
                width: 12px;
                height: 12px;
                background: #0ea5e9; /* sky-500 */
                border-radius: 50%;
                cursor: pointer;
            }
            .range-slider:disabled::-moz-range-thumb {
                background: #475569; /* slate-600 */
                cursor: not-allowed;
            }
          `}</style>
      </div>
  );
};

export default PlaybackControls;