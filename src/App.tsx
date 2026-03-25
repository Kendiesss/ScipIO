import React, { useState } from 'react';
import { Player } from '@remotion/player';
import { ScipioComposition } from './remotion/ScipioComposition';
import { TranscriptionJSON, ViralSegment } from './types';
import { Youtube, Scissors, Wand2, Download, Loader2, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [result, setResult] = useState<{
    transcription: TranscriptionJSON;
    segments: ViralSegment[];
    videoUrl: string;
  } | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<ViralSegment | null>(null);

  const handleProcess = async () => {
    setLoading(true);
    setResult(null);
    setSelectedSegment(null);
    
    try {
      setProcessingStep('Downloading & Transcribing...');
      const response = await fetch('/api/process-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtubeUrl: url }),
      });
      
      const data = await response.json();
      if (data.success) {
        setResult(data);
        setSelectedSegment(data.segments[0]);
      } else {
        alert(data.error || 'Failed to process video');
      }
    } catch (error) {
      console.error(error);
      alert('An error occurred');
    } finally {
      setLoading(false);
      setProcessingStep('');
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-orange-500/30">
      {/* Header */}
      <header className="p-6 border-b border-white/10 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-600 rounded flex items-center justify-center">
            <Scissors className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tighter uppercase">Scipio</h1>
        </div>
        <div className="text-xs font-mono text-white/40 uppercase tracking-widest">
          Principal AI/ML Video Pipeline v1.0
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-8 grid lg:grid-cols-[1fr_400px] gap-12">
        {/* Left Column: Controls & Preview */}
        <div className="space-y-8">
          <section className="space-y-4">
            <h2 className="text-4xl font-bold tracking-tight">The Quick-Cutter</h2>
            <p className="text-white/60 max-w-xl">
              Automated pipeline for vertical content generation. Ingest YouTube URLs, 
              AI-detect viral segments, and render with dynamic subtitles.
            </p>
            
            <div className="flex gap-2 p-2 bg-white/5 rounded-xl border border-white/10 focus-within:border-orange-500/50 transition-colors">
              <div className="flex-1 flex items-center px-4 gap-3">
                <Youtube className="w-5 h-5 text-red-500" />
                <input 
                  type="text" 
                  placeholder="Paste YouTube URL..."
                  className="bg-transparent w-full outline-none text-sm"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
              <button 
                onClick={handleProcess}
                disabled={loading || !url}
                className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 px-6 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                {loading ? 'Processing...' : 'Analyze'}
              </button>
            </div>
            {processingStep && (
              <p className="text-xs font-mono text-orange-500 animate-pulse">{processingStep}</p>
            )}
          </section>

          {/* Preview Area */}
          <div className="aspect-[9/16] max-w-[360px] mx-auto bg-white/5 rounded-2xl border border-white/10 overflow-hidden relative shadow-2xl shadow-orange-500/10">
            {selectedSegment && result ? (
              <Player
                component={ScipioComposition}
                durationInFrames={Math.ceil((selectedSegment.end_timestamp - selectedSegment.start_timestamp) * 30)}
                compositionWidth={1080}
                compositionHeight={1920}
                fps={30}
                style={{ width: '100%', height: '100%' }}
                inputProps={{
                  videoSrc: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', // Placeholder for demo
                  transcription: result.transcription,
                  segment: selectedSegment,
                  watermarkUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/2560px-Google_2015_logo.svg.png'
                }}
                controls
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20 gap-4">
                <Play className="w-16 h-16 opacity-20" />
                <p className="text-sm font-mono uppercase tracking-widest">Waiting for input</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Segments & Export */}
        <div className="space-y-6">
          <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white/40 border-b border-white/10 pb-4">
              AI Detected Segments
            </h3>
            
            <div className="space-y-3">
              <AnimatePresence mode="wait">
                {result ? (
                  result.segments.map((seg, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      onClick={() => setSelectedSegment(seg)}
                      className={`w-full p-4 rounded-xl border text-left transition-all ${
                        selectedSegment === seg 
                          ? 'bg-orange-600 border-orange-400 shadow-lg shadow-orange-600/20' 
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="text-xs font-mono opacity-60 mb-1">0{i+1} — Segment</div>
                      <div className="font-bold text-sm line-clamp-1">{seg.title}</div>
                      <div className="text-[10px] font-mono mt-2 opacity-60">
                        {seg.start_timestamp.toFixed(1)}s - {seg.end_timestamp.toFixed(1)}s
                      </div>
                    </motion.button>
                  ))
                ) : (
                  <div className="py-12 text-center text-white/20 italic text-sm">
                    No segments analyzed yet
                  </div>
                )}
              </AnimatePresence>
            </div>

            {selectedSegment && (
              <button className="w-full bg-white text-black hover:bg-white/90 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all mt-6">
                <Download className="w-5 h-5" />
                Render & Export MP4
              </button>
            )}
          </div>

          {/* Technical Specs */}
          <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-4">Pipeline Status</h3>
            <div className="space-y-3 font-mono text-[10px]">
              <div className="flex justify-between">
                <span className="text-white/40">ENGINE</span>
                <span className="text-green-500">REMOTION 4.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">AI MODEL</span>
                <span className="text-orange-500">GEMINI 1.5 FLASH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">TRANSCRIPTION</span>
                <span className="text-blue-500">WHISPER-V3</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">OUTPUT</span>
                <span className="text-white/60">9:16 VERTICAL</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
