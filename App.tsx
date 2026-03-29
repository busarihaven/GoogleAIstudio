
import React, { useState, useCallback } from 'react';
import { generateDialogueAudio } from './services/geminiService';
import { audioPlayer, createWavBlob, downloadAudio } from './utils/audioUtils';
import Header from './components/Header';
import ScriptInput from './components/ScriptInput';
import GenerateButton from './components/GenerateButton';
import Loader from './components/Loader';
import History from './components/History';
import PlaybackControls from './components/PlaybackControls';
import { Status, SpeakerIcon } from './components/icons';

declare var JSZip: any;

export interface Dialogue {
  id: number;
  script: string;
  audioData: string;
  type?: 'hook' | 'summary';
}

const App: React.FC = () => {
  const defaultScript = `Global markets rallied today as major tech earnings exceeded expectations, pushing the S&P 500 to a new record high. 
Meanwhile, in environmental news, a new study published in Nature suggests that reforestation efforts in the Amazon are showing faster-than-expected results.
Source: https://www.bloomberg.com/news and Nature Journal.`;

  const [script, setScript] = useState<string>(defaultScript);
  const [scriptType, setScriptType] = useState<'hook' | 'summary'>('hook');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('Ready to generate audio.');
  const [error, setError] = useState<string | null>(null);
  const [dialogueHistory, setDialogueHistory] = useState<Dialogue[]>([]);
  const [latestDialogue, setLatestDialogue] = useState<Dialogue | null>(null);
  
  // Single speaker voice
  const primaryVoice = 'Enceladus';

  const handleGenerate = useCallback(async () => {
    if (!script.trim() || isLoading) return;

    audioPlayer.stop(); // Stop any currently playing audio
    setIsLoading(true);
    setError(null);
    setLatestDialogue(null);
    setStatusMessage('Polishing script...');

    try {
      if (!script.trim()) {
          throw new Error("Script is empty or contains only whitespace.");
      }
      
      const typeLabel = scriptType === 'hook' ? 'Viral Teaser' : 'Full Summary';
      setStatusMessage(`Crafting ${typeLabel} with Enceladus... (This may take a moment)`);
      
      // Pass the script directly; the service will handle enhancement
      const { audioData, enhancedScript } = await generateDialogueAudio(
          script, 
          primaryVoice,
          scriptType
      );

      if (audioData) {
        setStatusMessage('Generation complete.');
        const newDialogue: Dialogue = {
          id: Date.now(),
          script: enhancedScript,
          audioData,
          type: scriptType
        };
        setDialogueHistory(prev => [newDialogue, ...prev]);
        setLatestDialogue(newDialogue);
        audioPlayer.play(audioData, String(newDialogue.id));
      } else {
        throw new Error('Received no audio data from the service.');
      }
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to generate audio. Please check your script and try again. Error: ${errorMessage}`);
      setStatusMessage('An error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [script, isLoading, primaryVoice, scriptType]);

  const handleDownloadAll = useCallback(async () => {
    if (dialogueHistory.length === 0 || isDownloadingAll) return;

    setIsDownloadingAll(true);
    setStatusMessage('Preparing zip file...');
    try {
      const zip = new JSZip();
      dialogueHistory.forEach(dialogue => {
        const wavBlob = createWavBlob(dialogue.audioData);
        const prefix = dialogue.type ? dialogue.type : 'audio';
        zip.file(`${prefix}-${dialogue.id}.wav`, wavBlob);
        // Also save the transcript since it might be different from the original input
        zip.file(`${prefix}-${dialogue.id}.txt`, dialogue.script);
      });
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadAudio(zipBlob, 'sarcastic-briefings.zip');
      setStatusMessage('Zip file downloaded.');
    } catch (err) {
        console.error("Failed to create zip file", err);
        setError("Could not generate the zip file. Please try again.");
    } finally {
        setIsDownloadingAll(false);
    }
  }, [dialogueHistory, isDownloadingAll]);

  const handleDeleteDialogue = useCallback((idToDelete: number) => {
    if (audioPlayer.getCurrentAudioId() === String(idToDelete)) {
        audioPlayer.stop();
    }
    if (latestDialogue?.id === idToDelete) {
        setLatestDialogue(null);
    }
    setDialogueHistory(prev => prev.filter(dialogue => dialogue.id !== idToDelete));
    setStatusMessage('Item deleted.');
  }, [latestDialogue]);

  const handleDeleteAll = useCallback(() => {
    if (window.confirm('Are you sure you want to delete all history? This action cannot be undone.')) {
      audioPlayer.stop();
      setDialogueHistory([]);
      setLatestDialogue(null);
      setStatusMessage('History cleared.');
    }
  }, []);


  return (
    <div className="min-h-screen bg-slate-900 text-slate-300 font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <style>{`
        .range-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 14px;
            height: 14px;
            background: #38bdf8; /* sky-400 */
            border-radius: 50%;
            cursor: pointer;
            margin-top: -5px;
            border: 2px solid #0f172a; /* slate-900 */
        }
        .range-slider:disabled::-webkit-slider-thumb {
            background: #475569; /* slate-600 */
            cursor: not-allowed;
        }
        .range-slider::-moz-range-thumb {
            width: 14px;
            height: 14px;
            background: #38bdf8; /* sky-400 */
            border-radius: 50%;
            cursor: pointer;
        }
        .range-slider:disabled::-moz-range-thumb {
            background: #475569; /* slate-600 */
            cursor: not-allowed;
        }
        .hype-badge {
            animation: pulse-glow 2s infinite;
        }
        @keyframes pulse-glow {
            0% { box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.4); }
            70% { box-shadow: 0 0 0 6px rgba(244, 63, 94, 0); }
            100% { box-shadow: 0 0 0 0 rgba(244, 63, 94, 0); }
        }
      `}</style>
      <div className="w-full max-w-3xl mx-auto">
        <Header />
        <main className="mt-8">
            <div className="bg-slate-800/50 rounded-xl shadow-lg ring-1 ring-white/10 p-6 sm:p-8">
                <p className="text-sm text-slate-400 mb-6">
                    Paste your news summaries below. The AI will convert them into a **monologue** by Enceladus.
                </p>
                
                <div className="flex flex-col gap-3 mb-4">
                    <label className="text-sm font-semibold text-slate-200">Select Script Strategy:</label>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={() => setScriptType('hook')}
                            className={`relative flex-1 p-3 rounded-lg border-2 text-left transition-all duration-200 ${
                                scriptType === 'hook'
                                    ? 'bg-rose-900/20 border-rose-500 text-rose-100'
                                    : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-500'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-bold">Viral Teaser (Hook)</span>
                                {scriptType === 'hook' && <span className="text-[10px] font-bold bg-rose-500 text-white px-2 py-0.5 rounded-full hype-badge">HIGH HYPE</span>}
                            </div>
                            <p className="text-xs opacity-80">Max 2 min. Creates cliffhangers & open loops to drive clicks.</p>
                        </button>

                        <button
                            onClick={() => setScriptType('summary')}
                            className={`relative flex-1 p-3 rounded-lg border-2 text-left transition-all duration-200 ${
                                scriptType === 'summary'
                                    ? 'bg-sky-900/20 border-sky-500 text-sky-100'
                                    : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-500'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-bold">Full Breakdown</span>
                            </div>
                            <p className="text-xs opacity-80">Min 4 min. Comprehensive deep dive & analysis.</p>
                        </button>
                    </div>
                </div>

                <ScriptInput value={script} onChange={(e) => setScript(e.target.value)} disabled={isLoading} />
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <GenerateButton onClick={handleGenerate} isLoading={isLoading} />
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                    {isLoading || isDownloadingAll ? <Loader /> : <Status />}
                    <span>{statusMessage}</span>
                    </div>
                </div>

                <PlaybackControls dialogue={latestDialogue} />
                
                {error && <div className="mt-4 bg-red-900/50 text-red-300 p-4 rounded-lg text-sm border border-red-700">{error}</div>}
            
                <div className="mt-8 border-t border-slate-700 pt-6">
                    <h3 className="text-lg font-semibold text-slate-200 mb-4">Voice Artist</h3>
                    <div className="grid grid-cols-1 gap-4">
                        <div className="bg-slate-700/50 p-4 rounded-lg">
                            <div className="flex items-center gap-4">
                                <div className="bg-sky-500/20 text-sky-400 rounded-full p-2">
                                    <SpeakerIcon />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-100">Enceladus</p>
                                    <p className="text-sm text-slate-400">Cynical News Host (Enceladus Voice)</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <History 
                history={dialogueHistory} 
                onDownloadAll={handleDownloadAll}
                isDownloadingAll={isDownloadingAll}
                onDelete={handleDeleteDialogue}
                onDeleteAll={handleDeleteAll}
            />
        </main>
      </div>
    </div>
  );
};

export default App;
