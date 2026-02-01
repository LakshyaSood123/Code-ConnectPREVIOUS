import React, { useRef, useState } from 'react';
import { UploadCloud, Search, AlertOctagon, FileText, Globe } from 'lucide-react';
import { ToolType } from '@shared/schema';

interface MainCardProps {
  activeTool: ToolType;
  onAnalyze: (data: { filename?: string; content?: string }) => void;
  isAnalyzing: boolean;
}

export function MainCard({ activeTool, onAnalyze, isAnalyzing }: MainCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [textInput, setTextInput] = useState("");

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onAnalyze({ filename: e.target.files[0].name });
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
    switch (activeTool) {
      case 'document':
      case 'metadata':
      case 'geo':
        return (
          <div 
            className="file-drop-area group"
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
            <p className="text-[var(--muted)] text-sm max-w-md mx-auto">
              Support for PDF, DOCX, JPG, PNG. Maximum file size 50MB.
              {activeTool === 'metadata' && " Extracts EXIF, XMP, and IPTC data."}
              {activeTool === 'geo' && " Analyzes visual landmarks for geolocation."}
            </p>
            <button className="btn btn-secondary mt-6">
              Select Files
            </button>
          </div>
        );

      case 'fact-check':
      case 'propaganda':
        return (
          <div className="space-y-4">
            <div className="relative">
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={
                  activeTool === 'fact-check' 
                  ? "Paste text here to verify claims against trusted sources..." 
                  : "Paste text here to analyze for persuasive language and propaganda techniques..."
                }
                className="w-full h-48 bg-[var(--bg)] border border-[var(--border)] rounded-lg p-4 text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all resize-none"
              />
              <div className="absolute bottom-4 right-4 text-xs text-[var(--muted)]">
                {textInput.length} chars
              </div>
            </div>
            <div className="flex justify-end">
              <button 
                onClick={handleTextAnalyze}
                disabled={!textInput.trim() || isAnalyzing}
                className="btn btn-primary min-w-[150px]"
              >
                {isAnalyzing ? "Processing..." : "Analyze Text"}
              </button>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  const getToolInfo = () => {
    switch (activeTool) {
      case 'document': return { title: "Document Forensics", icon: FileText, desc: "Analyze documents for digital alteration and manipulation." };
      case 'fact-check': return { title: "Automated Fact Check", icon: Search, desc: "Verify claims against a database of trusted sources." };
      case 'propaganda': return { title: "Propaganda Detection", icon: AlertOctagon, desc: "Identify persuasive techniques and bias in text." };
      case 'metadata': return { title: "Metadata Extraction", icon: Globe, desc: "View hidden file metadata and history." };
      case 'geo': return { title: "Geolocation Analysis", icon: Globe, desc: "Estimate location from visual cues in media." };
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
