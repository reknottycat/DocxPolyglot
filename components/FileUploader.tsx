import React, { useRef, useState } from 'react';
import { FileUp } from 'lucide-react';

interface FileUploaderProps {
  onFilesSelect: (files: File[]) => void;
  disabled: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFilesSelect, disabled }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSelect(Array.from(e.dataTransfer.files));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSelect(Array.from(e.target.files));
    }
    // Reset input value to allow selecting the same files again if needed
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const validateAndSelect = (files: File[]) => {
    const validFiles = files.filter(file => 
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || 
      file.name.endsWith(".docx")
    );

    if (validFiles.length > 0) {
      onFilesSelect(validFiles);
    }
    
    if (validFiles.length < files.length) {
      alert("Some files were skipped. Only .docx files are supported.");
    }
  };

  const triggerClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  };

  return (
    <div
      onClick={triggerClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        w-full p-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200
        ${isDragging 
          ? 'border-blue-500 bg-blue-50 scale-[1.01]' 
          : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50 bg-white'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input
        type="file"
        ref={inputRef}
        onChange={handleInputChange}
        accept=".docx"
        multiple
        className="hidden"
        disabled={disabled}
      />
      <div className={`
        h-12 w-12 mb-3 rounded-xl flex items-center justify-center transition-colors
        ${isDragging ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}
      `}>
        <FileUp className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-800">
        Click to Upload or Drag & Drop
      </h3>
      <p className="text-slate-500 mt-1 text-sm">
        Supports multiple .docx files
      </p>
    </div>
  );
};