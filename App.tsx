
import React, { useState, useCallback } from 'react';
import { FileUploader } from './components/FileUploader';
import { LanguageSelector } from './components/LanguageSelector';
import { translateDocx } from './services/docx';
import { testConnection } from './services/ai';
import { TranslationStatus, DocFile, SUPPORTED_MODELS, APIConfig, ProviderType } from './types';
import { 
  FileText, Download, Loader2, RefreshCw, X, AlertCircle, 
  Trash2, CheckCircle2, Zap, Settings2, Cpu, Link, Key, 
  Layout, ShieldCheck, Eye, EyeOff, Terminal, 
  PlayCircle, Check
} from 'lucide-react';

const App: React.FC = () => {
  const [files, setFiles] = useState<DocFile[]>([]);
  const [targetLang, setTargetLang] = useState<string>('ru');
  const [activeProvider, setActiveProvider] = useState<ProviderType>('gemini');
  
  // Settings State
  const [selectedModelId, setSelectedModelId] = useState<string>('gemini-3-flash-preview');
  const [customModelName, setCustomModelName] = useState<string>('');
  
  // 按照您的案例，默认设为基地址
  const [thirdPartyUrl, setThirdPartyUrl] = useState<string>('https://integrate.api.nvidia.com/v1');
  const [thirdPartyKey, setThirdPartyKey] = useState<string>('');
  const [showKey, setShowKey] = useState(false);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'fail' | null>(null);

  const handleFilesSelect = (selectedFiles: File[]) => {
    const newFiles: DocFile[] = selectedFiles.map(file => ({
      id: crypto.randomUUID(),
      file,
      status: TranslationStatus.IDLE,
      progress: 0,
    }));
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setFiles(prev => {
      const f = prev.find(item => item.id === id);
      if (f?.downloadUrl) URL.revokeObjectURL(f.downloadUrl);
      return prev.filter(item => item.id !== id);
    });
  };

  const clearAll = () => {
    files.forEach(f => f.downloadUrl && URL.revokeObjectURL(f.downloadUrl));
    setFiles([]);
  };

  const handleTestConnection = async () => {
    if (isTestingConnection) return;
    setIsTestingConnection(true);
    setTestResult(null);
    
    const config: APIConfig = {
      provider: 'third-party',
      modelId: selectedModelId === 'custom' ? customModelName : selectedModelId,
      baseUrl: thirdPartyUrl,
      apiKey: thirdPartyKey
    };
    
    const success = await testConnection(config);
    setTestResult(success ? 'success' : 'fail');
    setIsTestingConnection(false);
    
    setTimeout(() => setTestResult(null), 3000);
  };

  const handleTranslate = useCallback(async () => {
    if (files.length === 0 || isProcessing) return;
    setIsProcessing(true);

    const config: APIConfig = {
      provider: activeProvider,
      modelId: selectedModelId === 'custom' ? customModelName : selectedModelId,
      baseUrl: thirdPartyUrl,
      apiKey: thirdPartyKey
    };

    for (const doc of files) {
      if (doc.status === TranslationStatus.COMPLETED) continue;
      
      try {
        setFiles(prev => prev.map(f => f.id === doc.id ? { ...f, status: TranslationStatus.PARSING, progress: 0 } : f));

        const { blob, totalTokens } = await translateDocx(doc.file, targetLang, config, (p) => {
          const pct = p.totalSegments > 0 ? Math.round((p.translatedSegments / p.totalSegments) * 100) : 0;
          setFiles(prev => prev.map(f => f.id === doc.id ? { 
            ...f, status: TranslationStatus.TRANSLATING, progress: pct, currentAction: p.currentAction 
          } : f));
        });

        const url = URL.createObjectURL(blob);
        setFiles(prev => prev.map(f => f.id === doc.id ? { 
          ...f, status: TranslationStatus.COMPLETED, progress: 100, downloadUrl: url, tokenUsage: totalTokens 
        } : f));
      } catch (error: any) {
        setFiles(prev => prev.map(f => f.id === doc.id ? { ...f, status: TranslationStatus.ERROR, error: error.message } : f));
      }
    }
    setIsProcessing(false);
  }, [files, targetLang, activeProvider, selectedModelId, customModelName, thirdPartyUrl, thirdPartyKey, isProcessing]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <FileText size={20} />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight font-serif">
              Docx<span className="text-blue-600">Polyglot</span>
            </h1>
          </div>
          <div className="flex items-center space-x-6">
            <div className="hidden md:flex items-center text-xs font-bold text-slate-400 uppercase tracking-widest space-x-1">
              <ShieldCheck size={14} className="text-green-500" />
              <span>API Gateway Ready</span>
            </div>
            <button
              onClick={handleTranslate}
              disabled={files.length === 0 || isProcessing}
              className={`px-5 py-2 rounded-xl font-bold text-sm transition-all flex items-center space-x-2 ${
                files.length === 0 || isProcessing 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20 active:scale-95'
              }`}
            >
              {isProcessing ? <Loader2 className="animate-spin h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
              <span>{isProcessing ? 'Translating...' : 'Start Translation'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-6xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[600px]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-sm font-bold text-slate-500 flex items-center uppercase tracking-wider">
                <Settings2 size={16} className="mr-2 text-blue-500" /> API Settings
              </h2>
            </div>

            <div className="flex flex-1">
              <div className="w-16 border-r border-slate-100 bg-slate-50/50 flex flex-col items-center py-6 space-y-6">
                <button 
                  onClick={() => { setActiveProvider('gemini'); setSelectedModelId('gemini-3-flash-preview'); }}
                  className={`p-3 rounded-2xl transition-all ${activeProvider === 'gemini' ? 'bg-white text-blue-600 shadow-lg shadow-blue-500/10' : 'text-slate-400 hover:text-slate-600'}`}
                  title="Google Gemini"
                >
                  <Cpu size={22} />
                </button>
                <button 
                  onClick={() => { setActiveProvider('third-party'); setSelectedModelId('deepseek-ai/deepseek-r1'); }}
                  className={`p-3 rounded-2xl transition-all ${activeProvider === 'third-party' ? 'bg-white text-blue-600 shadow-lg shadow-blue-500/10' : 'text-slate-400 hover:text-slate-600'}`}
                  title="Third-Party (OpenAI Compatible)"
                >
                  <Layout size={22} />
                </button>
              </div>

              <div className="flex-1 p-6 space-y-8 overflow-y-auto">
                <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                  <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1.5">Active Mode</div>
                  <div className="text-sm font-bold text-blue-700 flex items-center">
                    {activeProvider === 'gemini' ? <><Cpu size={14} className="mr-2" /> Google Gemini SDK</> : <><Layout size={14} className="mr-2" /> OpenAI SDK</>}
                  </div>
                </div>

                {activeProvider === 'third-party' && (
                  <div className="space-y-5 animate-in fade-in slide-in-from-left-2 duration-300">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest flex items-center">
                        <Key size={12} className="mr-1.5" /> API Key
                      </label>
                      <div className="relative">
                        <input 
                          type={showKey ? "text" : "password"}
                          value={thirdPartyKey}
                          onChange={(e) => setThirdPartyKey(e.target.value)}
                          placeholder="nvapi-..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono focus:ring-4 focus:ring-blue-500/5 focus:border-blue-400 outline-none transition-all pr-10"
                        />
                        <button 
                          onClick={() => setShowKey(!showKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                          <Link size={12} className="mr-1.5" /> Base URL
                        </label>
                        <button 
                          onClick={handleTestConnection}
                          disabled={isTestingConnection}
                          className={`text-[10px] font-bold flex items-center px-2.5 py-1 rounded-lg transition-all border ${
                            testResult === 'success' ? 'bg-green-50 text-green-600 border-green-200' :
                            testResult === 'fail' ? 'bg-red-50 text-red-600 border-red-200' :
                            'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100'
                          }`}
                        >
                          {isTestingConnection ? <Loader2 size={12} className="animate-spin mr-1.5" /> : 
                           testResult === 'success' ? <Check size={12} className="mr-1.5" /> :
                           testResult === 'fail' ? <AlertCircle size={12} className="mr-1.5" /> :
                           <PlayCircle size={12} className="mr-1.5" />}
                          {testResult === 'success' ? 'OK' : testResult === 'fail' ? 'Fail' : 'Test'}
                        </button>
                      </div>
                      <input 
                        type="text" 
                        value={thirdPartyUrl}
                        onChange={(e) => setThirdPartyUrl(e.target.value)}
                        placeholder="e.g. https://integrate.api.nvidia.com/v1"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono focus:ring-4 focus:ring-blue-500/5 focus:border-blue-400 outline-none transition-all"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Model</label>
                  <div className="space-y-2">
                    {SUPPORTED_MODELS
                      .filter(m => activeProvider === 'third-party' ? m.provider === 'third-party' : m.provider === 'gemini')
                      .map(m => (
                        <button
                          key={m.id}
                          onClick={() => setSelectedModelId(m.id)}
                          className={`w-full text-left px-4 py-3.5 rounded-xl text-xs font-bold transition-all border ${
                            selectedModelId === m.id 
                            ? 'bg-white text-blue-600 border-blue-300 shadow-sm' 
                            : 'bg-transparent text-slate-500 border-transparent hover:bg-slate-50 hover:border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{m.name}</span>
                            <span className="text-[9px] font-normal opacity-40">{m.description}</span>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <LanguageSelector 
                    selectedCode={targetLang} 
                    onSelect={setTargetLang}
                    disabled={isProcessing}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-[2rem] border border-slate-200 p-10 shadow-sm flex flex-col items-center justify-center min-h-[250px] transition-all hover:shadow-md">
             <FileUploader onFilesSelect={handleFilesSelect} disabled={isProcessing} />
          </div>

          {files.length > 0 && (
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                <h3 className="text-sm font-bold text-slate-800 flex items-center tracking-tight uppercase">
                  Queue <span className="ml-2 text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">{files.length} Files</span>
                </h3>
              </div>
              <div className="p-6 space-y-4">
                {files.map(doc => (
                  <div key={doc.id} className="group bg-white border border-slate-100 rounded-3xl p-5 flex flex-col sm:flex-row items-center gap-6 transition-all hover:border-blue-200 hover:shadow-sm">
                    <div className="h-16 w-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 flex-shrink-0">
                      <FileText className="h-8 w-8" />
                    </div>
                    <div className="flex-grow w-full">
                      <div className="flex items-center gap-2 mb-1.5">
                        <p className="font-bold text-slate-900 text-base truncate max-w-[250px]">{doc.file.name}</p>
                      </div>
                      {doc.status === TranslationStatus.TRANSLATING && (
                        <div className="w-full mt-3">
                          <div className="flex justify-between text-[10px] text-slate-400 mb-1.5 font-bold uppercase tracking-widest">
                             <span className="flex items-center"><Loader2 size={12} className="animate-spin mr-1.5 text-blue-500" /> {doc.currentAction}</span>
                             <span className="text-blue-600">{doc.progress}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-700 ease-out" style={{ width: `${doc.progress}%` }}></div>
                          </div>
                        </div>
                      )}
                      {doc.status === TranslationStatus.COMPLETED && (
                        <div className="flex flex-wrap items-center gap-3 mt-2">
                          <span className="text-[10px] font-bold text-green-600 flex items-center bg-green-50 px-3 py-1 rounded-full border border-green-100">
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Ready
                          </span>
                        </div>
                      )}
                      {doc.status === TranslationStatus.ERROR && (
                        <div className="flex items-center mt-2 px-3 py-2 bg-red-50 text-red-600 rounded-xl text-[10px] font-bold border border-red-100">
                          <AlertCircle size={14} className="mr-2" /> {doc.error}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      {doc.status === TranslationStatus.COMPLETED && doc.downloadUrl && (
                        <a href={doc.downloadUrl} download={`translated_${doc.file.name}`} className="flex-grow sm:flex-grow-0 flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-2xl text-xs font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-500/20 active:scale-95">
                          <Download size={14} /> DOWNLOAD
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
