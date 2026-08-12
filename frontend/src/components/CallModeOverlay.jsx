import { VoiceOrb } from "./VoiceOrb.jsx";

function getStatusLabel(status) {
  if (status === "listening") return "Listening...";
  if (status === "speaking") return "Speaking...";
  if (status === "thinking") return "Thinking...";
  if (status === "mic_error") return "Microphone blocked";
  return "Voice mode active";
}

export function CallModeOverlay({ callModeActive, status, isRecording, onToggleCall, onEndCall }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl">
      <div className="absolute inset-0 bg-gradient-to-b from-pink-950/20 via-transparent to-purple-950/20 pointer-events-none" />

      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-pink-200 shadow-lg shadow-black/30">
          Live Voice Call
        </div>

        <VoiceOrb
          callModeActive={callModeActive}
          status={status}
          isRecording={isRecording}
          onToggleCall={onToggleCall}
        />

        <div className="space-y-2">
          <p className="text-lg font-bold text-white">{getStatusLabel(status)}</p>
          <p className="text-sm text-gray-300 max-w-md">
            Talk naturally. Your voice and Waheeda's reply stay in the same chat thread.
          </p>
        </div>

        <button
          onClick={onEndCall}
          className="waheeda-btn rounded-full bg-white/10 px-6 py-3 text-sm font-bold text-white border border-white/15 hover:bg-white/15 hover:border-pink-400/40 transition-colors"
        >
          End Call
        </button>
      </div>
    </div>
  );
}
