import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  ArrowRightLeft, 
  Languages, 
  FileText, 
  Mic, 
  Video, 
  Image as ImageIcon,
  Radio,
  Sparkles, 
  Copy, 
  Check, 
  Loader2, 
  Upload, 
  X,
  Moon,
  Sun,
  Volume2,
  StopCircle,
  Zap
} from 'lucide-react';
import { translateContent, generateSpeech } from './services/geminiService';
import { LanguageSelect } from './components/LanguageSelect';
import { LiveTranslator } from './components/LiveTranslator';
import { MODELS, TONES } from './constants';
import { TranslationMode, Tone } from './types';
import { decodeAudio, decodeAudioData } from './utils/audioUtils';

// Utility to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1]; 
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

const App: React.FC = () => {
  // State
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('es');
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [mode, setMode] = useState<TranslationMode>(TranslationMode.TEXT);
  const [model, setModel] = useState(MODELS[0].id);
  const [tone, setTone] = useState<Tone>(Tone.PROFESSIONAL);
  
  const [file, setFile] = useState<File | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [autoTranslate, setAutoTranslate] = useState(false);

  // TTS State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingSpeech, setIsLoadingSpeech] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dark Mode Toggle
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Cleanup Audio Context
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const handleStopSpeaking = useCallback(() => {
    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
      setIsSpeaking(false);
    }
  }, []);

  const handleTranslate = useCallback(async () => {
    if (mode === TranslationMode.TEXT && !inputText.trim()) return;
    if (mode !== TranslationMode.TEXT && mode !== TranslationMode.LIVE && !file) {
      setError("Please upload a file first.");
      return;
    }

    setIsTranslating(true);
    setError(null);
    if(mode !== TranslationMode.TEXT) setOutputText(''); // Clear output for files, keep for text to prevent flicker if desired, but clearing is safer to show new result
    
    handleStopSpeaking(); // Stop any current audio

    try {
      let content = inputText;
      let mimeType = undefined;

      if (mode !== TranslationMode.TEXT && file) {
        content = await fileToBase64(file);
        mimeType = file.type;
      }

      const result = await translateContent({
        sourceLang,
        targetLang,
        content,
        mimeType,
        mode,
        model,
        tone
      });

      setOutputText(result);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during translation.");
    } finally {
      setIsTranslating(false);
    }
  }, [inputText, mode, file, sourceLang, targetLang, model, tone, handleStopSpeaking]);

  // Auto Translate Effect
  useEffect(() => {
    if (!autoTranslate || mode !== TranslationMode.TEXT || !inputText.trim()) return;

    const timeoutId = setTimeout(() => {
      handleTranslate();
    }, 1000); // 1 second debounce

    return () => clearTimeout(timeoutId);
  }, [inputText, autoTranslate, mode, handleTranslate]);


  // Handlers
  const handleSwapLanguages = () => {
    if (sourceLang === 'auto') return; // Cannot swap if auto
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    // Swap text content as well if text mode
    if (mode === TranslationMode.TEXT && outputText) {
      setInputText(outputText);
      setOutputText(inputText); 
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const clearFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleListen = async () => {
    if (!outputText || isSpeaking || isLoadingSpeech) return;

    setIsLoadingSpeech(true);
    try {
      const audioBase64 = await generateSpeech(outputText);
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      
      const audioBytes = decodeAudio(audioBase64);
      const audioBuffer = await decodeAudioData(audioBytes, audioCtx, 24000, 1);
      
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      
      source.onended = () => setIsSpeaking(false);
      
      audioSourceRef.current = source;
      source.start(0);
      setIsSpeaking(true);
    } catch (e: any) {
      setError("Failed to generate speech: " + e.message);
    } finally {
      setIsLoadingSpeech(false);
    }
  };

  // UI Helper for Mode Tabs
  const ModeTab = ({ id, icon: Icon, label }: { id: TranslationMode; icon: any; label: string }) => (
    <button
      onClick={() => {
        setMode(id);
        setError(null);
        setOutputText('');
        setFile(null);
        handleStopSpeaking();
      }}
      className={`flex items-center gap-2 px-4 md:px-6 py-3 text-sm font-medium transition-all duration-200 border-b-2 whitespace-nowrap ${
        mode === id
          ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-400'
          : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
      }`}
    >
      <Icon size={18} />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 pb-20 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-lg text-white shadow-lg shadow-indigo-200 dark:shadow-none">
                <Sparkles size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                  OmniTranslate AI
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:block">Universal Translator</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
               {/* Dark Mode Toggle */}
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              {/* Model & Tone Config (Desktop) */}
              <div className="hidden md:flex items-center gap-4">
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value as Tone)}
                  className="bg-slate-100 dark:bg-slate-700 border-none text-sm font-medium text-slate-700 dark:text-slate-200 rounded-lg py-1.5 px-3 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {TONES.map(t => <option key={t} value={t}>{t} Tone</option>)}
                </select>

                <div className="h-6 w-px bg-slate-200 dark:bg-slate-600"></div>

                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="bg-slate-100 dark:bg-slate-700 border-none text-sm font-medium text-slate-700 dark:text-slate-200 rounded-lg py-1.5 px-3 focus:ring-2 focus:ring-indigo-500 cursor-pointer max-w-[200px] truncate"
                >
                  {MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Mobile Settings */}
        <div className="md:hidden grid grid-cols-2 gap-3 mb-6">
           <select
                value={tone}
                onChange={(e) => setTone(e.target.value as Tone)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 rounded-lg py-2 px-3 shadow-sm"
              >
                {TONES.map(t => <option key={t} value={t}>{t} Tone</option>)}
              </select>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 rounded-lg py-2 px-3 shadow-sm"
              >
                {MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
        </div>

        {/* Translation Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col min-h-[600px]">
          
          {/* Mode Tabs */}
          <div className="flex border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-x-auto no-scrollbar">
            <ModeTab id={TranslationMode.TEXT} icon={Languages} label="Text" />
            <ModeTab id={TranslationMode.DOCUMENT} icon={FileText} label="Docs" />
            <ModeTab id={TranslationMode.IMAGE} icon={ImageIcon} label="Image" />
            <ModeTab id={TranslationMode.AUDIO} icon={Mic} label="Audio" />
            <ModeTab id={TranslationMode.VIDEO} icon={Video} label="Video" />
            <ModeTab id={TranslationMode.LIVE} icon={Radio} label="Live" />
          </div>

          {/* Language Selector Bar */}
          <div className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 p-4 md:p-6 grid grid-cols-[1fr,auto,1fr] gap-4 items-end">
            <LanguageSelect 
              label="Translate from" 
              value={sourceLang} 
              onChange={setSourceLang} 
            />
            
            <button 
              onClick={handleSwapLanguages}
              disabled={sourceLang === 'auto'}
              className={`p-3 rounded-full mb-1 transition-all ${
                sourceLang === 'auto' 
                ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' 
                : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 shadow-sm'
              }`}
            >
              <ArrowRightLeft size={20} />
            </button>
            
            <LanguageSelect 
              label="Translate to" 
              value={targetLang} 
              onChange={setTargetLang} 
              excludeAuto
            />
          </div>

          {/* Content Area */}
          {mode === TranslationMode.LIVE ? (
            <div className="flex-1 p-6">
              <LiveTranslator sourceLang={sourceLang} targetLang={targetLang} />
            </div>
          ) : (
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-700">
              
              {/* Input Section */}
              <div className="p-6 flex flex-col h-full bg-white dark:bg-slate-800">
                {mode === TranslationMode.TEXT ? (
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Enter text to translate..."
                    className="w-full h-full min-h-[300px] resize-none border-none focus:ring-0 text-lg text-slate-700 dark:text-slate-200 placeholder:text-slate-400 bg-transparent"
                    spellCheck={false}
                  />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-indigo-300 relative">
                    {!file ? (
                      <>
                        <div className="bg-white dark:bg-slate-700 p-4 rounded-full shadow-sm mb-4">
                          <Upload size={32} className="text-indigo-500 dark:text-indigo-400" />
                        </div>
                        <p className="text-lg font-medium text-slate-700 dark:text-slate-200 mb-1">
                          Upload {mode.charAt(0) + mode.slice(1).toLowerCase()}
                        </p>
                        <p className="text-sm text-slate-400 mb-6">
                          {mode === TranslationMode.DOCUMENT ? 'PDF, TXT, DOCX' : 
                           mode === TranslationMode.AUDIO ? 'MP3, WAV, AAC' : 
                           mode === TranslationMode.IMAGE ? 'JPG, PNG, WEBP' :
                           'MP4, MOV, WEBM'}
                        </p>
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-indigo-200 dark:shadow-none"
                        >
                          Browse Files
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center">
                         <div className="bg-indigo-100 dark:bg-indigo-900/30 p-4 rounded-full mb-4">
                          {mode === TranslationMode.DOCUMENT ? <FileText size={32} className="text-indigo-600 dark:text-indigo-400" /> : 
                           mode === TranslationMode.AUDIO ? <Mic size={32} className="text-indigo-600 dark:text-indigo-400" /> :
                           mode === TranslationMode.IMAGE ? <ImageIcon size={32} className="text-indigo-600 dark:text-indigo-400" /> :
                           <Video size={32} className="text-indigo-600 dark:text-indigo-400" />}
                        </div>
                        <p className="font-medium text-slate-800 dark:text-slate-200 text-lg mb-2">{file.name}</p>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        <button 
                          onClick={clearFile}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                          <X size={16} /> Remove File
                        </button>
                      </div>
                    )}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                      accept={
                        mode === TranslationMode.DOCUMENT ? ".txt,.pdf,.rtf,.html,.css,.js,.ts" :
                        mode === TranslationMode.AUDIO ? "audio/*" :
                        mode === TranslationMode.VIDEO ? "video/*" : 
                        mode === TranslationMode.IMAGE ? "image/*" : "*"
                      }
                    />
                  </div>
                )}
                
                {/* Translate Action Bar */}
                <div className="mt-6 flex items-center justify-between">
                   <div className="text-xs text-slate-400 flex items-center gap-2">
                      {mode === TranslationMode.TEXT && (
                        <>
                          {`${inputText.length} chars`}
                          {inputText.length > 0 && (
                            <div className="h-3 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
                          )}
                        </>
                      )}
                      
                      {/* Auto Translate Toggle */}
                      {mode === TranslationMode.TEXT && (
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input 
                            type="checkbox" 
                            checked={autoTranslate}
                            onChange={(e) => setAutoTranslate(e.target.checked)}
                            className="hidden" 
                          />
                          <div className={`w-8 h-4 rounded-full relative transition-colors ${autoTranslate ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                            <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${autoTranslate ? 'translate-x-4' : 'translate-x-0'}`}></div>
                          </div>
                          <span className={`text-xs font-medium transition-colors ${autoTranslate ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                            Auto-translate
                          </span>
                        </label>
                      )}
                   </div>

                   <button
                    onClick={handleTranslate}
                    disabled={isTranslating || (mode === TranslationMode.TEXT && !inputText) || (mode !== TranslationMode.TEXT && !file)}
                    className={`flex items-center gap-2 px-8 py-3 rounded-xl font-semibold shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 ${
                      isTranslating || (mode === TranslationMode.TEXT && !inputText) || (mode !== TranslationMode.TEXT && !file)
                        ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none'
                        : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-indigo-200 dark:shadow-none hover:shadow-indigo-300'
                    }`}
                  >
                    {isTranslating ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        Translating...
                      </>
                    ) : (
                      <>
                        Translate <Sparkles size={18} />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Output Section */}
              <div className="p-6 bg-slate-50/30 dark:bg-slate-900/30 flex flex-col h-full relative">
                {error ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                    <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-full text-red-500 dark:text-red-400 mb-4">
                      <X size={24} />
                    </div>
                    <h3 className="text-slate-800 dark:text-slate-200 font-semibold mb-2">Translation Failed</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">{error}</p>
                  </div>
                ) : outputText ? (
                  <>
                    <div className="flex-1 overflow-y-auto mb-16 whitespace-pre-wrap leading-relaxed text-lg text-slate-800 dark:text-slate-200 font-serif">
                      {outputText}
                    </div>
                    <div className="absolute bottom-6 right-6 flex gap-2">
                      {isSpeaking ? (
                        <button
                          onClick={handleStopSpeaking}
                          className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg shadow-sm transition-all"
                        >
                          <StopCircle size={18} /> Stop
                        </button>
                      ) : (
                        <button
                          onClick={handleListen}
                          disabled={isLoadingSpeech}
                          className="flex items-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-lg shadow-sm transition-all disabled:opacity-50"
                        >
                          {isLoadingSpeech ? <Loader2 size={18} className="animate-spin" /> : <Volume2 size={18} />}
                          Listen
                        </button>
                      )}
                      
                      <button
                        onClick={handleCopy}
                        className="flex items-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-lg shadow-sm transition-all"
                      >
                        {copied ? <Check size={18} /> : <Copy size={18} />}
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
                    <div className="mb-4">
                      {isTranslating ? (
                        <Zap size={48} className="text-indigo-300 dark:text-indigo-700 animate-pulse" />
                      ) : (
                        <ArrowRightLeft size={48} strokeWidth={1} />
                      )}
                    </div>
                    <p className="text-sm font-medium">
                      {isTranslating ? 'Translating...' : 'Translation will appear here'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Info Footer */}
        <div className="mt-8 text-center text-slate-400 dark:text-slate-500 text-sm">
           <p>OmniTranslate leverages Gemini Multimodal capabilities to understand context across text, documents, audio, and video.</p>
           {model && <p className="mt-2 text-xs opacity-75">Current Model: {MODELS.find(m => m.id === model)?.name}</p>}
        </div>

      </main>
    </div>
  );
};

export default App;