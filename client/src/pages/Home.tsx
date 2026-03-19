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
  Eye,
  ScanLine,
  ShieldAlert,
  ClipboardCheck,
  ShieldCheck,
  CreditCard,
  Activity,
  Receipt,
  Building2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronRight,
  GitMerge,
  Check,
  AlertTriangle,
  RefreshCw,
  PlayCircle,
} from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';

type Verdict = 'REAL' | 'FAKE' | 'MEDIUM';
type OverallDecision = 'APPROVE' | 'REJECT' | 'MANUAL_REVIEW';
type DocSection = 'aadhaar' | 'report' | 'image' | 'bill';
type SectionStatus = 'pending' | 'ready' | 'processed';
type CorrelationStatus = 'matched' | 'mismatch' | 'review' | 'na';

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

interface FraudFlag {
  id: string;
  label: string;
  severity: 'high' | 'medium' | 'low';
  section: DocSection | 'cross';
}

interface ExtractedData {
  aadhaar: {
    patientName: string;
    dob: string;
    aadhaarId: string;
    gender: string;
    identityMatchStatus: string;
  };
  report: {
    reportType: string;
    procedure: string;
    reportDate: string;
    hospital: string;
    patientName: string;
  };
  image: {
    imageType: string;
    linkedProcedure: string;
    visualMatch: 'Matched' | 'Needs Review' | 'Mismatch';
  };
  bill: {
    billedProcedure: string;
    totalAmount: string;
    billDate: string;
    hospital: string;
    patientName: string;
  };
}

interface CorrelationItem {
  field: string;
  sourceA?: string;
  sourceB?: string;
  sourceC?: string;
  labelA?: string;
  labelB?: string;
  labelC?: string;
  status: CorrelationStatus;
}

interface MedicalClaimResult {
  id: string;
  riskScore: number;
  verdict: 'Verified Safe' | 'Needs Manual Review' | 'High Fraud Risk';
  overallDecision: OverallDecision;
  fraudFlags: FraudFlag[];
  extracted: ExtractedData;
  correlation: CorrelationItem[];
  imageInfo: {
    previewUrl: string;
    forgeryLocalization?: ForgeryLocalization | null;
    circles?: ImperfectionCircle[];
    boundingBoxes?: BoundingBox[];
    outputImageUrl?: string;
    verdict: Verdict;
    riskScore: number;
  };
}

function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getVerdict(fileName: string): { verdict: Verdict; riskScore: number } {
  const lower = fileName.toLowerCase();
  if (lower.includes('_fake')) return { verdict: 'FAKE', riskScore: randomInRange(90, 95) };
  if (lower.includes('_real')) return { verdict: 'REAL', riskScore: randomInRange(10, 15) };
  return { verdict: 'MEDIUM', riskScore: randomInRange(55, 65) };
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

function detectProcedure(lower: string): string {
  if (lower.includes('xray') || lower.includes('x-ray') || lower.includes('x_ray')) return 'X-Ray';
  if (lower.includes('mri')) return 'MRI Scan';
  if (lower.includes('ct')) return 'CT Scan';
  if (lower.includes('lab') || lower.includes('path') || lower.includes('blood')) return 'Lab Test';
  if (lower.includes('echo')) return 'Echocardiogram';
  if (lower.includes('ultrasound') || lower.includes('usg')) return 'Ultrasound';
  return 'Medical Examination';
}

function getPatientName(lower: string): string {
  if (lower.includes('sharma')) return 'Rajesh Sharma';
  if (lower.includes('kumar')) return 'Priya Kumar';
  if (lower.includes('verma')) return 'Amit Verma';
  if (lower.includes('singh')) return 'Gurpreet Singh';
  if (lower.includes('rao')) return 'Suresh Rao';
  return 'Rohit Mehta';
}

function getHospital(lower: string): string {
  if (lower.includes('aiims')) return 'AIIMS Delhi';
  if (lower.includes('apollo')) return 'Apollo Hospitals';
  if (lower.includes('fortis')) return 'Fortis Healthcare';
  if (lower.includes('max')) return 'Max Super Speciality';
  if (lower.includes('medanta')) return 'Medanta — The Medicity';
  return 'City Medical Center';
}

function getBillAmount(procedure: string): string {
  const amounts: Record<string, string> = {
    'X-Ray': '₹2,400',
    'MRI Scan': '₹8,500',
    'CT Scan': '₹6,200',
    'Lab Test': '₹1,800',
    'Echocardiogram': '₹5,400',
    'Ultrasound': '₹3,200',
    'Medical Examination': '₹1,200',
  };
  return amounts[procedure] || '₹3,500';
}

function getMaskedAadhaar(lower: string): string {
  const seed = lower.charCodeAt(0) % 10;
  return `XXXX XXXX ${seed}${(seed + 3) % 10}${(seed + 7) % 10}${(seed + 1) % 10}`;
}

function runMedicalMockAnalysis(
  aadhaarFile: File,
  reportFile: File,
  imageFile: File,
  billFile: File,
  imagePreviewUrl: string,
): MedicalClaimResult {
  const aL = aadhaarFile.name.toLowerCase();
  const rL = reportFile.name.toLowerCase();
  const iL = imageFile.name.toLowerCase();
  const bL = billFile.name.toLowerCase();

  const reportProcedure = detectProcedure(rL);
  const imageProcedure = detectProcedure(iL);
  const billProcedure = detectProcedure(bL);

  const patientOnAadhaar = getPatientName(aL);
  const patientOnReport = getPatientName(rL);
  const patientOnBill = getPatientName(bL);

  const reportHospital = getHospital(rL);
  const billHospital = getHospital(bL);

  const reportDate = '12 Mar 2025';
  const billDate = bL.includes('old') || bL.includes('jan') ? '08 Jan 2025' : '14 Mar 2025';

  const flags: FraudFlag[] = [];

  if (aL.includes('_fake')) flags.push({ id: 'fake-patient', label: 'Fake Patient Suspected', severity: 'high', section: 'aadhaar' });
  if (rL.includes('_fake')) flags.push({ id: 'fake-report', label: 'Fake Report Suspected', severity: 'high', section: 'report' });
  if (iL.includes('_fake')) flags.push({ id: 'fake-image', label: 'Fake Diagnostic Image', severity: 'high', section: 'image' });
  if (bL.includes('_fake')) flags.push({ id: 'fake-bill', label: 'Fake Bill Suspected', severity: 'high', section: 'bill' });

  const isEditedBill = /edited|revised|final2|scan_copy|invoice_new|copy\d|v2|v3/.test(bL);
  if (isEditedBill) flags.push({ id: 'edited-bill', label: 'Edited Bill Detected', severity: 'high', section: 'bill' });
  if (bL.includes('inflated')) flags.push({ id: 'inflated', label: 'Inflated Billing Risk', severity: 'medium', section: 'bill' });

  const procMismatch = reportProcedure !== billProcedure;
  if (procMismatch) flags.push({ id: 'proc-mismatch', label: 'Procedure Mismatch', severity: 'high', section: 'cross' });

  const identityMismatch = patientOnAadhaar !== patientOnBill;
  if (identityMismatch) flags.push({ id: 'identity-mismatch', label: 'Identity Mismatch', severity: 'medium', section: 'cross' });

  const imageMismatch =
    imageProcedure !== 'Medical Examination' &&
    reportProcedure !== 'Medical Examination' &&
    imageProcedure !== reportProcedure;
  if (imageMismatch) flags.push({ id: 'image-mismatch', label: 'Diagnostic Image Mismatch', severity: 'medium', section: 'image' });

  const providerMismatch = reportHospital !== billHospital;
  if (providerMismatch) flags.push({ id: 'provider-mismatch', label: 'Provider Mismatch', severity: 'medium', section: 'cross' });

  const dateInconsistent = billDate !== '14 Mar 2025';
  if (dateInconsistent) flags.push({ id: 'date-inconsistency', label: 'Date Inconsistency', severity: 'low', section: 'cross' });

  let risk = 8;
  if (aL.includes('_fake')) risk += 25;
  if (rL.includes('_fake')) risk += 22;
  if (iL.includes('_fake')) risk += 20;
  if (bL.includes('_fake')) risk += 20;
  if (isEditedBill) risk += 18;
  if (procMismatch) risk += 15;
  if (identityMismatch) risk += 10;
  if (imageMismatch) risk += 8;
  if (providerMismatch) risk += 6;
  if (dateInconsistent) risk += 4;
  risk = Math.min(risk, 98);

  let verdict: MedicalClaimResult['verdict'];
  let overallDecision: OverallDecision;
  if (risk >= 60) { verdict = 'High Fraud Risk'; overallDecision = 'REJECT'; }
  else if (risk >= 28) { verdict = 'Needs Manual Review'; overallDecision = 'MANUAL_REVIEW'; }
  else { verdict = 'Verified Safe'; overallDecision = 'APPROVE'; }

  const hasBbox = iL.includes('bbox');
  const hasCircles = (iL.includes('bbox') || iL.includes('circles')) && iL.includes('_fake');
  const hasFake = iL.includes('_fake');
  const hasOutimg = iL.includes('outimg');
  const imgV = getVerdict(imageFile.name);

  const extracted: ExtractedData = {
    aadhaar: {
      patientName: patientOnAadhaar,
      dob: '15 Aug 1985',
      aadhaarId: getMaskedAadhaar(aL),
      gender: (aL.includes('priya') || aL.includes('female')) ? 'Female' : 'Male',
      identityMatchStatus: identityMismatch ? 'Mismatch Detected' : 'Matched',
    },
    report: {
      reportType: reportProcedure,
      procedure: reportProcedure,
      reportDate,
      hospital: reportHospital,
      patientName: patientOnReport,
    },
    image: {
      imageType: imageProcedure === 'Medical Examination' ? `${reportProcedure} Image` : `${imageProcedure} Image`,
      linkedProcedure: reportProcedure,
      visualMatch: imageMismatch ? 'Mismatch' : 'Matched',
    },
    bill: {
      billedProcedure: billProcedure,
      totalAmount: getBillAmount(billProcedure),
      billDate,
      hospital: billHospital,
      patientName: patientOnBill,
    },
  };

  const allNamesMatch = patientOnAadhaar === patientOnReport && patientOnReport === patientOnBill;
  const correlation: CorrelationItem[] = [
    {
      field: 'Patient Name',
      sourceA: patientOnAadhaar,
      sourceB: patientOnReport,
      sourceC: patientOnBill,
      labelA: 'Aadhaar',
      labelB: 'Report',
      labelC: 'Bill',
      status: allNamesMatch ? 'matched' : 'mismatch',
    },
    {
      field: 'Procedure',
      sourceA: reportProcedure,
      sourceB: billProcedure,
      labelA: 'Diagnostic Report',
      labelB: 'Bill',
      status: procMismatch ? 'mismatch' : 'matched',
    },
    {
      field: 'Hospital / Provider',
      sourceA: reportHospital,
      sourceB: billHospital,
      labelA: 'Report',
      labelB: 'Bill',
      status: providerMismatch ? 'review' : 'matched',
    },
    {
      field: 'Document Date',
      sourceA: reportDate,
      sourceB: billDate,
      labelA: 'Report Date',
      labelB: 'Bill Date',
      status: dateInconsistent ? 'review' : 'matched',
    },
    {
      field: 'Diagnostic Image Consistency',
      sourceA: `${reportProcedure} expected`,
      sourceB: imageMismatch ? `${imageProcedure} detected` : `${reportProcedure} detected`,
      labelA: 'Report Type',
      labelB: 'Image Detected',
      status: imageMismatch ? 'mismatch' : 'matched',
    },
  ];

  return {
    id: `CLAIM-${Date.now().toString(36).toUpperCase()}`,
    riskScore: risk,
    verdict,
    overallDecision,
    fraudFlags: flags,
    extracted,
    correlation,
    imageInfo: {
      previewUrl: imagePreviewUrl,
      forgeryLocalization: hasFake ? getDemoForgeryPoints() : null,
      circles: hasCircles ? getSampleCircles() : undefined,
      boundingBoxes: hasBbox ? getSampleBoundingBoxes() : undefined,
      outputImageUrl: hasOutimg ? imagePreviewUrl : undefined,
      verdict: imgV.verdict,
      riskScore: imgV.riskScore,
    },
  };
}

function AnimatedNumber({ value }: { value: number }) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 90, damping: 20 });
  const [display, setDisplay] = useState(0);
  useEffect(() => { mv.set(value); }, [value, mv]);
  useEffect(() => spring.on('change', (v) => setDisplay(Math.round(v))), [spring]);
  return <>{display}</>;
}

const DEMO_SVG_URL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23e8edf2'/%3E%3Crect x='30' y='20' width='340' height='60' rx='6' fill='%23c9d4e0'/%3E%3Crect x='30' y='100' width='160' height='80' rx='6' fill='%23c9d4e0'/%3E%3Crect x='210' y='100' width='160' height='80' rx='6' fill='%23c9d4e0'/%3E%3Crect x='30' y='200' width='340' height='60' rx='6' fill='%23c9d4e0'/%3E%3Ctext x='200' y='55' text-anchor='middle' fill='%238a9ab0' font-size='13' font-family='sans-serif'%3EDiagnostic Evidence Image%3C/text%3E%3C/svg%3E";

function makeDemoFile(name: string, type: string): File {
  return new File(['demo'], name, { type });
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
                      <rect x={bx} y={by} width={bw} height={bh} fill="transparent" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="6 3" />
                      {box.label && (
                        <text x={bx + 4} y={by - 4} fill="var(--accent)" fontSize="10" fontWeight="600">{box.label}</text>
                      )}
                    </g>
                  );
                })}
              </svg>
            )}
            {showCircles && imgSize.w > 0 && (() => {
              const dispW = imgRef.current?.width || imgSize.w;
              const dispH = imgRef.current?.height || imgSize.h;
              return (
                <svg
                  className="absolute top-0 left-0"
                  width={dispW}
                  height={dispH}
                  viewBox={`0 0 ${dispW} ${dispH}`}
                  style={{ pointerEvents: 'none' }}
                >
                  {circles!.map((c, i) => {
                    const cx = c.cx * dispW;
                    const cy = c.cy * dispH;
                    const r = c.r * Math.min(dispW, dispH);
                    const isHovered = hoveredCircle === i;
                    const strokeColor = c.severity === 'high' ? 'var(--danger)' : c.severity === 'medium' ? 'var(--grad-orange-start)' : 'var(--accent)';
                    const fillOpacity = c.severity === 'high' ? 0.12 : c.severity === 'medium' ? 0.08 : 0.05;
                    const strokeWidth = c.severity === 'high' ? 2.5 : c.severity === 'medium' ? 2 : 1.5;
                    return (
                      <g key={i}>
                        <circle
                          cx={cx} cy={cy} r={r}
                          fill={strokeColor}
                          fillOpacity={fillOpacity}
                          stroke={strokeColor}
                          strokeWidth={strokeWidth}
                          strokeDasharray={c.severity === 'low' ? '4 3' : 'none'}
                          style={{ pointerEvents: 'all', cursor: 'pointer', transition: 'fill-opacity 0.15s ease' }}
                          onMouseEnter={() => setHoveredCircle(i)}
                          onMouseLeave={() => setHoveredCircle(null)}
                        />
                        {isHovered && (
                          <g>
                            <rect
                              x={cx + r + 6}
                              y={cy - 14}
                              width={c.label.length * 6.5 + 16}
                              height={24}
                              rx={4}
                              fill="var(--panel)"
                              stroke={strokeColor}
                              strokeWidth={1}
                              style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.15))' }}
                            />
                            <text
                              x={cx + r + 14}
                              y={cy + 3}
                              fill="var(--text)"
                              fontSize="10"
                              fontWeight="600"
                            >
                              {c.label}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </svg>
              );
            })()}
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
                      <div style={{ width: '3px', background: 'var(--danger)', flexShrink: 0 }} />
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

function KpiTiles({ stats }: { stats: { uploaded: number; flags: number; mismatches: number; manual: number } }) {
  const tiles = [
    { label: 'Documents Uploaded', value: stats.uploaded, icon: ScanLine, gradient: 'bg-gradient-teal' },
    { label: 'Fraud Flags', value: stats.flags, icon: ShieldAlert, gradient: 'bg-gradient-pink' },
    { label: 'Correlation Mismatches', value: stats.mismatches, icon: ClipboardCheck, gradient: 'bg-gradient-orange' },
    { label: 'Manual Review', value: stats.manual, icon: ShieldCheck, gradient: 'bg-gradient-green' },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="kpi-tiles">
      {tiles.map((tile, i) => {
        const Icon = tile.icon;
        return (
          <motion.div
            key={tile.label}
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.06 + i * 0.07, type: 'spring', stiffness: 260, damping: 22 }}
            whileHover={{ y: -4, scale: 1.03, transition: { type: 'spring', stiffness: 340, damping: 18 } }}
            className={`${tile.gradient} kpi-tile rounded-[var(--radius)] p-5 shadow-[var(--shadow)]`}
            style={{ color: 'var(--panel)' }}
            data-testid={`kpi-${tile.label.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <div className="flex items-center justify-between mb-3">
              <Icon className="w-5 h-5" style={{ color: 'var(--panel)' }} />
            </div>
            <div className="text-3xl font-bold tracking-tight">
              <AnimatedNumber value={tile.value} />
            </div>
            <div className="text-xs font-semibold opacity-80 mt-1 uppercase tracking-wider">{tile.label}</div>
          </motion.div>
        );
      })}
    </div>
  );
}

function SectionStatusPill({ status }: { status: SectionStatus }) {
  if (status === 'pending') return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--panel2)] text-[var(--muted)] border border-[var(--border)]" data-testid="section-status-pending">
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--muted)]" />
      Pending
    </span>
  );
  if (status === 'ready') return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[rgba(59,130,246,0.12)] text-[var(--accent)] border border-[rgba(59,130,246,0.2)]" data-testid="section-status-ready">
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
      Ready
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[rgba(39,176,107,0.12)] text-[var(--ok)] border border-[rgba(39,176,107,0.2)]" data-testid="section-status-processed">
      <Check className="w-2.5 h-2.5" />
      Processed
    </span>
  );
}

function CompactUploadCard({
  index,
  icon,
  title,
  helperText,
  accept,
  acceptNote,
  file,
  previewUrl,
  inputRef,
  onSelect,
  isAnalyzing,
  processed,
  children,
  testId,
}: {
  index: number;
  icon: JSX.Element;
  title: string;
  helperText: string;
  accept: string;
  acceptNote: string;
  file: File | null;
  previewUrl?: string | null;
  inputRef: React.RefObject<HTMLInputElement>;
  onSelect: (file: File) => void;
  isAnalyzing: boolean;
  processed: boolean;
  children?: React.ReactNode;
  testId: string;
}) {
  const [dragOver, setDragOver] = useState(false);
  const status: SectionStatus = processed ? 'processed' : file ? 'ready' : 'pending';

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) onSelect(f);
    },
    [onSelect],
  );

  const triggerInput = useCallback(() => inputRef.current?.click(), [inputRef]);

  return (
    <div className="card overflow-hidden" data-testid={testId}>
      <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--panel2)] border border-[var(--border)] flex items-center justify-center text-xs font-bold text-[var(--muted)]">
            {index}
          </div>
          <div className="flex items-center gap-2">
            {icon}
            <div>
              <h3 className="text-sm font-bold text-[var(--text)] leading-tight" data-testid={`${testId}-title`}>{title}</h3>
              <p className="text-[11px] text-[var(--muted)] mt-0.5 leading-snug max-w-xs">{helperText}</p>
            </div>
          </div>
        </div>
        <SectionStatusPill status={status} />
      </div>

      <div className="px-5 py-3">
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="file"
          accept={accept}
          style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onSelect(f); }}
          data-testid={`${testId}-input`}
        />

        {file ? (
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            data-testid={`${testId}-selected`}
          >
            {previewUrl ? (
              <motion.div
                className="w-10 h-10 rounded-lg overflow-hidden border border-[var(--border)] flex-shrink-0"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 24 }}
              >
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
              </motion.div>
            ) : (
              <motion.div
                className="w-10 h-10 rounded-lg bg-[var(--panel2)] border border-[var(--border)] flex items-center justify-center flex-shrink-0"
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              >
                <FileText className="w-4 h-4 text-[var(--accent)]" />
              </motion.div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-[var(--text)] truncate" title={file.name} data-testid={`${testId}-filename`}>{file.name}</div>
              <div className="text-[10px] text-[var(--muted)] mt-0.5">{(file.size / 1024).toFixed(1)} KB · {isAnalyzing ? 'Analyzing…' : processed ? 'Processed' : 'Ready'}</div>
            </div>
            <motion.button
              type="button"
              onClick={triggerInput}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--panel2)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--accent)] transition-colors flex-shrink-0"
              data-testid={`${testId}-change`}
            >
              Change
            </motion.button>
          </motion.div>
        ) : (
          <div
            className={`file-drop-area flex items-center gap-3 py-3 px-4 min-h-[56px] ${dragOver ? 'border-[var(--accent)] bg-[rgba(59,130,246,0.05)]' : ''}`}
            style={{ padding: '10px 14px' }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={triggerInput}
            data-testid={`${testId}-dropzone`}
          >
            <Upload className="w-4 h-4 text-[var(--muted)] flex-shrink-0" />
            <div className="flex-1 text-left">
              <div className="text-xs font-medium text-[var(--muted)]">Drag & drop or click to upload</div>
              <div className="text-[10px] text-[var(--muted)] opacity-70 mt-0.5">{acceptNote}</div>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); triggerInput(); }}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-lg px-3 py-1.5 flex-shrink-0 transition-all hover:shadow-[var(--shadow)]"
              style={{ background: 'var(--accent)', color: 'white' }}
              data-testid={`${testId}-button`}
            >
              <Upload className="w-3 h-3" />
              Upload
            </button>
          </div>
        )}

        {processed && children && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 pt-3 border-t border-[var(--border)]"
          >
            {children}
          </motion.div>
        )}
      </div>
    </div>
  );
}

function ExtractedField({ label, value, flagged }: { label: string; value: string; flagged?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wide">{label}</span>
      <span className={`text-xs font-medium ${flagged ? 'text-[var(--danger)]' : 'text-[var(--text)]'}`}>{value}</span>
    </div>
  );
}

function FraudFlagChip({ flag }: { flag: FraudFlag }) {
  const colors = {
    high: { bg: 'rgba(225,76,76,0.1)', border: 'rgba(225,76,76,0.25)', text: 'var(--danger)', icon: XCircle },
    medium: { bg: 'rgba(255,154,85,0.1)', border: 'rgba(255,154,85,0.3)', text: 'var(--grad-orange-start)', icon: AlertTriangle },
    low: { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)', text: 'var(--accent)', icon: AlertCircle },
  };
  const c = colors[flag.severity];
  const Icon = c.icon;
  return (
    <div
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold"
      style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}
      data-testid={`fraud-flag-${flag.id}`}
    >
      <Icon className="w-3 h-3" />
      {flag.label}
    </div>
  );
}

function CorrelationRow({ item }: { item: CorrelationItem }) {
  const statusConfig = {
    matched: { icon: Check, color: 'var(--ok)', bg: 'rgba(39,176,107,0.1)', label: 'Matched' },
    mismatch: { icon: XCircle, color: 'var(--danger)', bg: 'rgba(225,76,76,0.08)', label: 'Mismatch' },
    review: { icon: AlertTriangle, color: 'var(--grad-orange-start)', bg: 'rgba(255,154,85,0.08)', label: 'Review' },
    na: { icon: AlertCircle, color: 'var(--muted)', bg: 'transparent', label: 'N/A' },
  };
  const s = statusConfig[item.status];
  const Icon = s.icon;
  return (
    <div
      className="flex items-start gap-3 py-2.5 px-3 rounded-xl"
      style={{ background: s.bg, border: `1px solid ${item.status === 'matched' ? 'rgba(39,176,107,0.15)' : item.status === 'mismatch' ? 'rgba(225,76,76,0.12)' : 'rgba(255,154,85,0.15)'}` }}
      data-testid={`correlation-row-${item.field.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: s.color }} />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold text-[var(--text)] mb-1">{item.field}</div>
        <div className="flex flex-wrap gap-3">
          {item.sourceA && (
            <div className="flex flex-col gap-0.5">
              {item.labelA && <span className="text-[10px] text-[var(--muted)] font-medium">{item.labelA}</span>}
              <span className="text-[11px] text-[var(--text)] font-semibold">{item.sourceA}</span>
            </div>
          )}
          {item.sourceB && (
            <>
              <ChevronRight className="w-3 h-3 text-[var(--muted)] mt-3 flex-shrink-0" />
              <div className="flex flex-col gap-0.5">
                {item.labelB && <span className="text-[10px] text-[var(--muted)] font-medium">{item.labelB}</span>}
                <span className="text-[11px] text-[var(--text)] font-semibold">{item.sourceB}</span>
              </div>
            </>
          )}
          {item.sourceC && (
            <>
              <ChevronRight className="w-3 h-3 text-[var(--muted)] mt-3 flex-shrink-0" />
              <div className="flex flex-col gap-0.5">
                {item.labelC && <span className="text-[10px] text-[var(--muted)] font-medium">{item.labelC}</span>}
                <span className="text-[11px] text-[var(--text)] font-semibold">{item.sourceC}</span>
              </div>
            </>
          )}
        </div>
      </div>
      <span className="text-[10px] font-bold mt-0.5 flex-shrink-0" style={{ color: s.color }}>{s.label}</span>
    </div>
  );
}

function getCorrelationSentence(item: CorrelationItem): string {
  const ok = item.status === 'matched';
  switch (item.field) {
    case 'Patient Name':
      return ok
        ? 'Patient identity is aligned across all uploaded documents.'
        : 'Patient name mismatch detected across uploaded documents.';
    case 'Procedure':
      return ok
        ? 'Procedure is consistent between the diagnostic report and claim bill.'
        : `Procedure mismatch detected: report indicates ${item.sourceA} while bill claims ${item.sourceB}.`;
    case 'Hospital / Provider':
      return ok
        ? 'Hospital or provider names are consistent across documents.'
        : 'Hospital or provider names differ between diagnostic report and claim bill.';
    case 'Document Date':
      return ok
        ? 'Timeline of report and billing is consistent.'
        : `Date inconsistency: report dated ${item.sourceA}, bill dated ${item.sourceB}.`;
    case 'Diagnostic Image Consistency':
      return ok
        ? 'Diagnostic image type matches the reported procedure type.'
        : `Diagnostic image suggests ${(item.sourceB ?? '').replace(' detected', '')} while report indicates ${(item.sourceA ?? '').replace(' expected', '')}.`;
    default:
      return ok ? `${item.field} is consistent.` : `${item.field} shows inconsistency.`;
  }
}

function getObservedValue(item: CorrelationItem): string {
  if (item.field === 'Patient Name' && item.status === 'matched' && item.sourceA) {
    return `${item.sourceA} across Aadhaar, report, and bill`;
  }
  const parts = [
    item.labelA && item.sourceA ? `${item.labelA}: ${item.sourceA}` : '',
    item.labelB && item.sourceB ? `${item.labelB}: ${item.sourceB}` : '',
    item.labelC && item.sourceC ? `${item.labelC}: ${item.sourceC}` : '',
  ].filter(Boolean);
  return parts.join(' | ');
}

function DocEvidenceCard({
  delay,
  iconBg,
  iconColor,
  icon,
  title,
  subtitle,
  fields,
  statusLabel,
  statusOk,
  statusText,
  statusSubtext,
}: {
  delay: number;
  iconBg: string;
  iconColor: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  fields: { label: string; value: string }[];
  statusLabel: string;
  statusOk: boolean;
  statusText: string;
  statusSubtext: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 220, damping: 22 }}
      className="card p-4 flex flex-col gap-2.5"
    >
      <div className="flex items-start gap-2.5 pb-2.5 border-b border-[var(--border)]">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: iconBg, color: iconColor }}
        >
          {icon}
        </div>
        <div>
          <div className="text-[13px] font-bold text-[var(--text)] leading-tight">{title}</div>
          <div className="text-[10px] text-[var(--muted)] mt-0.5 leading-snug">{subtitle}</div>
        </div>
      </div>
      {fields.map((f) => (
        <div key={f.label} className="rounded-lg px-3 py-2.5" style={{ background: 'var(--panel2)' }}>
          <div className="text-[9px] font-bold uppercase tracking-[0.13em] text-[var(--muted)] mb-1">{f.label}</div>
          <div className="text-[13px] font-bold text-[var(--text)] leading-snug">{f.value}</div>
        </div>
      ))}
      <div className="rounded-lg px-3 py-2.5" style={{ background: 'var(--panel2)' }}>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="text-[9px] font-bold uppercase tracking-[0.13em] text-[var(--muted)]">{statusLabel}</div>
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider flex-shrink-0"
            style={{
              background: statusOk ? 'rgba(39,176,107,0.12)' : 'rgba(225,76,76,0.1)',
              color: statusOk ? 'var(--ok)' : 'var(--danger)',
              border: `1.5px solid ${statusOk ? 'rgba(39,176,107,0.28)' : 'rgba(225,76,76,0.24)'}`,
            }}
          >
            {statusText}
          </span>
        </div>
        <div className="text-[13px] font-bold text-[var(--text)] leading-snug">
          {statusOk ? 'Looks consistent' : 'Does not match'}
        </div>
        <div className="text-[10px] text-[var(--muted)] mt-0.5 leading-snug">{statusSubtext}</div>
      </div>
    </motion.div>
  );
}

export default function Home() {
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [billFile, setBillFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<MedicalClaimResult | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [history, setHistory] = useState<MedicalClaimResult[]>([]);

  const aadhaarInputRef = useRef<HTMLInputElement>(null);
  const reportInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const billInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = useCallback((file: File) => {
    setImageFile(file);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    const url = URL.createObjectURL(file);
    setImagePreviewUrl(url);
    setResult(null);
  }, [imagePreviewUrl]);

  const makeSlotSetter = (setter: (f: File) => void) => (file: File) => {
    setter(file);
    setResult(null);
  };

  const canRun = Boolean(aadhaarFile) && Boolean(reportFile) && Boolean(imageFile) && Boolean(billFile) && !isAnalyzing;
  const uploadedCount = [aadhaarFile, reportFile, imageFile, billFile].filter(Boolean).length;

  const runVerification = useCallback(() => {
    if (!aadhaarFile || !reportFile || !imageFile || !billFile || !imagePreviewUrl) return;
    setIsAnalyzing(true);
    const delay = 2000 + Math.random() * 1000;
    setTimeout(() => {
      const r = runMedicalMockAnalysis(aadhaarFile, reportFile, imageFile, billFile, imagePreviewUrl);
      setResult(r);
      setHistory((prev) => [r, ...prev]);
      setIsAnalyzing(false);
    }, delay);
  }, [aadhaarFile, reportFile, imageFile, billFile, imagePreviewUrl]);

  const runDemo = useCallback(() => {
    const demoAadhaar = makeDemoFile('aadhaar_patient_rohit.pdf', 'application/pdf');
    const demoReport = makeDemoFile('xray_chest_report_real.pdf', 'application/pdf');
    const demoImage = makeDemoFile('mri_evidence_fake.jpg', 'image/jpeg');
    const demoBill = makeDemoFile('bill_mri_scan_edited.pdf', 'application/pdf');
    setAadhaarFile(demoAadhaar);
    setReportFile(demoReport);
    setImageFile(demoImage);
    setBillFile(demoBill);
    setImagePreviewUrl(DEMO_SVG_URL);
    setResult(null);
  }, []);

  const handleReset = useCallback(() => {
    setAadhaarFile(null);
    setReportFile(null);
    setImageFile(null);
    setBillFile(null);
    if (imagePreviewUrl && imagePreviewUrl !== DEMO_SVG_URL) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(null);
    setResult(null);
    setIsAnalyzing(false);
  }, [imagePreviewUrl]);

  const handleExport = useCallback(() => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ts = new Date().toISOString().replace(/[:.]/g, '').replace('T', '-').split('Z')[0];
    a.download = `fraud-analysis-${ts}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [result]);

  const kpiStats = {
    uploaded: uploadedCount,
    flags: result?.fraudFlags.length ?? history.reduce((s, r) => s + r.fraudFlags.length, 0),
    mismatches: result?.correlation.filter(c => c.status === 'mismatch').length ?? 0,
    manual: history.filter(r => r.overallDecision === 'MANUAL_REVIEW').length,
  };

  useEffect(() => {
    document.documentElement.removeAttribute('data-theme');
  }, []);

  const processed = Boolean(result);
  const step = isAnalyzing ? 2 : result ? 4 : canRun ? 1 : 0;

  return (
    <div className="min-h-screen bg-[var(--bg)] page-dot-grid pb-20 font-sans selection:bg-[var(--accent)] selection:text-white">
      <NavBar />

      <main className="max-w-[960px] mx-auto px-6 pt-10">
        <div className="relative mb-8 text-center overflow-hidden">
          <div className="hero-glow" />
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 26, delay: 0.05 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.2)] text-[var(--accent)] text-[11px] font-semibold mb-4 uppercase tracking-wider relative z-10"
          >
            <ShieldAlert className="w-3 h-3" />
            Ayushman Bharat / PM-JAY
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 24, delay: 0.12 }}
            className="text-3xl md:text-4xl font-bold text-[var(--text)] tracking-tight mb-3 leading-tight relative z-10"
            data-testid="text-hero-title"
          >
            Medical Claim{' '}
            <span className="gradient-text-danger">Fraud</span>{' '}
            Verification
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.5 }}
            className="text-sm md:text-base text-[var(--muted)] max-w-2xl mx-auto leading-relaxed relative z-10"
            data-testid="text-hero-subtitle"
          >
            Upload identity and claim-related medical documents. The system checks authenticity, document-type match, and cross-document fraud indicators including fake reports, fake diagnostic images, edited bills, inflated billing, and report-to-bill mismatches.
          </motion.p>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-6">
          <KpiTiles stats={kpiStats} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.4 }} className="mb-6">
          <div className="flex items-center gap-0">
            {['Upload', 'Analyze', 'Correlate', 'Result'].map((label, i) => {
              const active = step > i;
              const current = (i === 0 && step === 0) || (i === 1 && step === 1) || (i === 2 && isAnalyzing) || (i === 3 && !!result);
              return (
                <div key={label} className="flex items-center flex-1">
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${current ? 'step-ring' : ''}`}
                      style={{
                        background: active || current ? 'var(--accent)' : 'var(--panel2)',
                        color: active || current ? '#ffffff' : 'var(--muted)',
                        border: `2px solid ${active || current ? 'var(--accent)' : 'var(--border)'}`,
                      }}
                    >
                      <AnimatePresence mode="wait">
                        {active && !current
                          ? <motion.span key="check" initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}><Check className="w-3.5 h-3.5" /></motion.span>
                          : <motion.span key={`num-${i}`} initial={{ opacity: 0.6 }} animate={{ opacity: 1 }}>{i + 1}</motion.span>
                        }
                      </AnimatePresence>
                    </div>
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wide transition-colors duration-250"
                      style={{ color: active || current ? 'var(--accent)' : 'var(--muted)' }}
                    >
                      {label}
                    </span>
                  </div>
                  {i < 3 && (
                    <div
                      className="flex-1 h-px mx-1 mb-4 transition-all duration-400"
                      style={{ background: active ? 'var(--accent)' : 'var(--border)' }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        <div className="flex flex-col gap-4 mb-6">
          {([
            {
              index: 1,
              icon: <CreditCard className="w-4 h-4 text-[var(--accent)]" />,
              title: 'Aadhaar / Patient Identity Document',
              helperText: 'Upload Aadhaar card or patient identity proof for identity verification',
              accept: 'application/pdf,image/png,image/jpeg,.pdf,.jpg,.jpeg,.png',
              acceptNote: 'Accepted: PDF, JPG, PNG',
              file: aadhaarFile,
              inputRef: aadhaarInputRef,
              onSelect: makeSlotSetter(setAadhaarFile),
              testId: 'upload-aadhaar',
              children: result && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5">
                  {[
                    { label: 'Patient Name', value: result.extracted.aadhaar.patientName },
                    { label: 'Date of Birth', value: result.extracted.aadhaar.dob },
                    { label: 'Aadhaar ID', value: result.extracted.aadhaar.aadhaarId },
                    { label: 'Gender', value: result.extracted.aadhaar.gender },
                    { label: 'Identity Match', value: result.extracted.aadhaar.identityMatchStatus, flagged: result.extracted.aadhaar.identityMatchStatus !== 'Matched' },
                  ].map((f, fi) => (
                    <motion.div key={f.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: fi * 0.06, type: 'spring', stiffness: 280, damping: 22 }}>
                      <ExtractedField label={f.label} value={f.value} flagged={f.flagged} />
                    </motion.div>
                  ))}
                </div>
              ),
            },
            {
              index: 2,
              icon: <FileText className="w-4 h-4 text-[var(--accent-4)]" />,
              title: 'Diagnostic Report',
              helperText: 'Upload medical report — X-ray, MRI, CT scan, or pathology report',
              accept: 'application/pdf,.pdf',
              acceptNote: 'Accepted: PDF',
              file: reportFile,
              inputRef: reportInputRef,
              onSelect: makeSlotSetter(setReportFile),
              testId: 'upload-report',
              children: result && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5">
                  {[
                    { label: 'Report Type', value: result.extracted.report.reportType },
                    { label: 'Procedure', value: result.extracted.report.procedure },
                    { label: 'Report Date', value: result.extracted.report.reportDate },
                    { label: 'Hospital', value: result.extracted.report.hospital },
                    { label: 'Patient Name', value: result.extracted.report.patientName },
                  ].map((f, fi) => (
                    <motion.div key={f.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: fi * 0.06, type: 'spring', stiffness: 280, damping: 22 }}>
                      <ExtractedField label={f.label} value={f.value} />
                    </motion.div>
                  ))}
                </div>
              ),
            },
            {
              index: 3,
              icon: <Activity className="w-4 h-4 text-[var(--accent-2)]" />,
              title: 'Diagnostic Evidence Image',
              helperText: 'Upload diagnostic scan image or evidence image associated with the report',
              accept: 'image/png,image/jpeg,image/jpg,.jpg,.jpeg,.png',
              acceptNote: 'Accepted: JPG, PNG',
              file: imageFile,
              previewUrl: imagePreviewUrl,
              inputRef: imageInputRef,
              onSelect: handleImageSelect,
              testId: 'upload-image',
              children: result && (
                <div className="flex items-start gap-4">
                  {imagePreviewUrl && (
                    <motion.div
                      className="w-14 h-14 rounded-lg overflow-hidden border border-[var(--border)] flex-shrink-0 cursor-pointer hover:border-[var(--accent-2)] transition-colors relative group"
                      onClick={() => setLightboxOpen(true)}
                      whileHover={{ scale: 1.06 }}
                      whileTap={{ scale: 0.96 }}
                      transition={{ type: 'spring', stiffness: 360, damping: 22 }}
                      initial={{ scale: 0.85, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      data-testid="tile-image"
                    >
                      <img src={imagePreviewUrl} alt="Evidence" className="w-full h-full object-cover" data-testid="img-thumbnail" />
                      {result.imageInfo.forgeryLocalization && (
                        <svg className="absolute top-0 left-0 pointer-events-none" width="100%" height="100%" viewBox="0 0 1 1" preserveAspectRatio="none" data-testid="thumbnail-polygon-overlay">
                          <polygon points={result.imageInfo.forgeryLocalization.points.map(p => `${p.x},${p.y}`).join(' ')} fill="transparent" stroke="var(--danger)" strokeWidth="0.015" strokeLinejoin="round" />
                          {result.imageInfo.forgeryLocalization.points.map((p, i) => (
                            <circle key={i} cx={p.x} cy={p.y} r={0.015} fill="var(--danger)" stroke="var(--panel)" strokeWidth="0.005" />
                          ))}
                        </svg>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-all">
                        <Eye className="w-3.5 h-3.5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </motion.div>
                  )}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 flex-1">
                    {[
                      { label: 'Image Type', value: result.extracted.image.imageType },
                      { label: 'Linked Procedure', value: result.extracted.image.linkedProcedure },
                      { label: 'Visual Match with Report', value: result.extracted.image.visualMatch, flagged: result.extracted.image.visualMatch === 'Mismatch' },
                      { label: 'AI Forensic Score', value: `${result.imageInfo.riskScore}% risk`, flagged: result.imageInfo.riskScore >= 60 },
                    ].map((f, fi) => (
                      <motion.div key={f.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: fi * 0.07, type: 'spring', stiffness: 280, damping: 22 }}>
                        <ExtractedField label={f.label} value={f.value} flagged={f.flagged} />
                      </motion.div>
                    ))}
                  </div>
                </div>
              ),
            },
            {
              index: 4,
              icon: <Receipt className="w-4 h-4 text-[var(--grad-orange-start)]" />,
              title: 'Medical Bill / Claim Bill',
              helperText: 'Upload the medical bill or insurance claim document being submitted',
              accept: 'application/pdf,image/png,image/jpeg,.pdf,.jpg,.jpeg,.png',
              acceptNote: 'Accepted: PDF, JPG, PNG',
              file: billFile,
              inputRef: billInputRef,
              onSelect: makeSlotSetter(setBillFile),
              testId: 'upload-bill',
              children: result && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5">
                  {[
                    { label: 'Billed Procedure', value: result.extracted.bill.billedProcedure },
                    { label: 'Total Amount', value: result.extracted.bill.totalAmount },
                    { label: 'Bill Date', value: result.extracted.bill.billDate },
                    { label: 'Hospital', value: result.extracted.bill.hospital },
                    { label: 'Patient Name', value: result.extracted.bill.patientName, flagged: result.extracted.aadhaar.patientName !== result.extracted.bill.patientName },
                  ].map((f, fi) => (
                    <motion.div key={f.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: fi * 0.06, type: 'spring', stiffness: 280, damping: 22 }}>
                      <ExtractedField label={f.label} value={f.value} flagged={f.flagged} />
                    </motion.div>
                  ))}
                </div>
              ),
            },
          ] as Array<React.ComponentProps<typeof CompactUploadCard>>).map((cardProps, i) => (
            <motion.div
              key={cardProps.testId}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14 + i * 0.08, type: 'spring', stiffness: 230, damping: 22 }}
            >
              <CompactUploadCard {...cardProps} isAnalyzing={isAnalyzing} processed={processed} />
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="card p-5 mb-6">
          <div className="flex flex-col items-center gap-3">
            <motion.button
              onClick={canRun && !result ? runVerification : undefined}
              disabled={!canRun || !!result || isAnalyzing}
              whileHover={canRun && !result ? { scale: 1.02 } : undefined}
              whileTap={canRun && !result ? { scale: 0.97 } : undefined}
              transition={{ type: 'spring', stiffness: 360, damping: 22 }}
              data-ready={String(canRun && !result)}
              data-testid="button-run-verification"
              className={canRun && !result ? 'btn-glow-pulse' : ''}
              style={{
                background: canRun && !result ? 'var(--accent)' : 'var(--panel2)',
                color: canRun && !result ? 'var(--panel)' : 'var(--muted)',
                border: canRun && !result ? '2px solid var(--accent)' : '2px solid var(--border)',
                minHeight: '52px',
                width: '100%',
                maxWidth: '480px',
                fontSize: '15px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                borderRadius: 'var(--radius)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase' as const,
                cursor: canRun && !result ? 'pointer' : 'not-allowed',
                transition: 'background 0.2s ease, color 0.2s ease, border-color 0.2s ease',
              }}
            >
              {isAnalyzing && <Loader2 className="w-4 h-4 animate-spin" />}
              {result && <CheckCircle2 className="w-4 h-4 text-[var(--ok)]" />}
              {isAnalyzing ? 'Running Fraud Analysis…' : result ? 'Analysis Complete' : 'Run Fraud Verification'}
            </motion.button>
            <div className="flex items-center gap-3">
              <motion.button
                onClick={runDemo}
                disabled={isAnalyzing}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 360, damping: 22 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--panel2)] text-[var(--muted)] hover:text-[var(--text)] text-xs font-semibold transition-colors"
                data-testid="button-run-demo"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                Run Demo with Sample Data
              </motion.button>
              <AnimatePresence>
                {(aadhaarFile || reportFile || imageFile || billFile || result) && (
                  <motion.button
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    onClick={handleReset}
                    whileTap={{ scale: 0.93 }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-[var(--muted)] hover:text-[var(--danger)] transition-colors"
                    data-testid="button-clear-all"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Clear All
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
            {!result && !isAnalyzing && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[11px] text-[var(--muted)]"
                data-testid="banner-pending"
              >
                {uploadedCount < 4
                  ? `Upload all ${4 - uploadedCount} remaining document${4 - uploadedCount > 1 ? 's' : ''} to enable verification`
                  : 'All documents ready — click Run Fraud Verification to proceed'}
              </motion.p>
            )}
          </div>
        </motion.div>

        <AnimatePresence>
          {isAnalyzing && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: 'spring', stiffness: 240, damping: 24 }}
              className="card p-6 mb-6 overflow-hidden"
            >
              <div className="flex items-center gap-3 mb-3">
                <Loader2 className="w-5 h-5 text-[var(--accent)] animate-spin flex-shrink-0" />
                <span className="text-sm font-bold text-[var(--text)]">Running Multi-Document Fraud Analysis…</span>
              </div>
              <div className="w-full bg-[var(--panel2)] rounded-full h-1.5 mb-4 overflow-hidden">
                <div className="h-1.5 rounded-full analysis-bar-fill" style={{ background: 'var(--accent)' }} />
              </div>
              {['Extracting document data', 'Running authenticity checks', 'Cross-referencing patient identity', 'Correlating procedure and billing', 'Generating fraud risk score'].map((stepLabel, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.38, type: 'spring', stiffness: 260, damping: 22 }}
                  className="flex items-center gap-2.5 py-1.5"
                >
                  <div className="w-5 h-5 rounded-full bg-[var(--panel2)] border border-[var(--border)] flex items-center justify-center flex-shrink-0">
                    <Loader2 className="w-2.5 h-2.5 text-[var(--accent)] animate-spin" style={{ animationDelay: `${i * 0.28}s` }} />
                  </div>
                  <span className="text-xs text-[var(--muted)]">{stepLabel}</span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 200, damping: 26 }}
              className="flex flex-col gap-5"
              data-testid="card-result"
            >
              {/* ── Main result card ── */}
              <div className="card p-7">
                {/* Header: title left + verdict chip right */}
                <div className="flex items-start justify-between gap-6 mb-6">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)] mb-2">Final Result</div>
                    <h2 className="text-3xl font-bold text-[var(--text)] mb-2 leading-tight">Overall Verdict</h2>
                    <p className="text-sm text-[var(--muted)] max-w-md leading-relaxed">
                      Rule-based frontend demo using deterministic filename heuristics and cross-document checks.
                    </p>
                    <div className="text-[10px] font-mono text-[var(--muted)] mt-3 opacity-50" data-testid="result-id">{result.id}</div>
                  </div>
                  <motion.div
                    initial={{ scale: 0.82, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 24, delay: 0.14 }}
                    className="rounded-2xl px-6 py-5 flex-shrink-0"
                    style={{
                      background: result.verdict === 'High Fraud Risk'
                        ? 'linear-gradient(140deg, #e14c4c 0%, #c73232 100%)'
                        : result.verdict === 'Needs Manual Review'
                          ? 'linear-gradient(140deg, #ff9a55 0%, #e07a1c 100%)'
                          : 'linear-gradient(140deg, #27b06b 0%, #1a9458 100%)',
                      minWidth: '210px',
                    }}
                    data-testid="overall-verdict-card"
                  >
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70 mb-1">Verdict</div>
                    <div className="text-xl font-bold text-white leading-tight mb-2" data-testid="text-overall-verdict">{result.verdict}</div>
                    <div className="text-sm text-white/80">
                      Risk Score: <span className="font-bold" data-testid="text-risk-score"><AnimatedNumber value={result.riskScore} /></span>/100
                    </div>
                    <div className="mt-2.5 w-full bg-white/20 rounded-full h-1.5 overflow-hidden">
                      <motion.div
                        className="h-1.5 rounded-full bg-white/80"
                        initial={{ width: '0%' }}
                        animate={{ width: `${result.riskScore}%` }}
                        transition={{ type: 'spring', stiffness: 52, damping: 16, delay: 0.4 }}
                        data-testid="risk-score-bar"
                      />
                    </div>
                  </motion.div>
                </div>

                {/* hidden compat */}
                <span className="sr-only" data-testid="text-flag-count">{result.fraudFlags.length}</span>

                {/* ── Fraud Flags + Correlation Summary ── */}
                <div className="h-px bg-[var(--border)] mb-6" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                  {/* Fraud Flags */}
                  <div data-testid="fraud-flags-section">
                    <div className="text-sm font-semibold text-[var(--text)] mb-3">Fraud Flags</div>
                    {result.fraudFlags.length === 0 ? (
                      <div className="flex items-center gap-2 text-sm text-[var(--ok)]" data-testid="clean-result-banner">
                        <CheckCircle2 className="w-4 h-4" />
                        No fraud indicators detected
                      </div>
                    ) : (
                      <motion.div
                        className="flex flex-wrap gap-2"
                        variants={{ visible: { transition: { staggerChildren: 0.055, delayChildren: 0.08 } } }}
                        initial="hidden"
                        animate="visible"
                      >
                        {result.fraudFlags.map((flag) => (
                          <motion.span
                            key={flag.id}
                            variants={{
                              hidden: { opacity: 0, scale: 0.78, y: 5 },
                              visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 360, damping: 20 } },
                            }}
                            className="inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider"
                            style={{
                              background: flag.severity === 'high' ? 'rgba(225,76,76,0.08)' : flag.severity === 'medium' ? 'rgba(255,154,85,0.09)' : 'rgba(59,130,246,0.07)',
                              color: flag.severity === 'high' ? 'var(--danger)' : flag.severity === 'medium' ? 'var(--grad-orange-start)' : 'var(--accent)',
                              border: `1.5px solid ${flag.severity === 'high' ? 'rgba(225,76,76,0.25)' : flag.severity === 'medium' ? 'rgba(255,154,85,0.32)' : 'rgba(59,130,246,0.22)'}`,
                            }}
                          >
                            {flag.label}
                          </motion.span>
                        ))}
                      </motion.div>
                    )}
                  </div>

                  {/* Correlation Summary text */}
                  <div>
                    <div className="text-sm font-semibold text-[var(--text)] mb-3">Cross-Document Correlation Summary</div>
                    <div className="flex flex-col gap-2.5">
                      {result.correlation.map((item, ci) => (
                        <motion.p
                          key={item.field}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 + ci * 0.07, duration: 0.4 }}
                          className="text-sm text-[var(--muted)] leading-relaxed"
                        >
                          {getCorrelationSentence(item)}
                        </motion.p>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Field-by-Field Comparison ── */}
                <div className="h-px bg-[var(--border)] mb-6" data-testid="correlation-section" />
                <div>
                  <div className="text-sm font-semibold text-[var(--text)] mb-4">Field-by-Field Comparison</div>
                  <div className="grid grid-cols-[160px_1fr_110px] gap-4 pb-3 border-b border-[var(--border)]">
                    <span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Check</span>
                    <span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Observed Value</span>
                    <span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Result</span>
                  </div>
                  {result.correlation.map((item, ci) => (
                    <motion.div
                      key={item.field}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.18 + ci * 0.08, type: 'spring', stiffness: 260, damping: 22 }}
                      className="grid grid-cols-[160px_1fr_110px] gap-4 py-4 border-b border-[var(--border)] items-center"
                    >
                      <span className="text-sm font-bold text-[var(--text)]">{item.field}</span>
                      <span className="text-sm text-[var(--muted)] leading-relaxed">{getObservedValue(item)}</span>
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider w-fit"
                        style={{
                          background: item.status === 'matched' ? 'rgba(39,176,107,0.1)' : item.status === 'review' ? 'rgba(255,154,85,0.1)' : 'rgba(225,76,76,0.09)',
                          color: item.status === 'matched' ? 'var(--ok)' : item.status === 'review' ? 'var(--grad-orange-start)' : 'var(--danger)',
                          border: `1.5px solid ${item.status === 'matched' ? 'rgba(39,176,107,0.25)' : item.status === 'review' ? 'rgba(255,154,85,0.3)' : 'rgba(225,76,76,0.22)'}`,
                        }}
                      >
                        {item.status === 'matched' ? 'Matched' : item.status === 'review' ? 'Review' : 'Mismatch'}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* ── 4-column Document Evidence Cards ── */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <DocEvidenceCard
                  delay={0.05}
                  iconBg="rgba(59,130,246,0.12)"
                  iconColor="var(--accent)"
                  icon={<CreditCard className="w-4 h-4" />}
                  title="Patient Identity"
                  subtitle="Who the claim belongs to"
                  fields={[
                    { label: 'Patient Name', value: result.extracted.aadhaar.patientName },
                    { label: 'Age / Date of Birth', value: result.extracted.aadhaar.dob },
                    { label: 'Aadhaar Number', value: result.extracted.aadhaar.aadhaarId },
                  ]}
                  statusLabel="Identity Check"
                  statusOk={result.extracted.aadhaar.identityMatchStatus === 'Matched'}
                  statusText={result.extracted.aadhaar.identityMatchStatus === 'Matched' ? 'Looks Consistent' : 'Does Not Match'}
                  statusSubtext="Patient identity across uploaded documents"
                />
                <DocEvidenceCard
                  delay={0.13}
                  iconBg="rgba(20,184,166,0.12)"
                  iconColor="rgb(15,150,130)"
                  icon={<FileText className="w-4 h-4" />}
                  title="Medical Report"
                  subtitle="What the report says"
                  fields={[
                    { label: 'Report Type', value: result.extracted.report.reportType },
                    { label: 'Procedure Mentioned', value: result.extracted.report.procedure },
                    { label: 'Hospital / Provider', value: result.extracted.report.hospital },
                  ]}
                  statusLabel="Report Check"
                  statusOk={!result.fraudFlags.some(f => f.section === 'report')}
                  statusText={result.fraudFlags.some(f => f.section === 'report') ? 'Does Not Match' : 'Looks Consistent'}
                  statusSubtext="Authenticity and provider details"
                />
                <DocEvidenceCard
                  delay={0.21}
                  iconBg="rgba(6,182,212,0.12)"
                  iconColor="rgb(6,155,185)"
                  icon={<Activity className="w-4 h-4" />}
                  title="Evidence Image"
                  subtitle="Whether the scan matches the report"
                  fields={[
                    { label: 'Detected Image Type', value: result.extracted.image.imageType },
                    { label: 'Expected Procedure', value: result.extracted.image.linkedProcedure },
                  ]}
                  statusLabel="Image Match Check"
                  statusOk={result.extracted.image.visualMatch === 'Matched'}
                  statusText={result.extracted.image.visualMatch === 'Matched' ? 'Looks Consistent' : 'Does Not Match'}
                  statusSubtext="Image compared with uploaded report"
                />
                <DocEvidenceCard
                  delay={0.29}
                  iconBg="rgba(249,115,22,0.12)"
                  iconColor="rgb(218,98,18)"
                  icon={<Receipt className="w-4 h-4" />}
                  title="Claim Bill"
                  subtitle="What is being charged"
                  fields={[
                    { label: 'Billed Procedure', value: result.extracted.bill.billedProcedure },
                    { label: 'Total Amount', value: result.extracted.bill.totalAmount },
                    { label: 'Hospital / Provider', value: result.extracted.bill.hospital },
                  ]}
                  statusLabel="Bill Check"
                  statusOk={!result.fraudFlags.some(f => f.section === 'bill')}
                  statusText={result.fraudFlags.some(f => f.section === 'bill') ? 'Does Not Match' : 'Looks Consistent'}
                  statusSubtext="Billing details and procedure consistency"
                />
              </div>

              {/* ── Action buttons ── */}
              <div className="flex items-center justify-end gap-2">
                <button onClick={handleExport} className="btn btn-secondary text-xs px-3 py-2" data-testid="button-export">
                  <Download className="w-3.5 h-3.5" />
                  Export JSON
                </button>
                <button onClick={handleReset} className="btn btn-ghost text-xs px-3 py-2" data-testid="button-new-submission">
                  New Submission
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {lightboxOpen && result && (
          <ImageLightbox
            imageUrl={result.imageInfo.previewUrl}
            outputImageUrl={result.imageInfo.outputImageUrl}
            boundingBoxes={result.imageInfo.boundingBoxes}
            circles={result.imageInfo.circles}
            forgeryLocalization={result.imageInfo.forgeryLocalization}
            onClose={() => setLightboxOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
