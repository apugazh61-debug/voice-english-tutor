import { useState, useCallback, useEffect, useRef } from "react";
import { Sidebar } from "./components/Sidebar.jsx";
import { ChatWindow } from "./components/ChatWindow.jsx";
import { ControlsBar } from "./components/ControlsBar.jsx";
import { StatusBadge } from "./components/StatusBadge.jsx";
import { useCallMode } from "./hooks/useCallMode.js";
import { CallModeOverlay } from "./components/CallModeOverlay.jsx";
import { WelcomeScreen } from "./components/WelcomeScreen.jsx";

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

export default function App() {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState("");
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("idle");
  const [callModeActive, setCallModeActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [isMuted, setIsMuted] = useState(false);

  const [manRecorder, setManRecorder] = useState(null);
  const manChunksRef = useRef([]);

  const currentAudioRef = useRef(null);
  const queuedTasksRef = useRef([]);
  const isQueueProcessingRef = useRef(false);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/all-sessions");
      const data = await res.json();
      if (data.sessions?.length) {
        setSessions(data.sessions);
        if (!activeSessionId) {
          setActiveSessionId(data.sessions[0].id);
        }
      }
    } catch (e) {
      console.error("Fetch sessions error:", e);
    }
  }, [activeSessionId]);

  const fetchSessionMessages = useCallback(async (sessionId) => {
    if (!sessionId) return;
    try {
      const res = await fetch("/sessions/" + sessionId);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages.map((m) => ({ id: m.id, role: m.role, content: m.content })));
      }
    } catch (e) {
      console.error("Fetch messages error:", e);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (activeSessionId) {
      fetchSessionMessages(activeSessionId);
    }
  }, [activeSessionId, fetchSessionMessages]);

  const addMsg = (role, content, audioUrl = null) =>
    setMessages((prev) => [...prev, { role, content, audioUrl }]);

  const stopCurrentAudio = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
  }, []);

  const playReply = useCallback((audioSrc, onEnd) => {
    return new Promise((resolve) => {
      if (!audioSrc || isMuted) {
        if (onEnd) onEnd();
        resolve();
        return;
      }

      stopCurrentAudio();
      const audio = new Audio(audioSrc + (audioSrc.includes("?") ? "&" : "?") + Date.now());
      currentAudioRef.current = audio;

      const finish = () => {
        if (currentAudioRef.current === audio) {
          currentAudioRef.current = null;
        }
        if (onEnd) onEnd();
        resolve();
      };

      audio.play().catch(() => finish());
      audio.onended = finish;
    });
  }, [stopCurrentAudio, isMuted]);

  const processQueue = useCallback(async () => {
    if (isQueueProcessingRef.current === false) return;

    const nextTask = queuedTasksRef.current.shift();
    if (!nextTask) {
      isQueueProcessingRef.current = false;
      setIsStreaming(false);
      setStreamingText("");
      return;
    }

    try {
      await nextTask();
    } catch (err) {
      console.error("Queued task error:", err);
    }

    if (queuedTasksRef.current.length > 0) {
      await processQueue();
    } else {
      isQueueProcessingRef.current = false;
      setIsStreaming(false);
      setStreamingText("");
    }
  }, []);

  const enqueueTask = useCallback((task) => {
    queuedTasksRef.current.push(task);
    if (!isQueueProcessingRef.current) {
      isQueueProcessingRef.current = true;
      setIsStreaming(true);
      void processQueue();
    }
  }, [processQueue]);

  const ensureActiveSession = useCallback(async () => {
    if (activeSessionId) return activeSessionId;

    try {
      const res = await fetch("/new-chat", { method: "POST" });
      const data = await res.json();
      if (data.session_id) {
        const session = { id: data.session_id, title: data.title || "New Chat" };
        setSessions((prev) => [session, ...prev]);
        setActiveSessionId(session.id);
        return session.id;
      }
    } catch (e) {
      console.error("Ensure session error:", e);
    }

    return "";
  }, [activeSessionId]);

  const handleUploadFile = useCallback(async (file) => {
    if (!file || callModeActive) return;

    if (file.size > 15 * 1024 * 1024) {
      alert("File 15MB-ku mela irukku. Smaller file podunga.");
      return;
    }

    const sessionId = await ensureActiveSession();
    const formData = new FormData();
    formData.append("session_id", sessionId);

    let endpoint = "";
    let uploadedMessage = "";

    if (file.type.startsWith("image/")) {
      endpoint = "/analyze-image";
      formData.append("image", file);
      uploadedMessage = `Uploaded image: ${file.name}`;
    } else if (file.type.startsWith("audio/")) {
      endpoint = "/analyze-audio";
      formData.append("audio", file);
      uploadedMessage = `Uploaded audio: ${file.name}`;
    } else if (file.type.startsWith("video/")) {
      endpoint = "/analyze-video";
      formData.append("video", file);
      uploadedMessage = `Uploaded video: ${file.name}`;
    } else {
      alert("Image, audio, video files mattum upload pannunga.");
      return;
    }

    addMsg("user", uploadedMessage);
    setStatus("thinking");

    try {
      const res = await fetch(endpoint, { method: "POST", body: formData });
      const raw = await res.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { detail: raw };
      }

      if (!res.ok) {
        throw new Error(data?.detail || data?.error || "Upload failed");
      }

      const analysisText = data.transcript
        ? `Transcript: ${data.transcript}\n\n${data.ai_reply}`
        : data.ai_reply;

      const audioRes = await fetch("/audio?" + Date.now());
      const aiAudioBlob = await audioRes.blob();
      const aiAudioUrl = URL.createObjectURL(aiAudioBlob);

      addMsg("assistant", analysisText, aiAudioUrl);
      setStatus("speaking");
      await playReply(aiAudioUrl, () => setStatus("idle"));
      fetchSessions();
    } catch (err) {
      console.error("Upload analysis error:", err);
      addMsg("assistant", err?.message || "File analysis failed");
      setStatus("error");
      alert(err?.message || "File analysis failed");
      setTimeout(() => setStatus("idle"), 2500);
    }
  }, [activeSessionId, callModeActive, playReply, fetchSessions, ensureActiveSession]);

  const handleSendText = useCallback(async (msg) => {
    if (!msg) return;

    addMsg("user", msg);
    setStatus("thinking");
    setStreamingText("");

    const task = async () => {
      try {
        const sessionId = await ensureActiveSession();
        const formData = new FormData();
        formData.append("message", msg);
        formData.append("session_id", sessionId);

        const response = await fetch("/chat-text-stream", {
          method: "POST",
          body: formData,
        });

        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let accumText = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunkStr = decoder.decode(value, { stream: true });
          const lines = chunkStr.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const jsonStr = line.replace("data: ", "").trim();
              if (!jsonStr) continue;
              try {
                const parsed = JSON.parse(jsonStr);
                if (parsed.chunk) {
                  accumText += parsed.chunk;
                  setStreamingText(accumText);
                }
                if (parsed.done) {
                  addMsg("assistant", parsed.full_reply || accumText);
                  setStreamingText("");
                  setStatus("speaking");
                  await playReply(parsed.audio_url, () => setStatus("idle"));
                  fetchSessions();
                }
              } catch (err) {
                // ignore JSON parse error for incomplete frames
              }
            }
          }
        }
      } catch (err) {
        console.error("Streaming error:", err);
        setStatus("error");
        setTimeout(() => setStatus("idle"), 2500);
      }
    };

    enqueueTask(task);
  }, [playReply, fetchSessions, ensureActiveSession, enqueueTask]);

  const handleStartRecording = useCallback(async () => {
    try {
      const mime = getMimeType();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      manChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) manChunksRef.current.push(e.data); };
      recorder.start(250);
      setManRecorder(recorder);
      setIsRecording(true);
      setStatus("recording");
    } catch {
      setStatus("mic_error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }, []);

  const handleStopRecording = useCallback(() => {
    if (!manRecorder || manRecorder.state === "inactive") return;
    manRecorder.stop();
    manRecorder.stream.getTracks().forEach((t) => t.stop());
    setIsRecording(false);
    setStatus("thinking");

    manRecorder.onstop = async () => {
      const mime = getMimeType() || "audio/webm";
      const blob = new Blob(manChunksRef.current, { type: mime });
      if (blob.size < 500) { setStatus("idle"); return; }
      const userAudioUrl = URL.createObjectURL(blob);
      try {
        const sessionId = await ensureActiveSession();
        const fd = new FormData();
        fd.append("audio", blob, "recording.webm");
        fd.append("session_id", sessionId);
        const res = await fetch("/chat", { method: "POST", body: fd });
        if (!res.ok) throw new Error("server");
        const data = await res.json();

        const audioRes = await fetch("/audio?" + Date.now());
        const aiAudioBlob = await audioRes.blob();
        const aiAudioUrl = URL.createObjectURL(aiAudioBlob);

        if (data.you_said?.trim()) addMsg("user", data.you_said, userAudioUrl);
        addMsg("assistant", data.ai_reply, aiAudioUrl);
        setStatus("speaking");
        await playReply(aiAudioUrl, () => setStatus("idle"));
        fetchSessions();
      } catch {
        setStatus("error");
        setTimeout(() => setStatus("idle"), 2500);
      }
    };
  }, [manRecorder, playReply, fetchSessions, ensureActiveSession]);

  const { start: startCall, stop: stopCall } = useCallMode({
    onTranscript: (text, audioUrl) => addMsg("user", text, audioUrl),
    onAiReply: (text, audioUrl) => addMsg("assistant", text, audioUrl),
    onStatusChange: (s) => setStatus(s),
    onRecordingChange: (rec) => setIsRecording(rec),
    sessionId: activeSessionId,
    queueTask: enqueueTask,
    playReply,
  });

  const handleStartCall = useCallback(() => {
    if (callModeActive) return;
    setCallModeActive(true);
    startCall();
  }, [callModeActive, startCall]);

  const handleEndCall = useCallback(() => {
    stopCall();
    setCallModeActive(false);
    setIsRecording(false);
    setStatus("idle");
  }, [stopCall]);

  const handleToggleCall = useCallback(() => {
    if (callModeActive) {
      handleEndCall();
    } else {
      handleStartCall();
    }
  }, [callModeActive, handleEndCall, handleStartCall]);

  const handleNewSession = useCallback(async () => {
    try {
      const res = await fetch("/new-chat", { method: "POST" });
      const data = await res.json();
      if (data.session_id) {
        const session = { id: data.session_id, title: data.title || "New Chat" };
        setSessions((prev) => [session, ...prev]);
        setActiveSessionId(session.id);
        setMessages([]);
        if (sidebarOpen) setSidebarOpen(false);
      }
    } catch (e) {
      console.error(e);
    }
  }, [sidebarOpen]);

  const handleDeleteSession = useCallback(async (sessId) => {
    try {
      await fetch("/sessions/" + sessId, { method: "DELETE" });
      const updated = sessions.filter((s) => s.id !== sessId);
      setSessions(updated);
      if (activeSessionId === sessId) {
        if (updated.length) {
          setActiveSessionId(updated[0].id);
        } else {
          handleNewSession();
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [sessions, activeSessionId, handleNewSession]);

  const handleReset = useCallback(async () => {
    if (callModeActive) { stopCall(); setCallModeActive(false); }
    if (activeSessionId) {
      const fd = new FormData();
      fd.append("session_id", activeSessionId);
      await fetch("/reset", { method: "POST", body: fd });
      setMessages([]);
      setStatus("idle");
    }
  }, [callModeActive, stopCall, activeSessionId]);

  const handleDeleteAllHistory = useCallback(async () => {
    try {
      if (callModeActive) {
        stopCall();
        setCallModeActive(false);
      }

      await fetch("/delete-all-history", { method: "POST" });
      setMessages([]);
      setSessions([]);
      setActiveSessionId("");
      setStatus("idle");
      await handleNewSession();
    } catch (e) {
      console.error(e);
    }
  }, [callModeActive, stopCall, handleNewSession]);

  const handleRegenerate = useCallback(() => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg?.content) {
      handleSendText(lastUserMsg.content);
    }
  }, [messages, handleSendText]);

  return (
    <div className="relative flex h-screen overflow-hidden bg-gray-950">
      <div className={"w-72 h-screen flex-shrink-0 overflow-hidden border-r border-[#ec4899]/30 transition-transform duration-300 ease-in-out " + (sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0") }>
        <Sidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={(id) => { setActiveSessionId(id); setSidebarOpen(false); }}
          onNewSession={handleNewSession}
          onDeleteSession={handleDeleteSession}
          onDeleteAllHistory={handleDeleteAllHistory}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      <main className={"flex-1 flex flex-col h-screen overflow-hidden min-w-0 transition-all duration-300 " + (callModeActive ? "opacity-35 blur-[2px] pointer-events-none" : "opacity-100") }>
        <div className="flex flex-1 min-h-0 flex-col px-3 py-3 sm:px-5 sm:py-4 gap-3">
          <header className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 rounded-xl bg-slate-900/80 border border-pink-500/30 text-gray-300 hover:text-white"
              >
                ☰
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-pink-400/60 shadow-md waheeda-glow shrink-0">
                  <img src="/waheeda-avatar.png" alt="Waheeda" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h1 className="font-['Outfit'] text-2xl sm:text-3xl font-extrabold gradient-title tracking-tight flex items-center gap-2">
                    <span>Waheeda - English Tutor</span>
                    <span className="text-xl">✨</span>
                  </h1>
                  <p className="text-[11px] text-pink-300/80 font-semibold hidden sm:flex items-center gap-1">
                    <span>Friendly Voice & Interactive AI English Tutor</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMuted((prev) => !prev)}
                className="rounded-full border border-pink-500/30 bg-slate-900/80 px-3 py-2 text-lg text-white shadow-md transition hover:border-pink-400/60 hover:bg-slate-800"
                title={isMuted ? "Unmute AI voice" : "Mute AI voice"}
                aria-label={isMuted ? "Unmute AI voice" : "Mute AI voice"}
              >
                {isMuted ? "🔇" : "🔊"}
              </button>
              <StatusBadge status={status} />
            </div>
          </header>

          <div className="flex flex-1 min-h-0 flex-col overflow-hidden rounded-3xl border border-white/5 bg-black/10">
            <div className="flex-1 min-h-0 overflow-hidden">
              {messages.length > 0 || isStreaming ? (
                <ChatWindow
                  messages={messages}
                  isStreaming={isStreaming}
                  streamingText={streamingText}
                  onRegenerate={handleRegenerate}
                />
              ) : (
                <WelcomeScreen
                  onSelectPrompt={handleSendText}
                  onStartCall={handleStartCall}
                  onStartRecording={handleStartRecording}
                />
              )}
            </div>

            <div className="shrink-0 border-t border-white/5 bg-[#090612]/90 p-3 sm:p-4">
              <ControlsBar
                callModeActive={callModeActive}
                isRecording={isRecording}
                status={status}
                isStreaming={isStreaming}
                onSendText={handleSendText}
                onStartRecording={handleStartRecording}
                onStopRecording={handleStopRecording}
                onToggleCall={handleToggleCall}
                onReset={handleReset}
                onUploadFile={handleUploadFile}
              />
            </div>
          </div>
        </div>
      </main>

      {!callModeActive && (
        <button
          onClick={handleStartCall}
          className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-pink-400/40 bg-gradient-to-br from-pink-600 via-purple-600 to-indigo-700 text-white shadow-2xl shadow-pink-950/50 transition-transform hover:scale-105 active:scale-95"
          title="Start voice call"
        >
          🎧
        </button>
      )}

      {callModeActive && (
        <CallModeOverlay
          callModeActive={callModeActive}
          status={status}
          isRecording={isRecording}
          onToggleCall={handleToggleCall}
          onEndCall={handleEndCall}
        />
      )}
    </div>
  );
}