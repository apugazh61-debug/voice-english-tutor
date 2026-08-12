import { useRef, useState } from "react";

export function ControlsBar({
  callModeActive,
  isRecording,
  onSendText,
  onStartRecording,
  onStopRecording,
  onToggleCall,
  onReset,
  onUploadFile,
  status,
  isStreaming,
}) {
  const [text, setText] = useState("");
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleSend = async () => {
    const msg = text.trim();
    if (!msg || isStreaming || status === "thinking") return;
    setText("");
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
    onSendText(msg);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const micDisabled = callModeActive || status === "thinking" || status === "speaking" || isStreaming;
  const uploadDisabled = callModeActive || status === "thinking" || status === "speaking" || status === "recording" || isStreaming;

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !onUploadFile) return;
    await onUploadFile(file);
  };

  return (
    <div className="waheeda-glass p-4 sm:p-5 flex flex-col gap-4 border-pink-500/25">
      {/* Input deck */}
      <div className="flex gap-2.5 items-center">
        <button
          onClick={handleFileClick}
          disabled={uploadDisabled}
          className="waheeda-btn w-12 h-12 rounded-xl shrink-0 border flex items-center justify-center text-lg transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed shadow-md bg-slate-900/80 hover:bg-slate-800 border-pink-500/30 text-gray-200 hover:border-pink-400/60"
          title="Upload image, audio, or video"
        >
          📎
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,audio/*,video/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Quick Voice Button */}
        <button
          onClick={isRecording ? onStopRecording : onStartRecording}
          disabled={micDisabled}
          className={
            "waheeda-btn w-12 h-12 rounded-xl shrink-0 border flex items-center justify-center text-lg transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed shadow-md " +
            (isRecording
              ? "bg-gradient-to-r from-pink-600 to-rose-600 text-white border-pink-300 animate-pulse shadow-pink-600/50 waheeda-glow-active"
              : "bg-slate-900/80 hover:bg-slate-800 border-pink-500/30 text-gray-200 hover:border-pink-400/60")
          }
          title={isRecording ? "Stop recording" : "Click to record voice"}
        >
          {isRecording ? "⏹️" : "🎙️"}
        </button>

        {/* Text input */}
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type in English or Tamil (e.g. hello, vanakkam...)"
            className="w-full bg-slate-950/80 border border-pink-500/30 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-400 outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400/50 transition-all shadow-inner"
            autoFocus
          />
          <span className="absolute right-3 top-3.5 text-xs text-pink-400/50 pointer-events-none">✨</span>
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!text.trim() || isStreaming || status === "thinking"}
          className="waheeda-btn px-5 py-3 rounded-xl font-extrabold text-xs uppercase tracking-wider text-white transition-all duration-150 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-pink-950/40 border border-pink-400/30 shrink-0 flex items-center gap-1.5"
        >
          <span>Send</span>
          <span className="text-sm">✨</span>
        </button>
      </div>

      {/* Footer controls: Hint & Clear Chat */}
      <div className="flex items-center justify-between text-[11px] text-gray-400 px-1 pt-1 border-t border-pink-500/15">
        <span className="flex items-center gap-1">
          <span className="text-pink-300 font-bold">Waheeda Tip:</span> Type text, tap Mic, or click Waheeda's avatar for voice call
        </span>
        <button
          onClick={onReset}
          className="waheeda-btn hover:text-pink-300 border border-white/10 hover:border-pink-500/40 px-2.5 py-0.5 rounded-lg transition-colors text-gray-400"
        >
          Clear Chat
        </button>
      </div>
    </div>
  );
}
