import React, { useRef, useState } from 'react';
import { UploadCloud, Search, AlertOctagon, FileText, Globe } from 'lucide-react';
import { ToolType } from '@shared/schema';

interface MainCardProps {
  activeTool: ToolType;
  onAnalyze: (data: { filename?: string; content?: string; file?: File }) => void;
  isAnalyzing: boolean;
}

export function MainCard({ activeTool, onAnalyze, isAnalyzing }: MainCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [textInput, setTextInput] = useState("");

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      onAnalyze({ filename: file.name, file });
      // Reset input so same file can be selected again
      e.target.value = '';
    }
  };

  const handleTextAnalyze = () => {
    if (!textInput.trim()) return;
    onAnalyze({ content: textInput, filename: "text_snippet.txt" });
    setTextInput("");
  };

  // Render content based on tool type
  const renderContent = () => {
    return (
      <div 
        className="file-drop-area group bg-[var(--panel)] border-border hover:bg-[var(--panel2)]/50 hover:border-[var(--accent)] transition-all duration-300 shadow-[var(--shadow)] hover:shadow-[var(--shadow-strong)]"
        onClick={() => fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileSelect}
        />
        <div className="w-16 h-16 rounded-full bg-[var(--accent)]/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
          <UploadCloud className="w-8 h-8 text-[var(--accent)]" />
        </div>
        <h3 className="text-xl font-semibold mb-2 text-[var(--text)]">
          Drop files here or click to upload
        </h3>
        <p className="text-[var(--muted)] text-sm max-w-md mx-auto leading-relaxed">
          Support for PDF, DOCX, JPG, PNG. Maximum file size 50MB.
          {activeTool === 'verification' && " Analyzes metadata and geolocation landmarks."}
          {activeTool === 'fact-check' && " Upload an article/document to verify claims."}
          {activeTool === 'propaganda' && " Upload content to assess propaganda likelihood."}
        </p>
        <p className="mt-4 text-[10px] text-[var(--muted)] font-medium uppercase tracking-widest opacity-60">
          Tip: name files with _real or _fake for demo outputs
        </p>
        <button className="btn btn-secondary mt-6 px-8 hover-elevate active-elevate-2">
          Select Files
        </button>
      </div>
    );
  };

  const getToolInfo = () => {
    switch (activeTool) {
      case 'document': return { title: "Document Forensics", icon: FileText, desc: "Analyze documents for digital alteration and manipulation." };
      case 'fact-check': return { title: "Automated Fact Check", icon: Search, desc: "Verify claims against a database of trusted sources." };
      case 'propaganda': return { title: "Propaganda Detection", icon: AlertOctagon, desc: "Identify persuasive techniques and bias in text." };
      case 'verification': return { title: "Verification Suite", icon: Globe, desc: "Combined metadata extraction and geolocation analysis." };
    }
  };

  const info = getToolInfo();
  const Icon = info.icon;

  return (
    <div className="card p-1 md:p-2 mb-8">
      <div className="bg-[var(--panel2)]/50 rounded-lg p-6 md:p-8">
        <div className="flex items-start gap-4 mb-8">
          <div className="p-3 bg-[var(--accent)]/10 rounded-xl">
            <Icon className="w-8 h-8 text-[var(--accent)]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[var(--text)] mb-1">{info.title}</h2>
            <p className="text-[var(--muted)]">{info.desc}</p>
          </div>
        </div>
        
        {renderContent()}
      </div>
    </div>
  );
}
