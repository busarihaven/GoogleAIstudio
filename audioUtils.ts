// The audio bytes returned by the API is raw PCM data.
// It is not a standard file format like .wav or .mp3, it contains no header information.
// We must decode it manually and add a WAV header for downloads.

export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
): Promise<AudioBuffer> {
    const SAMPLE_RATE = 24000;
    const NUM_CHANNELS = 1;
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / NUM_CHANNELS;
    const buffer = ctx.createBuffer(NUM_CHANNELS, frameCount, SAMPLE_RATE);

    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i] / 32768.0;
    }
    return buffer;
}


type PlaybackState = 'playing' | 'paused' | 'stopped';
type StateChangeListener = (state: PlaybackState, audioId: string | null) => void;
type ProgressListener = (progress: { currentTime: number, duration: number }) => void;

class Player {
    private audioContext: AudioContext | null = null;
    private sourceNode: AudioBufferSourceNode | null = null;
    private audioBufferCache: Map<string, AudioBuffer> = new Map();
    private state: PlaybackState = 'stopped';
    private currentAudioId: string | null = null;
    private startTime = 0;
    private pauseTime = 0;
    private duration = 0;
    private progressInterval: number | null = null;
    
    private stateListeners: Set<StateChangeListener> = new Set();
    private progressListeners: Set<ProgressListener> = new Set();

    public onStateChange(listener: StateChangeListener): () => void {
        this.stateListeners.add(listener);
        return () => this.stateListeners.delete(listener);
    }
    
    public onProgress(listener: ProgressListener): () => void {
        this.progressListeners.add(listener);
        return () => this.progressListeners.delete(listener);
    }

    private setState(newState: PlaybackState, audioId: string | null) {
        if (this.state === newState && this.currentAudioId === audioId) return;
        this.state = newState;
        this.currentAudioId = audioId;
        this.stateListeners.forEach(listener => listener(this.state, this.currentAudioId));
    }

    private startProgressTracker() {
        this.stopProgressTracker();
        this.progressInterval = window.setInterval(() => {
            if (this.state === 'playing') {
                this.progressListeners.forEach(listener => listener({
                    currentTime: this.currentPlaybackTime,
                    duration: this.duration
                }));
            }
        }, 100);
    }

    private stopProgressTracker() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }

    public getCurrentAudioId(): string | null {
        return this.currentAudioId;
    }

    public get currentPlaybackTime(): number {
        if (this.state === 'playing' && this.audioContext) {
            return this.pauseTime + (this.audioContext.currentTime - this.startTime);
        }
        return this.pauseTime;
    }
    
    public async play(base64Audio: string, audioId: string) {
        if (this.currentAudioId !== audioId && this.state !== 'stopped') {
            this.stop(true); // Stop previous track silently
        }
        
        const SAMPLE_RATE = 24000;
        
        if (!this.audioContext || this.audioContext.state === 'closed') {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: SAMPLE_RATE });
        }
        
        // Resume logic
        if (this.state === 'paused' && this.currentAudioId === audioId && this.audioBufferCache.has(audioId)) {
            this.duration = this.audioBufferCache.get(audioId)!.duration;
            this.sourceNode = this.audioContext.createBufferSource();
            this.sourceNode.buffer = this.audioBufferCache.get(audioId)!;
            this.sourceNode.connect(this.audioContext.destination);

            this.startTime = this.audioContext.currentTime - this.pauseTime;
            this.sourceNode.start(0, this.pauseTime);

            this.sourceNode.onended = () => {
                if (this.state === 'playing') {
                    this.stop();
                }
            };
            this.startProgressTracker();
            this.setState('playing', audioId);
            return;
        }

        // Start new playback
        this.stop(true); // ensure clean state for new track

        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: SAMPLE_RATE });

        if (!this.audioBufferCache.has(audioId)) {
            const decodedData = decode(base64Audio);
            const buffer = await decodeAudioData(decodedData, this.audioContext);
            this.duration = buffer.duration;
            this.audioBufferCache.set(audioId, buffer);
        } else {
            this.duration = this.audioBufferCache.get(audioId)!.duration;
        }
        
        this.sourceNode = this.audioContext.createBufferSource();
        this.sourceNode.buffer = this.audioBufferCache.get(audioId)!;
        this.sourceNode.connect(this.audioContext.destination);

        this.pauseTime = 0; // Reset for new playback
        this.startTime = this.audioContext.currentTime;
        this.sourceNode.start(0);

        this.sourceNode.onended = () => {
             if (this.state === 'playing') {
                 this.stop();
             }
        };
        
        this.startProgressTracker();
        this.setState('playing', audioId);
    }

    public pause() {
        if (this.state !== 'playing' || !this.audioContext || !this.sourceNode) return;
        
        this.stopProgressTracker();
        this.pauseTime = this.audioContext.currentTime - this.startTime;
        this.sourceNode.onended = null;
        this.sourceNode.stop();
        this.sourceNode = null;
        
        this.setState('paused', this.currentAudioId);
    }

    public stop(silent = false) {
        if (this.sourceNode) {
            this.sourceNode.onended = null;
            try {
                this.sourceNode.stop();
            } catch (e) {
                // Ignore errors if node is already stopped
            }
            this.sourceNode = null;
        }
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.stopProgressTracker();
        if (!silent) {
            this.progressListeners.forEach(l => l({ currentTime: 0, duration: this.duration }));
            this.setState('stopped', this.currentAudioId);
        } else {
             this.state = 'stopped';
        }
        this.pauseTime = 0;
        this.startTime = 0;
    }

    public rewind(seconds: number) {
        this.seekTo(this.currentPlaybackTime - seconds);
    }

    public forward(seconds: number) {
        this.seekTo(this.currentPlaybackTime + seconds);
    }

    public seekTo(time: number) {
        if ((this.state !== 'playing' && this.state !== 'paused') || !this.currentAudioId) return;
        
        const audioId = this.currentAudioId;
        const buffer = this.audioBufferCache.get(audioId);
        if (!buffer) return;
        
        if (!this.audioContext || this.audioContext.state === 'closed') {
             this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }


        const newTime = Math.max(0, Math.min(time, buffer.duration));
        const wasPlaying = this.state === 'playing';

        if (this.sourceNode) {
            this.sourceNode.onended = null;
            this.sourceNode.stop();
        }

        this.pauseTime = newTime;
        this.progressListeners.forEach(l => l({ currentTime: newTime, duration: this.duration }));

        if (wasPlaying) {
            this.sourceNode = this.audioContext.createBufferSource();
            this.sourceNode.buffer = buffer;
            this.sourceNode.connect(this.audioContext.destination);

            this.startTime = this.audioContext.currentTime - newTime;
            this.sourceNode.start(0, newTime);
            this.sourceNode.onended = () => {
                if (this.state === 'playing') {
                    this.stop();
                }
            };
        }
    }
}

export const audioPlayer = new Player();


// Helper to write a string to a DataView
function writeString(view: DataView, offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
    }
}

export function createWavBlob(base64Audio: string): Blob {
    const pcmData = decode(base64Audio);
    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    
    const header = new ArrayBuffer(44);
    const view = new DataView(header);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + pcmData.length, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
    view.setUint16(32, numChannels * (bitsPerSample / 8), true);
    view.setUint16(34, bitsPerSample, true);
    writeString(view, 36, 'data');
    view.setUint32(40, pcmData.length, true);

    return new Blob([header, pcmData], { type: 'audio/wav' });
}

export function downloadAudio(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
}