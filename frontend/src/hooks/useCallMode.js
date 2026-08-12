import { useRef, useCallback } from "react";

const SILENCE_THRESHOLD = 15;
const SILENCE_DURATION  = 1600;
const MIN_BLOB_SIZE     = 5000;

export function useCallMode({ onTranscript, onAiReply, onStatusChange, onRecordingChange, sessionId, queueTask, playReply }) {
  const activeRef   = useRef(false);
  const streamRef   = useRef(null);
  const recorderRef = useRef(null);
  const audioCtxRef = useRef(null);

  const getMimeType = () => {
    if (typeof MediaRecorder === "undefined") return "";
    const types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/aac",
      "audio/ogg",
    ];
    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) return t;
    }
    return "";
  };

  const listen = useCallback(async () => {
    if (!activeRef.current) return;
    onStatusChange("listening");
    onRecordingChange(true);

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch {
      onStatusChange("mic_error");
      activeRef.current = false;
      onRecordingChange(false);
      return;
    }

    streamRef.current = stream;
    const mime = getMimeType();
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    recorderRef.current = recorder;
    const chunks = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    const source   = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    let silenceStart = null;

    const checkSilence = () => {
      if (!activeRef.current || recorder.state !== "recording") return;
      analyser.getByteFrequencyData(data);
      const vol = data.reduce((a, b) => a + b, 0) / data.length;
      if (vol < SILENCE_THRESHOLD) {
        if (!silenceStart) silenceStart = Date.now();
        else if (Date.now() - silenceStart > SILENCE_DURATION) {
          recorder.stop();
          stream.getTracks().forEach((t) => t.stop());
          ctx.close().catch(() => {});
          onRecordingChange(false);
          return;
        }
      } else { silenceStart = null; }
      requestAnimationFrame(checkSilence);
    };

    recorder.start();
    requestAnimationFrame(checkSilence);

    recorder.onstop = async () => {
      const mimeType = getMimeType() || "audio/webm";
      const blob = new Blob(chunks, { type: mimeType });
      if (blob.size < MIN_BLOB_SIZE) {
        if (activeRef.current) {
          setTimeout(() => { if (activeRef.current) listen(); }, 300);
        }
        return;
      }
      onStatusChange("thinking");
      try {
        const fd = new FormData();
        fd.append("audio", blob, "recording.webm");
        if (sessionId) fd.append("session_id", sessionId);
        const res  = await fetch("/chat", { method: "POST", body: fd });
        if (!res.ok) throw new Error("server");
        const d = await res.json();
        if (d.you_said && d.you_said.trim()) {
          onTranscript(d.you_said);
          onAiReply(d.ai_reply);
          onStatusChange("speaking");
          await playReply("/audio" + "?" + Date.now(), () => {
            onStatusChange("listening");
            if (activeRef.current) {
              setTimeout(() => {
                if (activeRef.current) listen();
              }, 500);
            }
          });
        } else {
          onStatusChange("listening");
          if (activeRef.current) {
            setTimeout(() => { if (activeRef.current) listen(); }, 400);
          }
        }
      } catch {
        onStatusChange("error");
        setTimeout(() => { if (activeRef.current) listen(); }, 2000);
      }
    };
  }, [onTranscript, onAiReply, onStatusChange, onRecordingChange, sessionId, playReply]);

  const start = useCallback(() => { activeRef.current = true; listen(); }, [listen]);

  const stop = useCallback(() => {
    activeRef.current = false;
    onRecordingChange(false);
    try { if (recorderRef.current?.state === "recording") recorderRef.current.stop(); } catch {}
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    try { audioCtxRef.current?.close(); } catch {}
    onStatusChange("idle");
  }, [onStatusChange, onRecordingChange]);

  return { start, stop };
}
