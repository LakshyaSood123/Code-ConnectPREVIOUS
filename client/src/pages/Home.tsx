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

interface ImperfectionCircle {
  cx: number;
  cy: number;
  r: number;
  label: string;
  severity: 'low' | 'medium' | 'high';
}

interface LocalizationPoint {
  x: number;
  y: number;
}

interface ForgeryLocalization {
  points: LocalizationPoint[];
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
    circles?: ImperfectionCircle[];
    forgeryLocalization?: ForgeryLocalization | null;
  };
  overall: {
    decision: OverallDecision;
    riskLevel: string;
    notes: string;
  };
  localization: {
    hasOutputImage: boolean;
    boundingBoxes?: BoundingBox[];
    circles?: ImperfectionCircle[];
    forgeryLocalization?: ForgeryLocalization | null;
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

function getSampleCircles(): ImperfectionCircle[] {
  return [
    { cx: 0.25, cy: 0.3, r: 0.06, label: 'Splicing artifact', severity: 'high' },
    { cx: 0.7, cy: 0.2, r: 0.045, label: 'Noise inconsistency', severity: 'medium' },
    { cx: 0.5, cy: 0.65, r: 0.055, label: 'Clone region', severity: 'high' },
    { cx: 0.15, cy: 0.75, r: 0.035, label: 'JPEG ghost', severity: 'low' },
  ];
}

function getDemoForgeryPoints(): ForgeryLocalization {
  return {
    points: [
      { x: 0.28, y: 0.22 },
      { x: 0.62, y: 0.26 },
      { x: 0.58, y: 0.62 },
      { x: 0.24, y: 0.56 },
    ],
  };
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
  circles,
  forgeryLocalization,
  onClose,
}: {
  imageUrl: string;
  outputImageUrl?: string;
  boundingBoxes?: BoundingBox[];
  circles?: ImperfectionCircle[];
  forgeryLocalization?: ForgeryLocalization | null;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [showOutput, setShowOutput] = useState(false);
  const [hoveredCircle, setHoveredCircle] = useState<number | null>(null);
  const [showCallout, setShowCallout] = useState(false);
  const calloutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });

  const enterCallout = useCallback(() => {
    if (calloutTimer.current) { clearTimeout(calloutTimer.current); calloutTimer.current = null; }
    setShowCallout(true);
  }, []);
  const leaveCallout = useCallback(() => {
    calloutTimer.current = setTimeout(() => setShowCallout(false), 100);
  }, []);

  const handleImageLoad = () => {
    if (imgRef.current) {
      setImgSize({ w: imgRef.current.naturalWidth, h: imgRef.current.naturalHeight });
    }
  };

  const currentSrc = showOutput && outputImageUrl ? outputImageUrl : imageUrl;
  const showBoxes = !showOutput && boundingBoxes && boundingBoxes.length > 0;
  const showCircles = !showOutput && circles && circles.length > 0;
  const showPolygon = !showOutput && forgeryLocalization && forgeryLocalization.points.length > 0;

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
        <div className="absolute -top-10 right-0 flex items-center gap-1.5 z-10">
          {outputImageUrl && (
            <div className="flex bg-[var(--panel2)] rounded-md border border-[var(--border)] overflow-hidden mr-1.5" style={{ boxShadow: 'var(--shadow)' }} data-testid="toggle-output-image">
              <button
                onClick={() => setShowOutput(false)}
                className={`px-2.5 py-1 text-[10px] font-semibold tracking-wide uppercase transition-colors ${!showOutput ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
                data-testid="button-original"
              >
                Original
              </button>
              <button
                onClick={() => setShowOutput(true)}
                className={`px-2.5 py-1 text-[10px] font-semibold tracking-wide uppercase transition-colors ${showOutput ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
                data-testid="button-model-output"
              >
                Model Output
              </button>
            </div>
          )}
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
            className="w-7 h-7 rounded-md bg-[var(--panel2)] border border-[var(--border)] flex items-center justify-center hover:border-[var(--accent)] hover:bg-[var(--panel)] transition-all"
            style={{ boxShadow: 'var(--shadow)' }}
            data-testid="button-zoom-in"
          >
            <ZoomIn className="w-3.5 h-3.5 text-[var(--text)]" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
            className="w-7 h-7 rounded-md bg-[var(--panel2)] border border-[var(--border)] flex items-center justify-center hover:border-[var(--accent)] hover:bg-[var(--panel)] transition-all"
            style={{ boxShadow: 'var(--shadow)' }}
            data-testid="button-zoom-out"
          >
            <ZoomOut className="w-3.5 h-3.5 text-[var(--text)]" />
          </button>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md bg-[var(--panel2)] border border-[var(--border)] flex items-center justify-center hover:border-[var(--danger)] hover:bg-[var(--panel)] transition-all"
            style={{ boxShadow: 'var(--shadow)' }}
            data-testid="button-close-lightbox"
          >
            <X className="w-3.5 h-3.5 text-[var(--text)]" />
          </button>
        </div>

        <div className="overflow-auto max-w-[85vw] max-h-[75vh] rounded-xl border border-[var(--border)]">
          <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', transition: 'transform 0.2s ease', position: 'relative', display: 'inline-block' }}>
            <img
              ref={imgRef}
              src={currentSrc}
              onLoad={handleImageLoad}
              alt="Evidence"
              className="block max-w-none"
              style={{ maxWidth: '85vw', maxHeight: '75vh', objectFit: 'contain' }}
              data-testid="lightbox-image"
            />
            {showPolygon && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'rgba(0,0,0,0.18)' }}
                data-testid="forgery-dimmer"
              />
            )}
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
            {showCircles && imgSize.w > 0 && (
              <svg
                className="absolute top-0 left-0"
                style={{ pointerEvents: 'none' }}
                width={imgRef.current?.width || imgSize.w}
                height={imgRef.current?.height || imgSize.h}
                viewBox={`0 0 ${imgRef.current?.width || imgSize.w} ${imgRef.current?.height || imgSize.h}`}
                data-testid="circles-overlay"
              >
                {circles!.map((c, i) => {
                  const dispW = imgRef.current?.width || imgSize.w;
                  const dispH = imgRef.current?.height || imgSize.h;
                  const cx = c.cx * dispW;
                  const cy = c.cy * dispH;
                  const r = c.r * Math.min(dispW, dispH);
                  const strokeW = c.severity === 'high' ? 3 : c.severity === 'medium' ? 2.5 : 2;
                  const fillOpacity = c.severity === 'high' ? 0.18 : c.severity === 'medium' ? 0.12 : 0.08;
                  return (
                    <g
                      key={i}
                      style={{ pointerEvents: 'all', cursor: 'pointer' }}
                      onMouseEnter={() => setHoveredCircle(i)}
                      onMouseLeave={() => setHoveredCircle(null)}
                      data-testid={`circle-group-${i}`}
                    >
                      <circle
                        cx={cx}
                        cy={cy}
                        r={r}
                        fill={`rgba(225, 76, 76, ${fillOpacity})`}
                        stroke="var(--danger)"
                        strokeWidth={strokeW}
                        strokeDasharray={c.severity === 'low' ? '4 3' : 'none'}
                        data-testid={`circle-${i}`}
                      />
                      {hoveredCircle === i && (
                        <g>
                          <rect
                            x={cx + r + 6}
                            y={cy - 14}
                            width={c.label.length * 7.2 + 16}
                            height={24}
                            rx={6}
                            fill="var(--panel)"
                            stroke="var(--danger)"
                            strokeWidth={1}
                          />
                          <text
                            x={cx + r + 14}
                            y={cy + 1}
                            fill="var(--danger)"
                            fontSize="11"
                            fontWeight="600"
                            data-testid={`circle-tooltip-${i}`}
                          >
                            {c.label}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </svg>
            )}
            {showPolygon && (() => {
              const dW = imgRef.current?.width || imgSize.w || 400;
              const dH = imgRef.current?.height || imgSize.h || 400;
              const pts = forgeryLocalization!.points;
              const polyStr = pts.map(p => `${p.x * dW},${p.y * dH}`).join(' ');
              const topRight = pts.reduce((best, p) => (p.x + (1 - p.y) > best.x + (1 - best.y) ? p : best), pts[0]);
              const anchorX = topRight.x * dW;
              const anchorY = topRight.y * dH;
              const calloutX = anchorX + 28;
              const calloutY = Math.max(anchorY - 40, 8);
              return (
                <>
                  <svg
                    className="absolute top-0 left-0"
                    width={dW}
                    height={dH}
                    viewBox={`0 0 ${dW} ${dH}`}
                    style={{ zIndex: 1, pointerEvents: 'none' }}
                    data-testid="forgery-polygon-overlay"
                  >
                    <polygon
                      points={polyStr}
                      fill="transparent"
                      stroke="transparent"
                      strokeWidth="20"
                      style={{ pointerEvents: 'all', cursor: 'pointer' }}
                      onMouseEnter={enterCallout}
                      onMouseLeave={leaveCallout}
                    />
                    <polygon
                      points={polyStr}
                      fill="transparent"
                      stroke="var(--danger)"
                      strokeWidth={showCallout ? '2.5' : '2'}
                      strokeLinejoin="round"
                      style={{ pointerEvents: 'none', transition: 'stroke-width 0.15s ease' }}
                      data-testid="forgery-polygon"
                    />
                    {pts.map((p, i) => (
                      <circle
                        key={i}
                        cx={p.x * dW}
                        cy={p.y * dH}
                        r={showCallout ? 4.5 : 3.5}
                        fill="var(--danger)"
                        stroke="var(--panel)"
                        strokeWidth="1.5"
                        style={{ pointerEvents: 'all', cursor: 'pointer', transition: 'r 0.15s ease' }}
                        onMouseEnter={enterCallout}
                        onMouseLeave={leaveCallout}
                        data-testid={`forgery-dot-${i}`}
                      />
                    ))}
                    <line
                      x1={anchorX}
                      y1={anchorY}
                      x2={calloutX}
                      y2={calloutY + 40}
                      stroke="var(--danger)"
                      strokeWidth="0.75"
                      strokeDasharray="3 2"
                      opacity={showCallout ? 0.9 : 0}
                      style={{ transition: 'opacity 0.18s ease', pointerEvents: 'none' }}
                    />
                  </svg>
                  <div
                    className="absolute"
                    style={{
                      left: calloutX,
                      top: calloutY - 72,
                      zIndex: 2,
                      opacity: showCallout ? 1 : 0,
                      transform: showCallout ? 'translateY(0) scale(1)' : 'translateY(4px) scale(0.98)',
                      pointerEvents: showCallout ? 'auto' : 'none',
                      transition: 'opacity 0.18s ease, transform 0.18s ease',
                    }}
                    onMouseEnter={enterCallout}
                    onMouseLeave={leaveCallout}
                    data-testid="forgery-callout"
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'stretch',
                      background: 'var(--panel)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      boxShadow: 'var(--shadow)',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                    }}>
                      <div style={{
                        width: '3px',
                        background: 'var(--danger)',
                        flexShrink: 0,
                      }} />
                      <div style={{ padding: '8px 12px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', lineHeight: '1.3', letterSpacing: '0.01em' }}>
                          AI discrepancy found
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: '1.4', marginTop: '3px' }}>
                          Potential manipulation region
                        </div>
                        <div style={{ borderTop: '1px solid var(--border)', marginTop: '6px', paddingTop: '5px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <div style={{ fontSize: '10px', color: 'var(--muted)', lineHeight: '1.4' }}>
                            <span style={{ color: 'var(--text)', fontWeight: 500 }}>Type:</span> Identity/text inconsistency
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--muted)', lineHeight: '1.4' }}>
                            <span style={{ color: 'var(--text)', fontWeight: 500 }}>Confidence:</span> 92%
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--danger)', fontWeight: 600, lineHeight: '1.4', marginTop: '1px' }}>
                            Review recommended
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {showPolygon && (
          <div
            style={{
              textAlign: 'center',
              padding: '8px 16px',
              marginTop: '6px',
              fontSize: '11px',
              color: 'var(--muted)',
              letterSpacing: '0.01em',
            }}
            data-testid="lightbox-footer-caption"
          >
            Flagged region detected in uploaded document. Review recommended before approval.
          </div>
        )}
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

  const canRun = Boolean(pdfFile) && Boolean(imageFile) && !isAnalyzing;

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
      const hasCircles = imgLower.includes('bbox') || imgLower.includes('circles');
      const hasOutimg = imgLower.includes('outimg');
      const hasFakeInName = imgLower.includes('_fake');

      const boundingBoxes = hasBbox ? getSampleBoundingBoxes() : undefined;
      const circles = (hasCircles && hasFakeInName) ? getSampleCircles() : undefined;
      const forgeryLocalization = hasFakeInName ? getDemoForgeryPoints() : null;
      const outputImageUrl = hasOutimg ? imagePreviewUrl : undefined;

      const submission: SubmissionResult = {
        id: `SUB-${Date.now().toString(36).toUpperCase()}`,
        pdf: pdfResult,
        image: {
          ...imgResult,
          previewUrl: imagePreviewUrl,
          outputImageUrl,
          boundingBoxes,
          circles,
          forgeryLocalization,
        },
        overall,
        localization: {
          hasOutputImage: !!outputImageUrl,
          boundingBoxes,
          circles,
          forgeryLocalization,
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
        localization: result.image.forgeryLocalization
          ? { points: result.image.forgeryLocalization.points }
          : null,
        overlays: {
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

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 0', gap: '8px', position: 'relative', zIndex: 1 }}>
            <button
              onClick={canRun && !result ? runVerification : undefined}
              disabled={!canRun || !!result}
              data-ready={String(canRun && !result)}
              data-testid="button-run-verification"
              style={{
                background: canRun ? 'var(--accent)' : 'var(--panel2)',
                color: canRun ? 'var(--panel)' : 'var(--muted)',
                border: canRun ? '2px solid var(--accent)' : '2px solid var(--border)',
                boxShadow: canRun ? 'var(--shadow-strong)' : 'var(--shadow)',
                minHeight: '52px',
                minWidth: '260px',
                width: '100%',
                fontSize: '15px',
                fontWeight: 700,
                opacity: 1,
                visibility: 'visible' as const,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                position: 'relative' as const,
                zIndex: 1,
                borderRadius: 'var(--radius)',
                letterSpacing: '0.05em',
                textTransform: 'uppercase' as const,
                cursor: canRun && !result ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
              }}
            >
              {isAnalyzing && <Loader2 className="w-4 h-4 animate-spin" />}
              {isAnalyzing ? 'Analyzing\u2026' : 'Run Verification'}
            </button>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }} data-testid="banner-pending">
              {result
                ? '\u00A0'
                : pendingItems.length > 0
                  ? 'Upload both files to continue'
                  : 'Ready to verify'}
            </span>
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
                    <div className="w-16 h-16 rounded-lg overflow-hidden mb-2 border border-[var(--border)]" style={{ position: 'relative' }}>
                      <img src={imagePreviewUrl} alt="Evidence" className="w-full h-full object-cover" data-testid="img-thumbnail" />
                      {result.image.forgeryLocalization && (
                        <svg
                          className="absolute top-0 left-0 pointer-events-none"
                          width="100%"
                          height="100%"
                          viewBox="0 0 1 1"
                          preserveAspectRatio="none"
                          data-testid="thumbnail-polygon-overlay"
                        >
                          <polygon
                            points={result.image.forgeryLocalization.points.map(p => `${p.x},${p.y}`).join(' ')}
                            fill="transparent"
                            stroke="var(--danger)"
                            strokeWidth="0.015"
                            strokeLinejoin="round"
                          />
                          {result.image.forgeryLocalization.points.map((p, i) => (
                            <circle key={i} cx={p.x} cy={p.y} r={0.015} fill="var(--danger)" stroke="var(--panel)" strokeWidth="0.005" />
                          ))}
                        </svg>
                      )}
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
            circles={result.image.circles}
            forgeryLocalization={result.image.forgeryLocalization}
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
