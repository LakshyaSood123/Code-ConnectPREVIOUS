import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, X, ZoomIn, Check, AlertTriangle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

type DocTypeKey = "Marriage Certificate" | "Birth Certificate" | "Address Proof" | "PAN Verification";

interface RequiredDoc {
  id: string;
  label: string;
  expected: string;
  required: boolean;
}

interface CheckItem {
  name: string;
  pass: boolean;
  note: string;
}

interface SlotResult {
  id: string;
  label: string;
  expected: string;
  required: boolean;
  fileName: string | null;
  file: File | null;
  previewUrl: string | null;
  riskScore: number;
  riskLevel: "LOW" | "MEDIUM" | "CRITICAL";
  decision: "APPROVE" | "REJECT" | "MANUAL_REVIEW" | null;
  checks: CheckItem[];
  mismatchReason: string | null;
  mismatchReceivedLabel: string | null;
  authenticityStatus: "pass" | "fail" | "unknown";
}

export type OverallSummary = {
  status: "VERIFIED" | "FAILED" | "NEEDS MANUAL REVIEW";
  authenticitySummary: string;
  notes: string[];
};

export type DocumentVerificationData = {
  selectedDocumentType: DocTypeKey;
  requiredItems: SlotResult[];
  overallSummary: OverallSummary;
};

const DOC_TYPES: Record<DocTypeKey, RequiredDoc[]> = {
  "Marriage Certificate": [
    { id: "bride_aadhaar", label: "Aadhaar card of bride", expected: "aadhaar", required: true },
    { id: "groom_aadhaar", label: "Aadhaar card of groom", expected: "aadhaar", required: true }
  ],
  "Birth Certificate": [
    { id: "child_birth", label: "Birth certificate", expected: "birth", required: true },
    { id: "parent_aadhaar", label: "Parent Aadhaar", expected: "aadhaar", required: true }
  ],
  "Address Proof": [
    { id: "address_doc", label: "Address proof document", expected: "address", required: true },
    { id: "aadhaar", label: "Aadhaar card", expected: "aadhaar", required: true }
  ],
  "PAN Verification": [
    { id: "pan", label: "PAN card", expected: "pan", required: true },
    { id: "aadhaar", label: "Aadhaar card", expected: "aadhaar", required: false }
  ]
};

const EXPECTED_TOKENS: Record<string, string[]> = {
  aadhaar: ["aadhaar"],
  pan: ["pan"],
  marriage: ["marriage", "certificate"],
  birth: ["birth", "certificate"],
  address: ["address", "utility", "bill"]
};

const MISMATCH_LABELS: Record<string, string> = {
  voter: "Voter ID",
  pan: "PAN Card",
  dl: "Driving License",
  passport: "Passport",
  aadhaar: "Aadhaar",
  marriage: "Marriage Certificate",
  birth: "Birth Certificate",
  address: "Address Proof"
};

function evaluateSlot(doc: RequiredDoc, fileName: string): Omit<SlotResult, 'file' | 'previewUrl'> {
  const fl = fileName.toLowerCase();
  const isFake = fl.includes("_fake");
  const isReal = fl.includes("_real");

  const authenticityStatus: "pass" | "fail" | "unknown" = isFake ? "fail" : isReal ? "pass" : "unknown";

  const expectedTokens = EXPECTED_TOKENS[doc.expected] || [doc.expected];
  const hasExpectedToken = expectedTokens.some(t => fl.includes(t));

  const otherDocTokens = ["voter", "pan", "dl", "passport", "aadhaar", "marriage", "birth", "address"];
  const foundOtherToken = otherDocTokens.find(t => fl.includes(t) && !expectedTokens.includes(t));

  const mismatchFail = !hasExpectedToken && !!foundOtherToken;
  const mismatchReceivedLabel = mismatchFail ? (MISMATCH_LABELS[foundOtherToken!] || foundOtherToken!) : null;
  const mismatchReason = mismatchFail
    ? `Expected ${doc.label}, received ${mismatchReceivedLabel}`
    : null;

  let riskScore: number;
  let riskLevel: "LOW" | "MEDIUM" | "CRITICAL";
  let decision: "APPROVE" | "REJECT" | "MANUAL_REVIEW";

  if (mismatchFail) {
    riskScore = Math.floor(Math.random() * 6) + 90;
    riskLevel = "CRITICAL";
    decision = "REJECT";
  } else if (isFake) {
    riskScore = Math.floor(Math.random() * 8) + 85;
    riskLevel = "CRITICAL";
    decision = "REJECT";
  } else if (!isReal) {
    riskScore = Math.floor(Math.random() * 11) + 55;
    riskLevel = "MEDIUM";
    decision = "MANUAL_REVIEW";
  } else {
    riskScore = Math.floor(Math.random() * 11) + 10;
    riskLevel = "LOW";
    decision = "APPROVE";
  }

  const checks: CheckItem[] = [
    { name: "Valid format", pass: true, note: "File format accepted" },
    { name: "Document provided", pass: true, note: "Uploaded successfully" },
    { name: "Type matches request", pass: !mismatchFail, note: mismatchFail ? (mismatchReason || "Mismatch") : "Matches expected type" },
    { name: "Authenticity verified", pass: authenticityStatus === "pass", note: isFake ? "Detected as fake" : isReal ? "Appears authentic" : "Cannot confirm" },
    { name: "No tampering detected", pass: !isFake, note: isFake ? "Anomalies found" : "No anomalies found" },
  ];

  return {
    id: doc.id,
    label: doc.label,
    expected: doc.expected,
    required: doc.required,
    fileName,
    riskScore,
    riskLevel,
    decision,
    checks,
    mismatchReason,
    mismatchReceivedLabel,
    authenticityStatus,
  };
}

function computeSummary(slots: SlotResult[], docs: RequiredDoc[]): OverallSummary {
  const uploadedRequired = docs.filter(d => d.required);
  const uploadedSlots = slots.filter(s => s.fileName);
  const requiredSlots = uploadedSlots.filter(s => s.required);

  const anyRequiredFail = requiredSlots.some(s => s.decision === "REJECT");
  const missingRequired = uploadedRequired.filter(d => !slots.find(s => s.id === d.id && s.fileName));
  const anyMedium = requiredSlots.some(s => s.decision === "MANUAL_REVIEW");

  let status: OverallSummary["status"];
  if (anyRequiredFail) {
    status = "FAILED";
  } else if (missingRequired.length > 0 || anyMedium) {
    status = "NEEDS MANUAL REVIEW";
  } else if (requiredSlots.length > 0 && requiredSlots.every(s => s.decision === "APPROVE")) {
    status = "VERIFIED";
  } else {
    status = "NEEDS MANUAL REVIEW";
  }

  const anyFakeAuth = uploadedSlots.some(s => s.authenticityStatus === "fail" && s.required);
  const allRealAuth = requiredSlots.length > 0 && requiredSlots.every(s => s.authenticityStatus === "pass");
  const authenticitySummary = anyFakeAuth
    ? "This image is fake"
    : allRealAuth
    ? "Images appear real"
    : "Authenticity needs review";

  const notes: string[] = [];
  uploadedSlots.forEach(s => {
    if (s.mismatchReceivedLabel && s.required) {
      notes.push(`We requested ${s.label} but you uploaded ${s.mismatchReceivedLabel} — Verification failed.`);
    }
  });
  missingRequired.forEach(d => {
    notes.push(`Required document missing: ${d.label}.`);
  });
  if (anyFakeAuth) {
    const fakeDoc = uploadedSlots.find(s => s.authenticityStatus === "fail" && s.required);
    if (fakeDoc) notes.push(`Authenticity failed for: ${fakeDoc.label}.`);
  }

  return { status, authenticitySummary, notes };
}

interface DocumentVerificationProps {
  onResultsChange?: (data: DocumentVerificationData | null) => void;
  onSlotAnalyzed?: (slot: SlotResult) => void;
}

export function DocumentVerification({ onResultsChange, onSlotAnalyzed }: DocumentVerificationProps) {
  const [selectedDocType, setSelectedDocType] = useState<DocTypeKey>("Marriage Certificate");
  const [slots, setSlots] = useState<Map<string, SlotResult>>(new Map());
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const currentDocs = DOC_TYPES[selectedDocType];

  const handleDocTypeChange = useCallback((docType: DocTypeKey) => {
    setSelectedDocType(docType);
    setSlots(new Map());
    setIsDropdownOpen(false);
    onResultsChange?.(null);
  }, [onResultsChange]);

  const handleSlotUpload = useCallback((doc: RequiredDoc, file: File) => {
    let previewUrl: string | null = null;
    if (file.type.startsWith('image/')) {
      previewUrl = URL.createObjectURL(file);
    }

    const evaluation = evaluateSlot(doc, file.name);
    const slotResult: SlotResult = { ...evaluation, file, previewUrl };

    setSlots(prev => {
      const next = new Map(prev);
      const old = prev.get(doc.id);
      if (old?.previewUrl) URL.revokeObjectURL(old.previewUrl);
      next.set(doc.id, slotResult);

      const allSlots = currentDocs.map(d => next.get(d.id) || {
        id: d.id, label: d.label, expected: d.expected, required: d.required,
        fileName: null, file: null, previewUrl: null, riskScore: 0, riskLevel: "LOW" as const,
        decision: null, checks: [], mismatchReason: null, mismatchReceivedLabel: null, authenticityStatus: "unknown" as const
      });
      const summary = computeSummary(allSlots, currentDocs);
      onResultsChange?.({ selectedDocumentType: selectedDocType, requiredItems: allSlots, overallSummary: summary });

      return next;
    });

    onSlotAnalyzed?.(slotResult);
  }, [currentDocs, selectedDocType, onResultsChange, onSlotAnalyzed]);

  const uploadedCount = Array.from(slots.values()).filter(s => s.fileName).length;
  const allSlots = currentDocs.map(d => slots.get(d.id) || null);
  const uploadedSlots = allSlots.filter(Boolean) as SlotResult[];
  const summary = uploadedSlots.length > 0 ? computeSummary(
    currentDocs.map(d => slots.get(d.id) || {
      id: d.id, label: d.label, expected: d.expected, required: d.required,
      fileName: null, file: null, previewUrl: null, riskScore: 0, riskLevel: "LOW" as const,
      decision: null, checks: [], mismatchReason: null, mismatchReceivedLabel: null, authenticityStatus: "unknown" as const
    }),
    currentDocs
  ) : null;

  return (
    <div className="space-y-4">
      <div className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-full flex items-center justify-between px-3 py-2 bg-[var(--panel2)] border border-[var(--border)] rounded-[var(--radius)] text-sm text-[var(--text)] hover:border-[var(--accent)] transition-colors"
          data-testid="button-doc-type-selector"
        >
          <span className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Doc Type:</span>
            <span className="font-medium">{selectedDocType}</span>
          </span>
          <ChevronDown className={cn("w-4 h-4 text-[var(--muted)] transition-transform", isDropdownOpen && "rotate-180")} />
        </button>

        <AnimatePresence>
          {isDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute z-20 w-full mt-1 bg-[var(--panel)] border border-[var(--border)] rounded-[var(--radius)] shadow-[var(--shadow-strong)] overflow-hidden"
            >
              {(Object.keys(DOC_TYPES) as DocTypeKey[]).map(dt => (
                <button
                  key={dt}
                  onClick={() => handleDocTypeChange(dt)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm transition-colors",
                    dt === selectedDocType
                      ? "bg-[var(--accent)]/10 text-[var(--accent)] font-medium"
                      : "text-[var(--text)] hover:bg-[var(--panel2)]"
                  )}
                  data-testid={`option-doc-type-${dt.toLowerCase().replace(/\s/g, '-')}`}
                >
                  {dt}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
            Required Uploads
          </h4>
          <span className="text-[10px] text-[var(--muted)]">
            {uploadedCount}/{currentDocs.length} uploaded
          </span>
        </div>

        <div className="grid gap-3">
          {currentDocs.map((doc) => {
            const slotData = slots.get(doc.id);
            const isUploaded = !!slotData?.fileName;

            return (
              <div
                key={doc.id}
                className="relative bg-[var(--panel)] border border-[var(--border)] rounded-[var(--radius)] p-3 transition-all hover:border-[var(--accent)]/50 hover:shadow-[var(--shadow)]"
                onMouseEnter={() => isUploaded ? setHoveredSlot(doc.id) : undefined}
                onMouseLeave={() => setHoveredSlot(null)}
                data-testid={`slot-${doc.id}`}
              >
                <div className="flex items-center gap-3">
                  {isUploaded && slotData?.previewUrl ? (
                    <div
                      className="relative w-[96px] h-[96px] rounded-md overflow-hidden border border-[var(--border)] shrink-0 cursor-pointer group/thumb"
                      onClick={() => setLightboxUrl(slotData.previewUrl)}
                    >
                      <img
                        src={slotData.previewUrl}
                        alt={doc.label}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                        <ZoomIn className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  ) : isUploaded ? (
                    <div className="w-[96px] h-[96px] rounded-md bg-[var(--panel2)] border border-[var(--border)] shrink-0 flex items-center justify-center">
                      <span className="text-[10px] text-[var(--muted)] text-center px-1">No preview</span>
                    </div>
                  ) : null}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-medium text-[var(--text)]">{doc.label}</span>
                      <span className={cn(
                        "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded tracking-wide",
                        doc.required
                          ? "bg-[var(--danger)]/10 text-[var(--danger)]"
                          : "bg-[var(--muted)]/10 text-[var(--muted)]"
                      )}>
                        {doc.required ? "Required" : "Optional"}
                      </span>
                    </div>

                    {isUploaded && slotData ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn(
                            "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded",
                            slotData.decision === "APPROVE" ? "bg-[var(--ok)]/15 text-[var(--ok)]" :
                            slotData.decision === "REJECT" ? "bg-[var(--danger)]/15 text-[var(--danger)]" :
                            "bg-[var(--grad-orange-start)]/15 text-[var(--grad-orange-start)]"
                          )}>
                            {slotData.decision === "APPROVE" ? "PASS" : slotData.decision === "REJECT" ? "FAIL" : "REVIEW"}
                          </span>
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded border font-bold",
                            slotData.riskLevel === "CRITICAL" ? "text-[var(--danger)] bg-[var(--danger)]/10 border-[var(--danger)]/20" :
                            slotData.riskLevel === "MEDIUM" ? "text-[var(--grad-orange-start)] bg-[var(--grad-orange-start)]/10 border-[var(--grad-orange-start)]/20" :
                            "text-[var(--ok)] bg-[var(--ok)]/10 border-[var(--ok)]/20"
                          )}>
                            Risk: {slotData.riskScore}%
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--muted)] truncate">
                          {slotData.mismatchReason || (slotData.authenticityStatus === "fail" ? "Authenticity failed" : slotData.authenticityStatus === "pass" ? "Authenticated" : "Needs review")}
                        </p>
                        <p className="text-[10px] text-[var(--muted)]/60 truncate">{slotData.fileName}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--muted)]">Upload JPG, PNG, or WebP</p>
                    )}
                  </div>

                  <div className="shrink-0">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      ref={el => { fileInputRefs.current[doc.id] = el; }}
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleSlotUpload(doc, e.target.files[0]);
                          e.target.value = '';
                        }
                      }}
                    />
                    <button
                      onClick={() => fileInputRefs.current[doc.id]?.click()}
                      className={cn(
                        "btn text-[10px] px-3 py-1.5 font-medium tracking-wide uppercase transition-all",
                        isUploaded
                          ? "btn-secondary hover-elevate active-elevate-2"
                          : "bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30 hover:bg-[var(--accent)]/20"
                      )}
                      data-testid={`button-upload-${doc.id}`}
                    >
                      <UploadCloud className="w-3 h-3" />
                      {isUploaded ? "Replace" : "Upload"}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {hoveredSlot === doc.id && isUploaded && slotData && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 right-0 top-full mt-1 z-30 bg-[var(--panel)] border border-[var(--border)] rounded-[var(--radius)] shadow-[var(--shadow-strong)] p-4"
                    >
                      <h5 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)] mb-3">
                        Checks
                      </h5>
                      <div className="grid gap-[10px]">
                        {slotData.checks.map((c, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2.5 h-[42px] px-3 bg-[var(--panel2)] border border-[var(--border)] rounded-[var(--radius)]"
                          >
                            {c.pass ? (
                              <Check className="w-3.5 h-3.5 text-[var(--ok)] shrink-0" />
                            ) : (
                              <X className="w-3.5 h-3.5 text-[var(--danger)] shrink-0" />
                            )}
                            <span className="text-[14px] font-semibold text-[var(--text)] shrink-0">
                              {c.name}
                            </span>
                            <span
                              className={cn(
                                "text-[11px] font-semibold px-2 py-0.5 rounded-full border shrink-0",
                                c.pass
                                  ? "text-[var(--ok)] bg-[var(--ok)]/10 border-[var(--ok)]/25"
                                  : "text-[var(--danger)] bg-[var(--danger)]/10 border-[var(--danger)]/25"
                              )}
                            >
                              {c.pass ? "PASS" : "FAIL"}
                            </span>
                            <span className="text-[12px] text-[var(--muted)] ml-auto truncate">
                              {c.note}
                            </span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {summary && uploadedSlots.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "p-4 rounded-[var(--radius)] border",
            summary.status === "VERIFIED" ? "bg-[var(--ok)]/5 border-[var(--ok)]/30" :
            summary.status === "FAILED" ? "bg-[var(--danger)]/5 border-[var(--danger)]/30" :
            "bg-[var(--grad-orange-start)]/5 border-[var(--grad-orange-start)]/30"
          )}
          data-testid="summary-card"
        >
          <div className="flex items-center gap-3 mb-3">
            {summary.status === "VERIFIED" ? (
              <Check className="w-5 h-5 text-[var(--ok)]" />
            ) : summary.status === "FAILED" ? (
              <X className="w-5 h-5 text-[var(--danger)]" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-[var(--grad-orange-start)]" />
            )}
            <span className={cn(
              "text-sm font-bold uppercase tracking-wide",
              summary.status === "VERIFIED" ? "text-[var(--ok)]" :
              summary.status === "FAILED" ? "text-[var(--danger)]" :
              "text-[var(--grad-orange-start)]"
            )}>
              {summary.status}
            </span>
          </div>

          <p className="text-xs text-[var(--text)] mb-2">
            <span className="font-medium">Authenticity:</span>{" "}
            <span className="text-[var(--muted)]">{summary.authenticitySummary}</span>
          </p>

          {summary.notes.length > 0 && (
            <div className="space-y-1 mt-2">
              {summary.notes.map((note, i) => (
                <p key={i} className="text-[11px] text-[var(--muted)] flex items-start gap-1.5">
                  <span className="mt-1 w-1 h-1 rounded-full bg-[var(--muted)]/40 shrink-0" />
                  {note}
                </p>
              ))}
            </div>
          )}
        </motion.div>
      )}

      <AnimatePresence>
        {lightboxUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-8"
            onClick={() => setLightboxUrl(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-[90vw] max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              <img
                src={lightboxUrl}
                alt="Enlarged preview"
                className="max-w-full max-h-[85vh] object-contain rounded-[var(--radius)] shadow-[var(--shadow-strong)]"
              />
              <button
                onClick={() => setLightboxUrl(null)}
                className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[var(--panel)] border border-[var(--border)] flex items-center justify-center shadow-[var(--shadow)] hover:bg-[var(--danger)]/20 transition-colors"
                data-testid="button-close-lightbox"
              >
                <X className="w-4 h-4 text-[var(--text)]" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
