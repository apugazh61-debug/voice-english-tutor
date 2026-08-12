export function VoiceOrb({ callModeActive, status, isRecording, onToggleCall }) {
  const isListening = status === "listening" || (callModeActive && isRecording);
  const isSpeaking = status === "speaking";
  const isThinking = status === "thinking";

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-1">
      <div className="relative flex items-center justify-center">
        
        {/* Soft Pink/Purple Background Halo Grid */}
        <div className="absolute -inset-10 pointer-events-none flex items-center justify-center opacity-35">
          <svg className="w-48 h-48 sm:w-56 sm:h-56 text-pink-400/30" viewBox="0 0 200 200" fill="none">
            <circle cx="100" cy="100" r="40" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx="100" cy="100" r="65" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
            <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="0.8" />
          </svg>
        </div>

        {/* Dynamic Soft Pink/Purple Radiating Glow Rings during active voice mode */}
        {(isListening || isSpeaking || isThinking) && (
          <>
            <div className="absolute -inset-3 rounded-full border-2 border-pink-400/80 avatar-ring-anim pointer-events-none" />
            <div className="absolute -inset-3 rounded-full border border-purple-400/60 avatar-ring-anim [animation-delay:0.6s] pointer-events-none" />
            <div className="absolute -inset-3 rounded-full border border-fuchsia-400/50 avatar-ring-anim [animation-delay:1.2s] pointer-events-none" />
          </>
        )}

        {/* Central Waheeda Cartoon Avatar Button */}
        <button
          onClick={onToggleCall}
          className={"waheeda-btn relative z-10 w-28 h-28 sm:w-32 sm:h-32 rounded-full flex flex-col items-center justify-center cursor-pointer transition-all duration-300 active:scale-95 shadow-2xl border-4 overflow-hidden " +
            (callModeActive
              ? isSpeaking
                ? "border-pink-300 waheeda-glow-active scale-105"
                : isListening
                ? "border-pink-400 waheeda-glow-active scale-110"
                : "border-purple-400/80 avatar-orb-idle"
              : "border-pink-400/60 hover:border-pink-300 hover:scale-105 waheeda-glow"
            )
          }
          title={callModeActive ? "Click to end voice mode" : "Click to start voice mode with Waheeda"}
        >
          {/* Avatar Face Image */}
          <img
            src="/waheeda-avatar.png"
            alt="Waheeda Avatar"
            className={"w-full h-full object-cover transition-transform duration-300 " +
              (isSpeaking ? "scale-105 brightness-110" : isListening ? "scale-110" : "scale-100")
            }
          />

          {/* Voice Indicator Overlay (Waveform Equalizer when speaking / call badge) */}
          <div className="absolute inset-0 bg-gradient-to-t from-purple-950/80 via-transparent to-transparent flex flex-col items-center justify-end pb-2">
            {isSpeaking ? (
              /* Lip movement / Waveform Equalizer overlay */
              <div className="flex items-center gap-1 h-6 px-3 py-1 rounded-full bg-pink-950/80 border border-pink-400/60 shadow-lg">
                <span className="w-1 bg-pink-300 rounded-full wave-bar-1" />
                <span className="w-1 bg-purple-200 rounded-full wave-bar-2" />
                <span className="w-1 bg-white rounded-full wave-bar-3" />
                <span className="w-1 bg-pink-300 rounded-full wave-bar-4" />
                <span className="w-1 bg-fuchsia-300 rounded-full wave-bar-2" />
              </div>
            ) : isListening ? (
              <div className="px-2.5 py-0.5 rounded-full bg-pink-600/90 text-[10px] font-extrabold uppercase text-white shadow-md animate-pulse">
                Listening...
              </div>
            ) : (
              <div className="w-7 h-7 rounded-full bg-pink-950/80 border border-pink-400/40 flex items-center justify-center text-xs text-white shadow-md">
                📞
              </div>
            )}
          </div>
        </button>
      </div>

      {/* Mode Status Hint */}
      <div className="text-xs text-gray-300 font-medium text-center tracking-wide">
        {callModeActive ? (
          <span className="text-pink-300 animate-pulse font-semibold flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-pink-400 shadow-[0_0_8px_#f472b6]" />
            Hands-Free Voice Tutor Active — Talk to Waheeda
          </span>
        ) : (
          <span className="text-gray-300 hover:text-white transition-colors">
            Tap Waheeda's Avatar for Hands-Free Voice Call
          </span>
        )}
      </div>
    </div>
  );
}
