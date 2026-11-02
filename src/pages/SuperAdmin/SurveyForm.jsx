import { useState, useEffect, useRef } from "react";
import api from "../../api/axios";
import { queueSubmission, cacheForm, getCachedForm } from "../../utils/offlineSync";
import MapPicker from "../../components/MapPicker";

const reconstruct = (obj) => {
  const chars = Object.keys(obj).filter((k) => /^\d+$/.test(k)).sort((a, b) => a - b).map((k) => obj[k]);
  return chars.length ? chars.join('') : '';
};
export const optVal = (opt) => {
  if (typeof opt !== "object" || opt === null) return opt;
  if (opt.value !== undefined) return opt.value;
  if (opt.label !== undefined) return opt.label;
  return reconstruct(opt);
};
export const optLabel = (opt) => {
  if (typeof opt !== "object" || opt === null) return opt;
  if (opt.label !== undefined) return opt.label;
  if (opt.value !== undefined) return opt.value;
  return reconstruct(opt);
};

const TYPE_ALIASES = {
  select: "dropdown",
  dropdown: "dropdown",
  radio: "single_choice",
  single_choice: "single_choice",
  checkbox: "multi_choice",
  multi_choice: "multi_choice",
  date: "date",
  time: "time",
  datetime: "datetime",
  "datetime-local": "datetime",
  switch: "switch",
  toggle: "switch",
  boolean: "switch",
  location: "location",
  map: "location",
  // Aadhaar spelling variants
  aadhaar: "aadhaar",
  aadhar: "aadhaar",
  adhar: "aadhaar",
  aadhaar_number: "aadhaar",
  // NEW: media upload (old "image" questions use the new uploader too)
  media: "media",
  file: "media",
  upload: "media",
  image: "media",
  video: "media",
  audio: "media",
};

// Decide the real field type. Any question whose label/fieldName says
// Aadhaar/Aadhar/Adhar is treated as "aadhaar" even if it was saved in the
// DB as plain "text" or "number" — so old questions are restricted too.
const looksLikeAadhaar = (str) => /a{1,2}dh?a{1,2}r/i.test(String(str || ""));
const resolveType = (q) => {
  const t = TYPE_ALIASES[q?.type] || q?.type;
  if ((!t || t === "text" || t === "number") && (looksLikeAadhaar(q?.label) || looksLikeAadhaar(q?.fieldName))) {
    return "aadhaar";
  }
  return t;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^(?:\+?91[\s-]?)?0?([6-9]\d{9})$/;
const AADHAAR_RE = /^[2-9]\d{11}$/; // exactly 12 digits, cannot start with 0 or 1
const ENABLE_AADHAAR_CHECKSUM = true; // set false if you need to allow dummy test numbers

// Verhoeff checksum (the algorithm real Aadhaar numbers follow)
const V_D = [
  [0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],
  [3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],
  [6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],
  [9,8,7,6,5,4,3,2,1,0],
];
const V_P = [
  [0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],
  [8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],
  [2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8],
];
const verhoeffValid = (num) => {
  let c = 0;
  const digits = String(num).split("").reverse().map(Number);
  for (let i = 0; i < digits.length; i++) c = V_D[c][V_P[i % 8][digits[i]]];
  return c === 0;
};

export const validateFieldFormat = (resolvedType, rawValue) => {
  if (rawValue === undefined || rawValue === null || rawValue === "") return null;
  if (resolvedType === "email") {
    return EMAIL_RE.test(String(rawValue).trim()) ? null : "Enter a valid email address";
  }
  if (resolvedType === "phone" || resolvedType === "mobile") {
    return PHONE_RE.test(String(rawValue).trim()) ? null : "Enter a valid 10-digit phone number";
  }
  if (resolvedType === "aadhaar") {
    const v = String(rawValue).replace(/\s/g, "");
    if (!/^\d+$/.test(v)) return "Aadhaar number must contain digits only";
    if (v.length !== 12) return "Aadhaar number must be exactly 12 digits";
    if (!AADHAAR_RE.test(v)) return "Aadhaar number cannot start with 0 or 1";
    if (ENABLE_AADHAAR_CHECKSUM && !verhoeffValid(v)) return "Enter a valid Aadhaar number";
    return null;
  }
  return null;
};

// ── Location (map) field ──────────────────────────────────────
function LocationField({ fieldName, value, onChange, gps, gpsStatus, onRetryGPS }) {
  // Auto-fill from device GPS once (user can still correct it manually)
  useEffect(() => {
    if (!value && gps) {
      onChange(fieldName, `${gps.lat.toFixed(6)}, ${gps.lon.toFixed(6)}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gps]);

  const [lat, lon] = String(value || "").split(",").map((s) => parseFloat(s));
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lon);

  const useMyGPS = () => {
    if (gps) onChange(fieldName, `${gps.lat.toFixed(6)}, ${gps.lon.toFixed(6)}`);
    else onRetryGPS && onRetryGPS();
  };

  return (
    <div>
      <MapPicker
        lat={hasCoords ? lat : ""}
        lng={hasCoords ? lon : ""}
        height={260}
        onChange={(la, ln) => onChange(fieldName, `${la.toFixed(6)}, ${ln.toFixed(6)}`)}
      />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: hasCoords ? "#2e7d32" : "#e65100" }}>
          {hasCoords
            ? `📍 ${lat.toFixed(5)}, ${lon.toFixed(5)}`
            : gpsStatus === "loading" ? "Fetching your location..." : "Location not set — tap the map to place the pin"}
        </span>
        <button
          type="button"
          onClick={useMyGPS}
          style={{ padding: "4px 10px", fontSize: 12, border: "1px solid #1a73e8", background: "#fff", color: "#1a73e8", borderRadius: 4, cursor: "pointer" }}
        >
          Use my current GPS
        </button>
      </div>
    </div>
  );
}

// ── Media upload field ────────────────────────────────────────
const MEDIA_MAX_FILES = 3;     // max files per question
const MEDIA_MAX_MB = 5;       // max size per video/audio/pdf file
const MEDIA_ACCEPT = "image/*,video/*,audio/*,application/pdf";
const VIDEO_MAX_SECONDS = 30; // camera video auto-stops so the file stays small

const readAsDataURL = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// Photos are resized + compressed so they stay small (important for
// slow networks and for saving entries offline).
const compressImage = (file, maxSize = 1280, quality = 0.7) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });

// ── Camera modal (in-browser camera: photo + video) ───────────
function CameraModal({ onCapture, onClose, maxMB }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const [mode, setMode] = useState("photo");           // photo | video
  const [facing, setFacing] = useState("environment"); // back | front camera
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const [err, setErr] = useState("");
  const [working, setWorking] = useState(false);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  // Start / restart the camera when mode or facing changes
  useEffect(() => {
    let cancelled = false;
    setErr("");
    stopStream();
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: facing }, audio: mode === "video" })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      })
      .catch(() => setErr("Camera open avvaledu. Browser settings lo camera permission allow cheyandi."));
    return () => {
      cancelled = true;
      stopStream();
    };
  }, [mode, facing]);

  // Cleanup on close
  useEffect(() => () => {
    clearInterval(timerRef.current);
    if (recorderRef.current && recorderRef.current.state === "recording") {
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
  }, []);

  const takePhoto = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const scale = Math.min(1, 1280 / Math.max(v.videoWidth, v.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(v.videoWidth * scale);
    canvas.height = Math.round(v.videoHeight * scale);
    canvas.getContext("2d").drawImage(v, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/jpeg", 0.7);
    onCapture({
      name: `photo_${Date.now()}.jpg`,
      type: "image/jpeg",
      size: Math.round((data.length * 3) / 4),
      data,
    });
  };

  const stopRecording = () => {
    clearInterval(timerRef.current);
    if (recorderRef.current && recorderRef.current.state === "recording") {
      recorderRef.current.stop();
    }
    setRecording(false);
  };

  const startRecording = () => {
    if (!streamRef.current || typeof MediaRecorder === "undefined") {
      setErr("Ee browser lo video recording support ledu. 'Upload' option vadandi.");
      return;
    }
    setErr("");
    chunksRef.current = [];
    const mimeType = ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"].find(
      (m) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)
    );
    let recorder;
    try {
      recorder = new MediaRecorder(streamRef.current, {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: 800000, // keeps files small
      });
    } catch (e) {
      setErr("Video recording start avvaledu.");
      return;
    }
    recorder.ondataavailable = (e) => e.data && e.data.size > 0 && chunksRef.current.push(e.data);
    recorder.onstop = async () => {
      const type = recorder.mimeType || mimeType || "video/webm";
      const blob = new Blob(chunksRef.current, { type });
      if (blob.size > maxMB * 1024 * 1024) {
        setErr(`Video ${maxMB} MB kanna pedda undi. Chinna video record cheyandi.`);
        return;
      }
      setWorking(true);
      try {
        const data = await readAsDataURL(blob);
        const ext = type.includes("mp4") ? "mp4" : "webm";
        onCapture({ name: `video_${Date.now()}.${ext}`, type: type.split(";")[0], size: blob.size, data });
      } catch (e) {
        setErr("Video save avvaledu. Malli try cheyandi.");
        setWorking(false);
      }
    };
    recorderRef.current = recorder;
    recorder.start(1000);
    setRecording(true);
    setSecs(0);

    let elapsed = 0;
    timerRef.current = setInterval(() => {
      elapsed += 1;
      setSecs(elapsed);
      if (elapsed >= VIDEO_MAX_SECONDS) stopRecording();
    }, 1000);
  };

  const circleBtn = (bg) => ({
    width: 64, height: 64, borderRadius: "50%", border: "4px solid #fff",
    background: bg, cursor: "pointer", padding: 0,
  });
  const smallBtn = {
    padding: "8px 14px", borderRadius: 20, border: "none", cursor: "pointer",
    fontSize: 13, fontWeight: 600, background: "rgba(255,255,255,0.18)", color: "#fff",
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#000", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, gap: 8 }}>
        <button type="button" style={smallBtn} onClick={onClose} disabled={recording}>✕ Close</button>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" disabled={recording} onClick={() => setMode("photo")}
            style={{ ...smallBtn, background: mode === "photo" ? "#1a73e8" : smallBtn.background }}>📷 Photo</button>
          <button type="button" disabled={recording} onClick={() => setMode("video")}
            style={{ ...smallBtn, background: mode === "video" ? "#1a73e8" : smallBtn.background }}>🎥 Video</button>
        </div>
        <button type="button" disabled={recording} style={smallBtn}
          onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}>🔄 Flip</button>
      </div>

      {/* Live preview */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>
        <video ref={videoRef} playsInline muted autoPlay style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        {recording && (
          <div style={{ position: "absolute", top: 10, left: 12, color: "#fff", background: "rgba(229,57,53,0.9)", padding: "3px 10px", borderRadius: 12, fontSize: 13, fontWeight: 700 }}>
            ● {secs}s / {VIDEO_MAX_SECONDS}s
          </div>
        )}
      </div>

      {err && <div style={{ color: "#ff8a80", textAlign: "center", fontSize: 13, padding: "6px 16px" }}>{err}</div>}

      {/* Shutter */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: 20 }}>
        {working ? (
          <span style={{ color: "#fff" }}>Processing...</span>
        ) : mode === "photo" ? (
          <button type="button" onClick={takePhoto} style={circleBtn("#fff")} title="Take photo" />
        ) : recording ? (
          <button type="button" onClick={stopRecording} style={circleBtn("#e53935")} title="Stop">
            <span style={{ display: "block", width: 22, height: 22, background: "#fff", margin: "0 auto", borderRadius: 3 }} />
          </button>
        ) : (
          <button type="button" onClick={startRecording} style={circleBtn("#e53935")} title="Record" />
        )}
      </div>
    </div>
  );
}

function MediaField({ fieldName, value, onChange }) {
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const uploadRef = useRef(null);
  const fallbackCamRef = useRef(null);

  const files = Array.isArray(value) ? value : value ? [value] : []; // supports old single base64 value
  const limitReached = files.length >= MEDIA_MAX_FILES;

  // Normal upload (gallery / files) and native-camera fallback
  const handleFiles = async (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = ""; // allow picking the same file again
    if (picked.length === 0) return;

    setLocalError("");
    if (files.length + picked.length > MEDIA_MAX_FILES) {
      setLocalError(`You can upload at most ${MEDIA_MAX_FILES} files here`);
      return;
    }

    setBusy(true);
    try {
      const added = [];
      for (const file of picked) {
        const isImage = file.type.startsWith("image/");
        if (!isImage && file.size > MEDIA_MAX_MB * 1024 * 1024) {
          setLocalError(`"${file.name}" is larger than ${MEDIA_MAX_MB} MB`);
          continue;
        }
        const data = isImage ? await compressImage(file) : await readAsDataURL(file);
        added.push({
          name: file.name,
          type: isImage ? "image/jpeg" : file.type,
          size: file.size,
          data,
        });
      }
      if (added.length) onChange(fieldName, [...files, ...added]);
    } catch (err) {
      setLocalError("Couldn't read this file. Please try another one.");
    } finally {
      setBusy(false);
    }
  };

  // Item captured from the in-browser camera
  const handleCaptured = (item) => {
    setCameraOpen(false);
    setLocalError("");
    onChange(fieldName, [...files, item]);
  };

  const openCamera = () => {
    setMenuOpen(false);
    setLocalError("");
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      setCameraOpen(true);
    } else {
      // Old browser / non-HTTPS: fall back to the phone's native camera
      fallbackCamRef.current && fallbackCamRef.current.click();
    }
  };

  const openUpload = () => {
    setMenuOpen(false);
    uploadRef.current && uploadRef.current.click();
  };

  const removeFile = (i) => onChange(fieldName, files.filter((_, idx) => idx !== i));

  const renderPreview = (f) => {
    const src = typeof f === "string" ? f : f.data;
    const type = typeof f === "string" ? "image/jpeg" : f.type || "";
    if (type.startsWith("image/")) return <img src={src} alt="preview" style={{ width: "100%", maxHeight: 140, objectFit: "cover", borderRadius: 6 }} />;
    if (type.startsWith("video/")) return <video src={src} controls style={{ width: "100%", maxHeight: 160, borderRadius: 6 }} />;
    if (type.startsWith("audio/")) return <audio src={src} controls style={{ width: "100%" }} />;
    return <div style={{ fontSize: 28, textAlign: "center" }}>📄</div>;
  };

  const optionStyle = {
    display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 14px",
    border: "none", background: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600,
    color: "#333", textAlign: "left",
  };

  return (
    <div>
      {/* Single Add button -> 2 options (Camera / Upload) */}
      <div style={{ position: "relative", display: "inline-block" }}>
        <button
          type="button"
          disabled={busy || limitReached}
          onClick={() => setMenuOpen((o) => !o)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px",
            border: "1.5px dashed #1a73e8", color: "#1a73e8", background: "#f5f8ff",
            borderRadius: 8, cursor: busy || limitReached ? "default" : "pointer",
            fontSize: 13.5, fontWeight: 600, opacity: busy || limitReached ? 0.5 : 1,
          }}
        >
          📎 {busy ? "Processing..." : "Add photo / video"} ▾
        </button>

        {menuOpen && (
          <>
            {/* click-outside backdrop */}
            <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 10 }} />
            <div
              style={{
                position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 11, minWidth: 200,
                background: "#fff", border: "1px solid #ddd", borderRadius: 8,
                boxShadow: "0 4px 14px rgba(0,0,0,0.15)", overflow: "hidden",
              }}
            >
              <button type="button" onClick={openCamera} style={optionStyle}>📷 Camera</button>
              <div style={{ height: 1, background: "#eee" }} />
              <button type="button" onClick={openUpload} style={optionStyle}>🖼️ Upload from device</button>
            </div>
          </>
        )}
      </div>

      {/* Hidden inputs */}
      <input ref={uploadRef} type="file" accept={MEDIA_ACCEPT} multiple onChange={handleFiles} style={{ display: "none" }} />
      <input ref={fallbackCamRef} type="file" accept="image/*,video/*" capture="environment" onChange={handleFiles} style={{ display: "none" }} />

      <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
        Max {MEDIA_MAX_FILES} files • Video/audio/PDF up to {MEDIA_MAX_MB} MB • Photos are auto-compressed
      </div>

      {localError && <div style={{ color: "#e53935", fontSize: 12, marginTop: 4 }}>{localError}</div>}

      {files.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginTop: 10 }}>
          {files.map((f, i) => (
            <div key={i} style={{ border: "1px solid #e0e0e0", borderRadius: 8, padding: 6, position: "relative", background: "#fafafa" }}>
              {renderPreview(f)}
              <div style={{ fontSize: 11, color: "#666", marginTop: 4, overflowWrap: "anywhere" }}>
                {typeof f === "string" ? "photo" : f.name}
              </div>
              <button
                type="button"
                onClick={() => removeFile(i)}
                title="Remove"
                style={{
                  position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%",
                  border: "none", background: "rgba(0,0,0,0.65)", color: "#fff", cursor: "pointer", fontSize: 12, lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {cameraOpen && (
        <CameraModal
          maxMB={MEDIA_MAX_MB}
          onCapture={handleCaptured}
          onClose={() => setCameraOpen(false)}
        />
      )}
    </div>
  );
}

// ── Field renderer ────────────────────────────────────────────
export function FormField({ question, value, onChange, error, onBlur, gps, gpsStatus, onRetryGPS }) {
  const { label, fieldName, type, options, isMandatory } = question;
  const resolvedType = resolveType(question);

  const inputBase = {
    width: "100%",
    padding: "9px 12px",
    border: `1px solid ${error ? "#e53935" : "#ddd"}`,
    borderRadius: 6,
    fontSize: 14,
    boxSizing: "border-box",
  };

  let field;
  switch (resolvedType) {
    case "text":
    case "number":
    case "email":
    case "phone":
    case "mobile":
    case "aadhaar":
    case "date":
    case "time":
    case "datetime":
      field = (
        <input
          type={
            resolvedType === "date" ? "date"
            : resolvedType === "time" ? "time"
            : resolvedType === "datetime" ? "datetime-local"
            : resolvedType === "number" ? "number"
            : resolvedType === "email" ? "email"
            : resolvedType === "phone" || resolvedType === "mobile" ? "tel"
            : "text"
          }
          value={value || ""}
          onChange={(e) => {
            let v = e.target.value;
            // Block the wrong kind of character as the user types
            if (resolvedType === "phone" || resolvedType === "mobile") {
              // Phone: digits only, max 10 — letters/symbols never make it in.
              v = v.replace(/\D/g, "").slice(0, 10);
            } else if (resolvedType === "aadhaar") {
              // Aadhaar: digits only, max 12 — spaces/letters/symbols (even pasted) are stripped.
              v = v.replace(/\D/g, "").slice(0, 12);
            } else if (resolvedType === "email") {
              // Email: no spaces — letters/numbers/symbols like @ . _ - are fine.
              v = v.replace(/\s/g, "");
            }
            onChange(fieldName, v);
          }}
          onBlur={() => onBlur && onBlur(fieldName, value)}
          placeholder={
            resolvedType === "email" ? "name@example.com"
            : resolvedType === "phone" || resolvedType === "mobile" ? "10-digit mobile number"
            : resolvedType === "aadhaar" ? "12-digit Aadhaar number"
            : `Enter ${label}`
          }
          style={inputBase}
          inputMode={["phone", "mobile", "aadhaar"].includes(resolvedType) ? "numeric" : undefined}
          maxLength={
            resolvedType === "aadhaar" ? 12
            : resolvedType === "phone" || resolvedType === "mobile" ? 10
            : undefined
          }
        />
      );
      break;
    case "textarea":
      field = (
        <textarea
          value={value || ""}
          onChange={(e) => onChange(fieldName, e.target.value)}
          onBlur={() => onBlur && onBlur(fieldName, value)}
          placeholder={`Enter ${label}`}
          rows={4}
          style={{ ...inputBase, resize: "vertical", fontFamily: "inherit" }}
        />
      );
      break;
    case "percentage":
      field = (
        <input
          type="number"
          min={0}
          max={100}
          value={value || ""}
          onChange={(e) => onChange(fieldName, e.target.value)}
          placeholder="0-100"
          style={inputBase}
        />
      );
      break;
    case "ratio":
      field = (
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(fieldName, e.target.value)}
          placeholder="e.g. 1:2"
          style={inputBase}
        />
      );
      break;
    case "location":
      field = (
        <LocationField
          fieldName={fieldName}
          value={value}
          onChange={onChange}
          gps={gps}
          gpsStatus={gpsStatus}
          onRetryGPS={onRetryGPS}
        />
      );
      break;
    case "switch":
      field = (
        <label style={{ display: "inline-flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <span
            role="switch"
            aria-checked={!!value}
            onClick={() => onChange(fieldName, !value)}
            style={{
              width: 42,
              height: 24,
              borderRadius: 12,
              background: value ? "#1a73e8" : "#ccc",
              position: "relative",
              transition: "background 0.2s ease",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                position: "absolute",
                top: 2,
                left: value ? 20 : 2,
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: "#fff",
                transition: "left 0.2s ease",
                boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
              }}
            />
          </span>
          <span style={{ fontSize: 13.5, color: "#444" }}>{value ? "Yes" : "No"}</span>
        </label>
      );
      break;
    case "dropdown":
      field = (
        <select value={value || ""} onChange={(e) => onChange(fieldName, e.target.value)} style={inputBase}>
          <option value="">-- Select --</option>
          {(options || []).map((opt) => <option key={optVal(opt)} value={optVal(opt)}>{optLabel(opt)}</option>)}
        </select>
      );
      break;
    case "single_choice":
      field = (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
          {(options || []).map((opt) => {
            const ov = optVal(opt);
            const isSelected = value === ov;
            return (
              <button
                type="button"
                key={ov}
                onClick={() => onChange(fieldName, ov)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 20,
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: isSelected ? "1.5px solid #1a73e8" : "1.5px solid #ddd",
                  background: isSelected ? "#e8f0fe" : "#fff",
                  color: isSelected ? "#1a73e8" : "#444",
                  transition: "all 0.15s ease",
                }}
              >
                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    border: isSelected ? "4px solid #1a73e8" : "1.5px solid #bbb",
                    background: "#fff",
                    display: "inline-block",
                    flexShrink: 0,
                  }}
                />
                {optLabel(opt)}
              </button>
            );
          })}
        </div>
      );
      break;
    case "multi_choice":
      field = (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
          {(options || []).map((opt) => {
            const ov = optVal(opt);
            const checked = Array.isArray(value) && value.includes(ov);
            return (
              <button
                type="button"
                key={ov}
                onClick={() => {
                  const current = Array.isArray(value) ? value : [];
                  const updated = checked ? current.filter((v) => v !== ov) : [...current, ov];
                  onChange(fieldName, updated);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 20,
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: checked ? "1.5px solid #2e7d32" : "1.5px solid #ddd",
                  background: checked ? "#e8f5e9" : "#fff",
                  color: checked ? "#2e7d32" : "#444",
                  transition: "all 0.15s ease",
                }}
              >
                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 4,
                    border: checked ? "none" : "1.5px solid #bbb",
                    background: checked ? "#2e7d32" : "#fff",
                    color: "#fff",
                    fontSize: 11,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {checked ? "✓" : ""}
                </span>
                {optLabel(opt)}
              </button>
            );
          })}
        </div>
      );
      break;
    // NEW: media upload (also handles old "image" questions)
    case "media":
      field = <MediaField fieldName={fieldName} value={value} onChange={onChange} />;
      break;
    default:
      field = <input type="text" value={value || ""} onChange={(e) => onChange(fieldName, e.target.value)} style={inputBase} />;
  }

  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, display: "block" }}>
        {label}
        {isMandatory && <span style={{ color: "#e53935", marginLeft: 4 }}>*</span>}
        <span style={{ fontWeight: 400, color: "#999", fontSize: 11, marginLeft: 8 }}>[{type}]</span>
      </label>
      {field}
      {error && <div style={{ color: "#e53935", fontSize: 12, marginTop: 3 }}>{error}</div>}
    </div>
  );
}

// ── GPS location fetcher ──────────────────────────────────────
function useGPS() {
  const [location, setLocation] = useState(null);
  const [gpsStatus, setGpsStatus] = useState("idle"); // idle | loading | ok | error

  const fetchGPS = () => {
    if (!navigator.geolocation) return setGpsStatus("error");
    setGpsStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setGpsStatus("ok");
      },
      () => setGpsStatus("error"),
      { timeout: 10000 }
    );
  };

  return { location, gpsStatus, fetchGPS };
}

// Turn a queueSubmission() failure into a message the user can actually act on.
function offlineSaveErrorMessage(err) {
  return err?.message === 'STORAGE_FULL'
    ? "Couldn't save offline — this device's storage is full. Free up space (e.g. clear old synced entries) and try again."
    : "Couldn't save this entry offline. Please try again.";
}

// ── Main SurveyForm ───────────────────────────────────────────
export default function SurveyForm({ projectId, formType, onSuccess, onOffline }) {
  const [form, setForm] = useState(null);   // rendered form from API
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [answers, setAnswers] = useState({});
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [savedOffline, setSavedOffline] = useState(false);
  const { location, gpsStatus, fetchGPS } = useGPS();

  useEffect(() => {
    setLoading(true);
    setLoadError(false);

    if (!navigator.onLine) {
      const cached = getCachedForm(projectId, formType);
      if (cached) setForm(cached);
      else setLoadError(true);
      setLoading(false);
      fetchGPS();
      return;
    }

    api.get(`/forms/render/${projectId}/${encodeURIComponent(formType)}`)
      .then((res) => {
        if (res.data.success) {
          setForm(res.data.data);
          cacheForm(projectId, formType, res.data.data); // available offline next time
        } else {
          setLoadError(true);
        }
      })
      .catch((err) => {
        // No response at all = network problem, so fall back to the cached form
        if (!err.response) {
          const cached = getCachedForm(projectId, formType);
          if (cached) {
            setForm(cached);
          } else {
            setLoadError(true);
          }
        } else {
          setLoadError(true);
        }
      })
      .finally(() => {
        setLoading(false);
        fetchGPS(); // auto-request GPS on form load — works offline too (device GPS)
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, formType]);

  const handleChange = (fieldName, value, question) => {
    setAnswers((prev) => ({ ...prev, [fieldName]: value }));

    // Re-check format (email/phone/aadhaar) as the user types, so a wrong
    // value is flagged immediately.
    const resolvedType = resolveType(question);
    const isEmpty = value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);

    let formatError = isEmpty ? null : validateFieldFormat(resolvedType, value);
    // Aadhaar: don't nag while the user is still typing; blur/submit will catch it
    if (resolvedType === "aadhaar" && String(value || "").length < 12) formatError = null;

    setErrors((prev) => ({ ...prev, [fieldName]: formatError }));
  };

  // Fires when the user leaves a field. Catches the "required" case and
  // incomplete formats (e.g. Aadhaar with fewer than 12 digits).
  const handleBlur = (fieldName, value, question) => {
    const resolvedType = resolveType(question);
    const isEmpty = value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);

    if (isEmpty) {
      if (question?.isMandatory) {
        setErrors((prev) => ({ ...prev, [fieldName]: `${question.label} is required` }));
      }
      return;
    }
    const formatError = validateFieldFormat(resolvedType, value);
    if (formatError) setErrors((prev) => ({ ...prev, [fieldName]: formatError }));
  };

  const validate = () => {
    const errs = {};
    (form?.questions || []).forEach((q) => {
      const resolvedType = resolveType(q);
      const val = answers[q.fieldName];
      const isEmpty = val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0);

      if (q.isMandatory && isEmpty) {
        errs[q.fieldName] = `${q.label} is required`;
        return;
      }
      // Format checks (email/phone/aadhaar) run whenever something was typed,
      // even for optional fields — an invalid value is invalid either way.
      if (!isEmpty) {
        const formatError = validateFieldFormat(resolvedType, val);
        if (formatError) errs[q.fieldName] = formatError;
      }
    });
    return errs;
  };

  const submit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      // Scroll to first error (wait a tick so data-error attributes are updated)
      setTimeout(() => {
        const firstErr = document.querySelector('[data-error="true"]');
        firstErr?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return;
    }

    // If the form has a location question, save the (possibly manually
    // corrected) pin as the entry's location instead of the raw device GPS.
    const locQ = (form?.questions || []).find((q) => (TYPE_ALIASES[q.type] || q.type) === "location");
    const picked = locQ ? String(answers[locQ.fieldName] || "").split(",").map((s) => parseFloat(s)) : [];
    const finalLocation =
      Number.isFinite(picked[0]) && Number.isFinite(picked[1])
        ? { lat: picked[0], lon: picked[1] }
        : location;

    setSubmitting(true);
    const payload = {
      project: projectId,
      formType,
      data: answers,
      location: finalLocation || undefined,
    };

    if (!navigator.onLine) {
      try {
        queueSubmission(payload);
        setSavedOffline(true);
        onOffline && onOffline();
      } catch (err) {
        // queueSubmission throws if it couldn't actually persist the entry
        setErrors({ _form: offlineSaveErrorMessage(err) });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    try {
      const res = await api.post('/submissions', payload);
      if (res.data.success) {
        setSubmitted(true);
        onSuccess && onSuccess(res.data.data);
      } else {
        setErrors({ _form: res.data.message || 'Submission failed. Please try again.' });
      }
    } catch (error) {
      const isRealApiError =
        error.response &&
        error.response.data &&
        typeof error.response.data === 'object' &&
        'success' in error.response.data;

      if (!navigator.onLine || !isRealApiError) {
        try {
          queueSubmission(payload);
          setSavedOffline(true);
          onOffline && onOffline();
        } catch (queueErr) {
          setErrors({ _form: offlineSaveErrorMessage(queueErr) });
        }
      } else {
        setErrors({ _form: error.response.data.message || 'Submission failed. Please try again.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: 24, textAlign: "center", color: "#666" }}>Form loading...</div>;
  if (loadError || !form) {
    return (
      <div style={{ padding: 24, color: "#e53935" }}>
        {!navigator.onLine
          ? "You're offline and this form hasn't been cached on this device yet. Open the app once while online, and it'll be available offline after that."
          : "Couldn't load the form. Please try again."}
      </div>
    );
  }

  if (savedOffline) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 48 }}>📴</div>
        <h3 style={{ color: "#e65100", margin: "8px 0 4px" }}>Saved offline</h3>
        <p style={{ color: "#666", maxWidth: 380, margin: "0 auto" }}>
          No internet connection right now, so this entry was saved on this device.
          It will sync automatically the moment you're back online — you don't need to do anything.
        </p>
        <button
          onClick={() => { setSavedOffline(false); setAnswers({}); setErrors({}); }}
          style={{ marginTop: 16, padding: "10px 24px", background: "#1a73e8", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
        >
          New Entry
        </button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 48 }}>✅</div>
        <h3 style={{ color: "#2e7d32" }}>Successfully submitted!</h3>
        <p style={{ color: "#666" }}>You can now start a new entry.</p>
        <button
          onClick={() => { setSubmitted(false); setAnswers({}); setErrors({}); }}
          style={{ marginTop: 16, padding: "10px 24px", background: "#1a73e8", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
        >
          New Entry
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
      {/* Header */}
      <h3 style={{ marginBottom: 4 }}>{form.title}</h3>
      {form.description && <p style={{ color: "#666", marginBottom: 8 }}>{form.description}</p>}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <span style={badge("#e8f0fe", "#1a73e8")}>{form.formType}</span>
        <span style={badge("#e8f5e9", "#2e7d32")}>{form.totalQuestions} Questions</span>
        <span style={badge(gpsStatus === "ok" ? "#e8f5e9" : "#fff3e0", gpsStatus === "ok" ? "#2e7d32" : "#e65100")}>
          📍 {gpsStatus === "loading" ? "GPS fetching..." : gpsStatus === "ok" && location ? `${location.lat.toFixed(5)}, ${location.lon.toFixed(5)}` : "No GPS"}
        </span>
      </div>

      {/* Map is not added by default — it only appears through a "location" question */}

      {errors._form && (
        <div style={{ background: "#fdecea", color: "#c62828", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13.5 }}>
          {errors._form}
        </div>
      )}

      {/* Fields */}
      {form.questions.length === 0 ? (
        <div style={{ background: "#fff3e0", color: "#e65100", padding: "16px", borderRadius: 8, fontSize: 13.5, lineHeight: 1.6 }}>
          No questions have been set up yet for the "{formType}" form on this project.
          Go to <strong>Survey Forms (Builder)</strong> in the Super Admin menu, pick this project and form
          type, and add the fields you want field agents to fill in — they'll appear here automatically.
        </div>
      ) : (
        <>
          {form.questions.map((q) => (
            <div key={q._id} data-error={!!errors[q.fieldName]}>
              <FormField
                question={q}
                value={answers[q.fieldName]}
                onChange={(fieldName, value) => handleChange(fieldName, value, q)}
                onBlur={(fieldName, value) => handleBlur(fieldName, value, q)}
                error={errors[q.fieldName]}
                gps={location}
                gpsStatus={gpsStatus}
                onRetryGPS={fetchGPS}
              />
            </div>
          ))}

          {/* Submit */}
          <button
            onClick={submit}
            disabled={submitting}
            style={{
              width: "100%",
              padding: "13px",
              background: submitting ? "#90caf9" : "#1a73e8",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 16,
              cursor: submitting ? "default" : "pointer",
              marginTop: 8,
            }}
          >
            {submitting ? "Submitting..." : "Submit Survey"}
          </button>
        </>
      )}
    </div>
  );
}

const badge = (bg, color) => ({
  background: bg,
  color,
  padding: "2px 10px",
  borderRadius: 12,
  fontSize: 12,
  fontWeight: 600,
});