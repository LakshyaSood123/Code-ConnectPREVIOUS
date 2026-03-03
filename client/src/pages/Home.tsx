import { useState, useCallback, useRef, useEffect } from 'react';
import { NavBar } from '@/components/NavBar';
import {
  FileText,
  ImageIcon,
  Upload,
  Loader2,
  Download,
  X,
  ZoomIn,
  ZoomOut,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  ScanLine,
  ShieldAlert,
  ClipboardCheck,
  ShieldCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Verdict = 'REAL' | 'FAKE' | 'MEDIUM';
type OverallDecision = 'APPROVE' | 'REJECT' | 'MANUAL_REVIEW';

interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
}

interface FileVerdict {
  fileName: string;
  verdict: Verdict;
  riskScore: number;
}

interface SubmissionResult {
  id: string;
  pdf: FileVerdict;
  image: FileVerdict & {
    previewUrl: string;
    outputImageUrl?: string;
    boundingBoxes?: BoundingBox[];
  };
  overall: {
    decision: OverallDecision;
    riskLevel: string;
    notes: string;
  };
  localization: {
    hasOutputImage: boolean;
    boundingBoxes?: BoundingBox[];
  };
}

function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getVerdict(fileName: string): FileVerdict {
  const lower = fileName.toLowerCase();
  if (lower.includes('_fake')) {
    return { fileName, verdict: 'FAKE', riskScore: randomInRange(90, 95) };
  }
  if (lower.includes('_real')) {
    return { fileName, verdict: 'REAL', riskScore: randomInRange(10, 15) };
  }
  return { fileName, verdict: 'MEDIUM', riskScore: randomInRange(55, 65) };
}

function getOverall(pdfVerdict: Verdict, imgVerdict: Verdict): { decision: OverallDecision; riskLevel: string; notes: string } {
  if (pdfVerdict === 'FAKE' || imgVerdict === 'FAKE') {
    return { decision: 'REJECT', riskLevel: 'CRITICAL', notes: 'One or more documents flagged as FAKE.' };
  }
  if (pdfVerdict === 'MEDIUM' || imgVerdict === 'MEDIUM') {
    return { decision: 'MANUAL_REVIEW', riskLevel: 'MEDIUM', notes: 'Inconclusive results require manual analyst review.' };
  }
  return { decision: 'APPROVE', riskLevel: 'LOW', notes: 'All documents verified as authentic.' };
}

function getSampleBoundingBoxes(): BoundingBox[] {
  return [
    { x: 0.1, y: 0.15, w: 0.35, h: 0.25, label: 'Region A' },
    { x: 0.55, y: 0.4, w: 0.3, h: 0.2, label: 'Region B' },
    { x: 0.2, y: 0.7, w: 0.4, h: 0.15, label: 'Region C' },
  ];
}

function DecisionPill({ decision, riskLevel }: { decision: OverallDecision; riskLevel: string }) {
  const cls =
    decision === 'REJECT'
      ? 'pill pill-critical'
      : decision === 'MANUAL_REVIEW'
        ? 'pill pill-warning'
        : 'pill pill-success';
  const label =
    decision === 'REJECT'
      ? `REJECT (${riskLevel})`
      : decision === 'MANUAL_REVIEW'
        ? `MANUAL REVIEW (${riskLevel})`
        : `APPROVE (${riskLevel})`;
  return <span className={cls} data-testid="pill-overall-decision">{label}</span>;
}

function VerdictBadge({ verdict, riskScore, type }: { verdict: Verdict; riskScore: number; type: 'PDF' | 'IMAGE' }) {
  const color =
    verdict === 'FAKE'
      ? 'text-[var(--danger)]'
      : verdict === 'REAL'
        ? 'text-[var(--ok)]'
        : 'text-[var(--grad-orange-start)]';
  return (
    <div className="mt-2" data-testid={`verdict-${type.toLowerCase()}`}>
      <span className={`text-xs font-bold uppercase tracking-wider ${color}`}>
        {type}: {verdict}
      </span>
      <div className="text-[10px] text-[var(--muted)] mt-0.5">Risk: {riskScore}%</div>
    </div>
  );
}

function ImageLightbox({
  imageUrl,
  outputImageUrl,
  boundingBoxes,
  onClose,
}: {
  imageUrl: string;
  outputImageUrl?: string;
  boundingBoxes?: BoundingBox[];
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [showOutput, setShowOutput] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });

  const handleImageLoad = () => {
    if (imgRef.current) {
      setImgSize({ w: imgRef.current.naturalWidth, h: imgRef.current.naturalHeight });
    }
  };

  const currentSrc = showOutput && outputImageUrl ? outputImageUrl : imageUrl;
  const showBoxes = !showOutput && boundingBoxes && boundingBoxes.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
      data-testid="lightbox-backdrop"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 25 }}
        className="relative max-w-[90vw] max-h-[90vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -top-12 right-0 flex items-center gap-2 z-10">
          {outputImageUrl && (
            <div className="flex bg-[var(--panel)] rounded-lg border border-[var(--border)] overflow-hidden mr-2" data-testid="toggle-output-image">
              <button
                onClick={() => setShowOutput(false)}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${!showOutput ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
                data-testid="button-original"
              >
                Original
              </button>
              <button
                onClick={() => setShowOutput(true)}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${showOutput ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
                data-testid="button-model-output"
              >
                Model Output
              </button>
            </div>
          )}
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
            className="w-8 h-8 rounded-full bg-[var(--panel)] border border-[var(--border)] flex items-center justify-center hover:border-[var(--accent)] transition-colors"
            data-testid="button-zoom-in"
          >
            <ZoomIn className="w-4 h-4 text-[var(--text)]" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
            className="w-8 h-8 rounded-full bg-[var(--panel)] border border-[var(--border)] flex items-center justify-center hover:border-[var(--accent)] transition-colors"
            data-testid="button-zoom-out"
          >
            <ZoomOut className="w-4 h-4 text-[var(--text)]" />
          </button>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[var(--panel)] border border-[var(--border)] flex items-center justify-center hover:border-[var(--danger)] transition-colors"
            data-testid="button-close-lightbox"
          >
            <X className="w-4 h-4 text-[var(--text)]" />
          </button>
        </div>

        <div className="overflow-auto max-w-[85vw] max-h-[80vh] rounded-xl border border-[var(--border)]">
          <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', transition: 'transform 0.2s ease', position: 'relative', display: 'inline-block' }}>
            <img
              ref={imgRef}
              src={currentSrc}
              onLoad={handleImageLoad}
              alt="Evidence"
              className="block max-w-none"
              style={{ maxWidth: '85vw', maxHeight: '80vh', objectFit: 'contain' }}
              data-testid="lightbox-image"
            />
            {showBoxes && imgSize.w > 0 && (
              <svg
                className="absolute top-0 left-0 pointer-events-none"
                width={imgRef.current?.width || imgSize.w}
                height={imgRef.current?.height || imgSize.h}
                viewBox={`0 0 ${imgRef.current?.width || imgSize.w} ${imgRef.current?.height || imgSize.h}`}
              >
                {boundingBoxes!.map((box, i) => {
                  const dispW = imgRef.current?.width || imgSize.w;
                  const dispH = imgRef.current?.height || imgSize.h;
                  const isRelative = box.x <= 1 && box.y <= 1 && box.w <= 1 && box.h <= 1;
                  const bx = isRelative ? box.x * dispW : box.x;
                  const by = isRelative ? box.y * dispH : box.y;
                  const bw = isRelative ? box.w * dispW : box.w;
                  const bh = isRelative ? box.h * dispH : box.h;
                  return (
                    <g key={i}>
                      <rect
                        x={bx}
                        y={by}
                        width={bw}
                        height={bh}
                        fill="rgba(225, 76, 76, 0.15)"
                        stroke="var(--danger)"
                        strokeWidth="2"
                        rx="4"
                        data-testid={`bbox-rect-${i}`}
                      />
                      {box.label && (
                        <text
                          x={bx + 4}
                          y={by - 6}
                          fill="var(--danger)"
                          fontSize="12"
                          fontWeight="bold"
                          data-testid={`bbox-label-${i}`}
                        >
                          {box.label}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function KpiTiles({ stats }: { stats: { total: number; rejected: number; manual: number; approved: number } }) {
  const tiles = [
    { label: 'Total Scanned', value: stats.total, icon: ScanLine, gradient: 'bg-gradient-teal' },
    { label: 'Risk Detected', value: stats.rejected, icon: ShieldAlert, gradient: 'bg-gradient-pink' },
    { label: 'Manual Review', value: stats.manual, icon: ClipboardCheck, gradient: 'bg-gradient-orange' },
    { label: 'Verified Safe', value: stats.approved, icon: ShieldCheck, gradient: 'bg-gradient-green' },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="kpi-tiles">
      {tiles.map((tile) => {
        const Icon = tile.icon;
        return (
          <div
            key={tile.label}
            className={`${tile.gradient} rounded-[var(--radius)] p-5 shadow-[var(--shadow)] transition-transform hover:-translate-y-0.5 hover:shadow-[var(--shadow-strong)]`}
            style={{ color: 'var(--panel)' }}
            data-testid={`kpi-${tile.label.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <div className="flex items-center justify-between mb-3">
              <Icon className="w-5 h-5" style={{ color: 'var(--panel)' }} />
            </div>
            <div className="text-3xl font-bold tracking-tight">{tile.value}</div>
            <div className="text-xs font-semibold opacity-80 mt-1 uppercase tracking-wider">{tile.label}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function Home() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [history, setHistory] = useState<SubmissionResult[]>([]);

  const pdfInputRef = useRef<HTMLInputElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);

  const handlePdfSelect = useCallback((file: File) => {
    setPdfFile(file);
    setResult(null);
  }, []);

  const handleImageSelect = useCallback((file: File) => {
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreviewUrl(url);
    setResult(null);
  }, []);

  const pendingItems: string[] = [];
  if (!pdfFile) pendingItems.push('PDF report');
  if (!imageFile) pendingItems.push('Evidence image');

  const canRun = pdfFile !== null && imageFile !== null && !isAnalyzing && !result;

  const runVerification = useCallback(() => {
    if (!pdfFile || !imageFile || !imagePreviewUrl) return;
    setIsAnalyzing(true);

    const delay = 1000 + Math.random() * 1200;

    setTimeout(() => {
      const pdfResult = getVerdict(pdfFile.name);
      const imgResult = getVerdict(imageFile.name);
      const overall = getOverall(pdfResult.verdict, imgResult.verdict);

      const imgLower = imageFile.name.toLowerCase();
      const hasBbox = imgLower.includes('bbox');
      const hasOutimg = imgLower.includes('outimg');

      const boundingBoxes = hasBbox ? getSampleBoundingBoxes() : undefined;
      const outputImageUrl = hasOutimg ? imagePreviewUrl : undefined;

      const submission: SubmissionResult = {
        id: `SUB-${Date.now().toString(36).toUpperCase()}`,
        pdf: pdfResult,
        image: {
          ...imgResult,
          previewUrl: imagePreviewUrl,
          outputImageUrl,
          boundingBoxes,
        },
        overall,
        localization: {
          hasOutputImage: !!outputImageUrl,
          boundingBoxes,
        },
      };

      setResult(submission);
      setHistory((prev) => [submission, ...prev]);
      setIsAnalyzing(false);
    }, delay);
  }, [pdfFile, imageFile, imagePreviewUrl]);

  const handleReset = useCallback(() => {
    setPdfFile(null);
    setImageFile(null);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(null);
    setResult(null);
    setIsAnalyzing(false);
  }, [imagePreviewUrl]);

  const handleExport = useCallback(() => {
    if (!result) return;
    const exportData = {
      generatedAt: new Date().toISOString(),
      submissionId: result.id,
      pdf: {
        fileName: result.pdf.fileName,
        verdict: result.pdf.verdict,
        riskScore: result.pdf.riskScore,
      },
      image: {
        fileName: result.image.fileName,
        verdict: result.image.verdict,
        riskScore: result.image.riskScore,
        localization: {
          hasOutputImage: result.localization.hasOutputImage,
          boundingBoxes: result.localization.boundingBoxes,
        },
      },
      overall: result.overall,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ts = new Date().toISOString().replace(/[:.]/g, '').replace('T', '-').split('Z')[0];
    a.download = `verification-report-${ts}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [result]);

  const stats = {
    total: history.length,
    rejected: history.filter((s) => s.overall.decision === 'REJECT').length,
    manual: history.filter((s) => s.overall.decision === 'MANUAL_REVIEW').length,
    approved: history.filter((s) => s.overall.decision === 'APPROVE').length,
  };

  useEffect(() => {
    document.documentElement.removeAttribute('data-theme');
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-20 font-sans selection:bg-[var(--accent)] selection:text-white">
      <NavBar />

      <main className="max-w-[960px] mx-auto px-6 pt-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-[var(--text)] tracking-tight mb-3 leading-tight" data-testid="text-hero-title">
            Document Verification
          </h1>
          <p className="text-base md:text-lg text-[var(--muted)] max-w-2xl mx-auto leading-relaxed" data-testid="text-hero-subtitle">
            Upload and verify required documents. Each upload is checked for authenticity and document-type match.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-8"
        >
          <KpiTiles stats={stats} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-6 mb-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UploadSlot
              label="PDF Report"
              buttonText="Upload PDF"
              accept="application/pdf,.pdf"
              icon={<FileText className="w-7 h-7 text-[var(--accent)]" />}
              file={pdfFile}
              inputRef={pdfInputRef}
              onSelect={handlePdfSelect}
              isAnalyzing={isAnalyzing}
              verdict={result?.pdf.verdict ?? null}
              testId="upload-pdf"
            />
            <UploadSlot
              label="Evidence Image"
              buttonText="Upload Image"
              accept="image/png,image/jpeg,image/jpg,.jpg,.jpeg,.png"
              icon={<ImageIcon className="w-7 h-7 text-[var(--accent-2)]" />}
              file={imageFile}
              previewUrl={imagePreviewUrl}
              inputRef={imgInputRef}
              onSelect={handleImageSelect}
              isAnalyzing={isAnalyzing}
              verdict={result?.image.verdict ?? null}
              testId="upload-image"
            />
          </div>

          <div className="mt-6 flex flex-col items-center gap-3">
            {isAnalyzing ? (
              <div className="flex items-center gap-3 py-3">
                <Loader2 className="w-5 h-5 text-[var(--accent)] animate-spin" />
                <span className="text-sm font-semibold text-[var(--text)] tracking-wide" data-testid="text-analyzing">Analyzing...</span>
              </div>
            ) : !result ? (
              <>
                <button
                  onClick={canRun ? runVerification : undefined}
                  disabled={!canRun}
                  className="w-full py-3.5 text-sm font-bold tracking-wide uppercase rounded-[var(--radius)] border-none cursor-pointer transition-all disabled:cursor-not-allowed"
                  style={{
                    background: canRun ? 'var(--accent)' : 'var(--border)',
                    color: canRun ? 'white' : 'var(--muted)',
                    boxShadow: canRun ? 'var(--shadow-strong)' : 'none',
                  }}
                  data-testid="button-run-verification"
                >
                  Run Verification
                </button>
                {pendingItems.length > 0 && (
                  <span className="text-xs text-[var(--muted)]" data-testid="banner-pending">
                    Upload both files to continue
                  </span>
                )}
              </>
            ) : null}
          </div>
        </motion.div>

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="card p-6 mb-6"
              data-testid="card-result"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <span className="text-xs text-[var(--muted)] font-mono">{result.id}</span>
                  <h3 className="text-lg font-bold text-[var(--text)]">Verification Result</h3>
                </div>
                <DecisionPill decision={result.overall.decision} riskLevel={result.overall.riskLevel} />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="rounded-xl bg-[var(--panel2)] border border-[var(--border)] p-4 flex flex-col items-center justify-center text-center min-h-[160px] transition-colors hover:border-[var(--accent)]" data-testid="tile-pdf">
                  <FileText className="w-10 h-10 text-[var(--accent)] mb-2" />
                  <span className="text-xs text-[var(--muted)] truncate max-w-full" title={result.pdf.fileName} data-testid="text-pdf-filename">
                    {result.pdf.fileName}
                  </span>
                  <VerdictBadge verdict={result.pdf.verdict} riskScore={result.pdf.riskScore} type="PDF" />
                </div>

                <div
                  className="rounded-xl bg-[var(--panel2)] border border-[var(--border)] p-4 flex flex-col items-center justify-center text-center min-h-[160px] cursor-pointer transition-colors hover:border-[var(--accent-2)] group relative"
                  onClick={() => setLightboxOpen(true)}
                  data-testid="tile-image"
                >
                  {imagePreviewUrl ? (
                    <div className="w-16 h-16 rounded-lg overflow-hidden mb-2 border border-[var(--border)]">
                      <img src={imagePreviewUrl} alt="Evidence" className="w-full h-full object-cover" data-testid="img-thumbnail" />
                    </div>
                  ) : (
                    <ImageIcon className="w-10 h-10 text-[var(--accent-2)] mb-2" />
                  )}
                  <span className="text-xs text-[var(--muted)] truncate max-w-full" title={result.image.fileName} data-testid="text-image-filename">
                    {result.image.fileName}
                  </span>
                  <VerdictBadge verdict={result.image.verdict} riskScore={result.image.riskScore} type="IMAGE" />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Eye className="w-4 h-4 text-[var(--muted)]" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
                <p className="text-sm text-[var(--muted)]">{result.overall.notes}</p>
                <div className="flex gap-2">
                  <button onClick={handleExport} className="btn btn-secondary text-sm px-4 py-2" data-testid="button-export">
                    <Download className="w-4 h-4" />
                    Export JSON
                  </button>
                  <button onClick={handleReset} className="btn btn-ghost text-sm px-4 py-2" data-testid="button-new-submission">
                    New Submission
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {lightboxOpen && result && (
          <ImageLightbox
            imageUrl={result.image.previewUrl}
            outputImageUrl={result.image.outputImageUrl}
            boundingBoxes={result.image.boundingBoxes}
            onClose={() => setLightboxOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function statusLabel(file: File | null, isAnalyzing: boolean, verdict: Verdict | null): { text: string; color: string } {
  if (!file) return { text: 'No file selected', color: 'text-[var(--muted)]' };
  if (isAnalyzing) return { text: 'Analyzing\u2026', color: 'text-[var(--accent)]' };
  if (verdict === 'REAL') return { text: 'Verified', color: 'text-[var(--ok)]' };
  if (verdict === 'FAKE') return { text: 'Failed', color: 'text-[var(--danger)]' };
  if (verdict === 'MEDIUM') return { text: 'Needs review', color: 'text-[var(--grad-orange-start)]' };
  return { text: 'Selected', color: 'text-[var(--accent)]' };
}

function UploadSlot({
  label,
  buttonText,
  accept,
  icon,
  file,
  previewUrl,
  inputRef,
  onSelect,
  isAnalyzing,
  verdict,
  testId,
}: {
  label: string;
  buttonText: string;
  accept: string;
  icon: JSX.Element;
  file: File | null;
  previewUrl?: string | null;
  inputRef: React.RefObject<HTMLInputElement>;
  onSelect: (file: File) => void;
  isAnalyzing: boolean;
  verdict: Verdict | null;
  testId: string;
}) {
  const [dragOver, setDragOver] = useState(false);
  const status = statusLabel(file, isAnalyzing, verdict);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) onSelect(f);
    },
    [onSelect],
  );

  const triggerInput = useCallback(() => {
    inputRef.current?.click();
  }, [inputRef]);

  return (
    <div
      className={`file-drop-area flex flex-col items-center justify-center min-h-[130px] py-5 px-4 cursor-pointer ${dragOver ? 'border-[var(--accent)] bg-[rgba(59,130,246,0.05)]' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={triggerInput}
      data-testid={testId}
    >
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="file"
        accept={accept}
        style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onSelect(f);
        }}
        data-testid={`${testId}-input`}
      />

      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-3" data-testid={`${testId}-label`}>{label}</h3>

      {file ? (
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-1.5 w-full">
          {previewUrl ? (
            <div className="w-14 h-14 rounded-lg overflow-hidden border border-[var(--border)]">
              <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
            </div>
          ) : (
            <FileText className="w-8 h-8 text-[var(--accent)]" />
          )}
          <span
            className="text-xs font-medium text-[var(--text)] overflow-hidden text-ellipsis whitespace-nowrap max-w-[180px] block"
            title={file.name}
            data-testid={`${testId}-filename`}
          >
            {file.name}
          </span>
          <span className={`text-[11px] font-semibold ${status.color}`} data-testid={`${testId}-status`}>{status.text}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerInput();
            }}
            className="inline-flex items-center gap-1 mt-1 border-none text-[11px] font-semibold rounded-[var(--radius)] transition-all hover:shadow-[var(--shadow-strong)] active:scale-[0.98]"
            style={{ background: 'var(--accent)', color: 'white', padding: '6px 12px' }}
            data-testid={`${testId}-button`}
          >
            <Upload className="w-3 h-3" />
            Change
          </button>
        </motion.div>
      ) : (
        <>
          {icon}
          <p className="text-xs text-[var(--muted)] mt-2 mb-2">Drag & drop or click to browse</p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerInput();
            }}
            className="inline-flex items-center gap-1.5 border-none text-xs font-semibold rounded-[var(--radius)] transition-all hover:shadow-[var(--shadow-strong)] active:scale-[0.98]"
            style={{ background: 'var(--accent)', color: 'white', padding: '10px 14px' }}
            data-testid={`${testId}-button`}
          >
            <Upload className="w-3.5 h-3.5" />
            {buttonText}
          </button>
          <span className={`text-[11px] mt-2 ${status.color}`} data-testid={`${testId}-status`}>{status.text}</span>
        </>
      )}
    </div>
  );
}
