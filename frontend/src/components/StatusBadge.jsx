const STATUS_CONFIG = {
  idle:      { text: "Waheeda Ready",            icon: "✨", color: "text-pink-200",    border: "border-pink-500/30 bg-purple-950/50",          pulse: false },
  listening: { text: "Listening to Voice...",         icon: "🎧", color: "text-pink-400",    border: "border-pink-500/60 bg-pink-950/50 waheeda-glow", pulse: true  },
  recording: { text: "Call Active",     icon: "📞", color: "text-purple-300",  border: "border-purple-500/60 bg-purple-950/50 waheeda-glow", pulse: true  },
  thinking:  { text: "Waheeda is Thinking...",      icon: "💭", color: "text-fuchsia-300", border: "border-fuchsia-500/60 bg-fuchsia-950/50",   pulse: true  },
  speaking:  { text: "Waheeda Speaking...",         icon: "🔊", color: "text-emerald-300", border: "border-emerald-500/50 bg-emerald-950/40",    pulse: true  },
  error:     { text: "Connection Error",          icon: "⚠️", color: "text-rose-400",    border: "border-rose-500/60 bg-rose-950/50",            pulse: false },
  mic_error: { text: "Call Access Blocked",    icon: "🚫", color: "text-amber-400",   border: "border-amber-500/60 bg-amber-950/40",        pulse: false },
};

export function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.idle;
  return (
    <div className={"text-xs font-bold px-3.5 py-1.5 rounded-full border flex items-center gap-1.5 shadow-md transition-all duration-300 " + cfg.color + " " + cfg.border + (cfg.pulse ? " animate-pulse" : "")}>
      <span>{cfg.icon}</span>
      <span>{cfg.text}</span>
    </div>
  );
}