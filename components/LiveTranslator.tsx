import React, { useRef, useState, useEffect } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { Mic, MicOff, Volume2, AlertCircle } from 'lucide-react';
import { decodeAudio, decodeAudioData, createPcmBlob } from '../utils/audioUtils';

interface LiveTranslatorProps {
  sourceLang: string;
  targetLang: string;
}

export const LiveTranslator: React.FC<LiveTranslatorProps> = ({ sourceLang, targetLang }) => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<string>('Ready to connect');
  const [error, setError] = useState<string | null>(null);
  
  // Refs for audio handling to avoid re-renders
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

  const cleanup = () => {
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (inputContextRef.current) {
      inputContextRef.current.close();
      inputContextRef.current = null;
    }
    if (outputContextRef.current) {
      outputContextRef.current.close();
      outputContextRef.current = null;
    }
    // Note: session.close() would be ideal but API access to session object is via promise
    sessionPromiseRef.current = null;
  };

  useEffect(() => {
    return () => cleanup();
  }, []);

  const toggleSession = async () => {
    if (isActive) {
      setIsActive(false);
      setStatus('Disconnected');
      cleanup();
      return;
    }

    setIsActive(true);
    setStatus('Connecting...');
    setError(null);

    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) throw new Error("API Key missing");
      const ai = new GoogleGenAI({ apiKey });

      // Init Audio Contexts
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      inputContextRef.current = inputCtx;
      outputContextRef.current = outputCtx;
      
      const outputNode = outputCtx.createGain();
      outputNode.connect(outputCtx.destination);
      nextStartTimeRef.current = 0;

      // Get Mic Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const modelName = 'gemini-2.5-flash-native-audio-preview-12-2025'; // Best for live audio

      const sessionPromise = ai.live.connect({
        model: modelName,
        callbacks: {
          onopen: () => {
            setStatus('Connected - Speak now');
            
            // Setup Input Pipeline
            const source = inputCtx.createMediaStreamSource(stream);
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = processor;

            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            
            if (audioData) {
               const ctx = outputContextRef.current;
               if (!ctx) return;

               // Sync timing
               nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
               
               const audioBuffer = await decodeAudioData(
                 decodeAudio(audioData),
                 ctx,
                 24000,
                 1
               );

               const source = ctx.createBufferSource();
               source.buffer = audioBuffer;
               source.connect(outputNode);
               
               source.addEventListener('ended', () => {
                 sourcesRef.current.delete(source);
               });

               source.start(nextStartTimeRef.current);
               nextStartTimeRef.current += audioBuffer.duration;
               sourcesRef.current.add(source);
            }
          },
          onclose: () => {
             if (isActive) {
                setStatus('Connection Closed');
                setIsActive(false);
             }
          },
          onerror: (err) => {
             console.error(err);
             setError('Connection error occurred');
             setIsActive(false);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
             voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          },
          systemInstruction: `You are a professional simultaneous interpreter. 
          Your task is to translate spoken audio.
          Source Language: ${sourceLang === 'auto' ? 'Detect automatically' : sourceLang}
          Target Language: ${targetLang}
          
          If you hear ${sourceLang}, translate it to ${targetLang}.
          Keep your response concise and strictly translate what was said. Do not add conversational filler.
          `
        }
      });

      sessionPromiseRef.current = sessionPromise;

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to start live session");
      setIsActive(false);
      cleanup();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
      <div className={`
        relative flex items-center justify-center w-24 h-24 rounded-full mb-6 transition-all duration-500
        ${isActive ? 'bg-red-100 dark:bg-red-900/30 shadow-lg shadow-red-200 dark:shadow-red-900/20' : 'bg-slate-100 dark:bg-slate-700'}
      `}>
        {isActive && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-20 animate-ping"></span>
        )}
        <div className={`p-4 rounded-full ${isActive ? 'text-red-500' : 'text-slate-400'}`}>
          {isActive ? <Mic size={40} /> : <MicOff size={40} />}
        </div>
      </div>

      <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
        {isActive ? 'Live Translation Active' : 'Start Live Conversation'}
      </h3>
      
      <p className={`text-sm font-medium mb-8 ${isActive ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}>
        {status}
      </p>

      {error && (
        <div className="flex items-center gap-2 text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg mb-6">
          <AlertCircle size={18} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <button
        onClick={toggleSession}
        className={`
          flex items-center gap-2 px-8 py-3 rounded-xl font-semibold shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0
          ${isActive 
            ? 'bg-white border-2 border-red-500 text-red-500 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-900/20' 
            : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-indigo-200 dark:shadow-none'
          }
        `}
      >
        {isActive ? 'Stop Session' : 'Start Listening'}
      </button>

      <div className="mt-8 text-xs text-slate-400 dark:text-slate-500 max-w-sm">
        <p>Uses Gemini Live API for low-latency real-time translation.</p>
        <p className="mt-1">Please use headphones to prevent audio feedback loop.</p>
      </div>
    </div>
  );
};