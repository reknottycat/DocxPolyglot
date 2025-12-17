import React, { useState, useCallback } from 'react';
import { FileUploader } from './components/FileUploader';
import { LanguageSelector } from './components/LanguageSelector';
import { translateDocx } from './services/docx';
import { TranslationStatus, DocFile } from './types';
import { FileText, Download, Loader2, RefreshCw, X, AlertCircle, Trash2, CheckCircle2, Zap } from 'lucide-react';

const App: React.FC = () => {
  const [files, setFiles] = useState<DocFile[]>([]);
  const [targetLang, setTargetLang] = useState<string>('ru'); // Default to Russian
  const [isProcessing, setIsProcessing] = useState(false);

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
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove?.downloadUrl) {
        URL.revokeObjectURL(fileToRemove.downloadUrl);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const clearAll = () => {
    files.forEach(f => {
      if (f.downloadUrl) URL.revokeObjectURL(f.downloadUrl);
    });
    setFiles([]);
  };

  const updateFileState = (id: string, updates: Partial<DocFile>) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const handleTranslateAll = useCallback(async () => {
    if (files.length === 0 || isProcessing) return;
    
    setIsProcessing(true);

    // Process sequentially to avoid overwhelming browser or API limits
    for (const doc of files) {
      if (doc.status === TranslationStatus.COMPLETED) continue;

      try {
        updateFileState(doc.id, { status: TranslationStatus.PARSING, progress: 0, error: undefined });

        const { blob, totalTokens } = await translateDocx(doc.file, targetLang, (progress) => {
          const percentage = progress.totalSegments > 0 
            ? Math.round((progress.translatedSegments / progress.totalSegments) * 100) 
            : 0;
            
          updateFileState(doc.id, { 
            status: TranslationStatus.TRANSLATING, 
            progress: percentage,
            currentAction: progress.currentAction
          });
        });

        const url = URL.createObjectURL(blob);
        updateFileState(doc.id, { 
          status: TranslationStatus.COMPLETED, 
          progress: 100, 
          downloadUrl: url,
          currentAction: 'Done',
          tokenUsage: totalTokens
        });

      } catch (error: any) {
        console.error(error);
        updateFileState(doc.id, { 
          status: TranslationStatus.ERROR, 
          error: error.message || "Translation failed",
          currentAction: 'Error'
        });
      }
    }

    setIsProcessing(false);
  }, [files, targetLang, isProcessing]);

  const hasFiles = files.length > 0;
  const allCompleted = hasFiles && files.every(f => f.status === TranslationStatus.COMPLETED);
  const anyProcessing = files.some(f => f.status === TranslationStatus.TRANSLATING || f.status === TranslationStatus.PARSING || f.status === TranslationStatus.REBUILDING);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <FileText size={20} />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight font-serif">
              Docx<span className="text-blue-600">Polyglot</span>
            </h1>
          </div>
          <div className="text-sm text-slate-500 hidden sm:block italic">
            Powered by Gemini AI
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-start pt-8 pb-12 px-4 sm:px-6">
        
        <div className="w-full max-w-4xl space-y-6">
          
          {/* Controls Container */}
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100 p-6 sm:p-8">
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* File Upload Area */}
                <div className="order-2 md:order-1">
                   <FileUploader 
                    onFilesSelect={handleFilesSelect} 
                    disabled={isProcessing}
                  />
                </div>

                {/* Settings & Global Actions */}
                <div className="order-1 md:order-2 flex flex-col justify-between h-full space-y-4">
                  <div>
                    <LanguageSelector 
                      selectedCode={targetLang} 
                      onSelect={setTargetLang}
                      disabled={isProcessing || hasFiles && files.some(f => f.status !== TranslationStatus.IDLE)}
                    />
                    <p className="text-xs text-slate-500 mt-2 italic">
                       Changing language applies to pending files only.
                    </p>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={handleTranslateAll}
                      disabled={!hasFiles || isProcessing || allCompleted}
                      className={`
                        flex-1 px-6 py-3 rounded-xl font-semibold text-white shadow-lg transition-all flex items-center justify-center space-x-2
                        ${!hasFiles || isProcessing || allCompleted
                          ? 'bg-slate-300 shadow-none cursor-not-allowed text-slate-500' 
                          : 'bg-blue-600 hover:bg-blue-700 hover:scale-[1.02] shadow-blue-500/30'
                        }
                      `}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="animate-spin h-5 w-5" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-5 w-5" />
                          <span>Translate All</span>
                        </>
                      )}
                    </button>
                    
                    {hasFiles && !isProcessing && (
                      <button
                        onClick={clearAll}
                        className="px-4 py-3 rounded-xl font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center"
                        title="Clear all files"
                      >
                         <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* File List */}
            {hasFiles && (
              <div className="mt-8 border-t border-slate-100 pt-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4 font-serif">Selected Documents ({files.length})</h3>
                <div className="space-y-3">
                  {files.map((doc) => (
                    <div 
                      key={doc.id}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4 transition-all"
                    >
                      {/* Icon */}
                      <div className="h-10 w-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-blue-600 shadow-sm flex-shrink-0">
                        <FileText className="h-5 w-5" />
                      </div>

                      {/* File Info */}
                      <div className="flex-grow w-full text-center sm:text-left">
                        <div className="flex items-center justify-center sm:justify-start gap-2">
                          <p className="font-medium text-slate-900 truncate max-w-[200px] sm:max-w-md" title={doc.file.name}>
                            {doc.file.name}
                          </p>
                          <span className="text-xs text-slate-400">
                             ({(doc.file.size / 1024).toFixed(0)} KB)
                          </span>
                        </div>

                        {/* Status Bar / Error Msg */}
                        {doc.status !== TranslationStatus.IDLE && doc.status !== TranslationStatus.COMPLETED && doc.status !== TranslationStatus.ERROR && (
                          <div className="mt-2 w-full max-w-sm">
                            <div className="flex justify-between text-xs text-slate-500 mb-1">
                               <span>{doc.currentAction || 'Processing...'}</span>
                               <span>{doc.progress}%</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                                style={{ width: `${doc.progress}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                         
                        {doc.status === TranslationStatus.ERROR && (
                           <p className="text-xs text-red-500 mt-1 flex items-center justify-center sm:justify-start gap-1">
                             <AlertCircle className="h-3 w-3" /> {doc.error}
                           </p>
                        )}
                        
                        {doc.status === TranslationStatus.COMPLETED && (
                           <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-x-3 gap-y-1">
                             <p className="text-xs text-green-600 flex items-center justify-center sm:justify-start gap-1 font-medium">
                               <CheckCircle2 className="h-3 w-3" /> Translated
                             </p>
                             {doc.tokenUsage !== undefined && (
                               <p className="text-xs text-slate-500 flex items-center justify-center sm:justify-start gap-1" title="Total tokens used">
                                 <Zap className="h-3 w-3 text-yellow-500" /> {doc.tokenUsage.toLocaleString()} tokens
                               </p>
                             )}
                           </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {doc.status === TranslationStatus.COMPLETED && doc.downloadUrl && (
                          <a
                            href={doc.downloadUrl}
                            download={`translated_${targetLang}_${doc.file.name}`}
                            className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors flex items-center gap-2 text-sm font-medium px-3"
                          >
                            <Download className="h-4 w-4" />
                            <span className="hidden sm:inline">Download</span>
                          </a>
                        )}

                        <button 
                          onClick={() => removeFile(doc.id)}
                          disabled={isProcessing && doc.status !== TranslationStatus.COMPLETED && doc.status !== TranslationStatus.ERROR && doc.status !== TranslationStatus.IDLE}
                          className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="text-center">
             <p className="text-xs text-slate-400 italic">
               Privacy Note: Your files are processed in the browser. Text snippets are sent to Gemini API for translation.
             </p>
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;