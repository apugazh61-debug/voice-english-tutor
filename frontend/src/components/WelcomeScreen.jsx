export function WelcomeScreen({ onSelectPrompt, onStartCall, onStartRecording }) {
  const samplePrompts = [
    {
      icon: "🗣️",
      title: "Daily Conversation",
      desc: "Let's practice casual English about my day.",
      prompt: "Hello Waheeda! Let's practice a casual English conversation about daily life.",
      gradient: "from-pink-950/70 via-purple-950/50 to-slate-950/80 border-pink-500/35 hover:border-pink-400/80 hover:shadow-pink-900/30",
      badge: "Casual"
    },
    {
      icon: "📝",
      title: "Grammar & Corrections",
      desc: "Check my English sentences for errors and explain why.",
      prompt: "Can you help me correct my English grammar mistakes when I speak?",
      gradient: "from-purple-950/70 via-indigo-950/50 to-slate-950/80 border-purple-500/35 hover:border-purple-400/80 hover:shadow-purple-900/30",
      badge: "Grammar"
    },
    {
      icon: "💼",
      title: "Interview Practice",
      desc: "Mock job interview in simple, confident English.",
      prompt: "Let's do a mock job interview. Ask me the first question in simple English.",
      gradient: "from-indigo-950/70 via-pink-950/50 to-slate-950/80 border-indigo-500/35 hover:border-indigo-400/80 hover:shadow-indigo-900/30",
      badge: "Career"
    },
    {
      icon: "📚",
      title: "Vocabulary Booster",
      desc: "Learn 3 smart, useful new words with easy examples.",
      prompt: "Teach me 3 smart English words with easy examples and their meanings.",
      gradient: "from-fuchsia-950/70 via-pink-950/50 to-slate-950/80 border-fuchsia-500/35 hover:border-fuchsia-400/80 hover:shadow-fuchsia-900/30",
      badge: "Vocab"
    },
  ];

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center p-4 sm:p-8 overflow-y-auto text-center">
      {/* Background Neon Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-600/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-purple-600/15 rounded-full blur-[90px] pointer-events-none" />

      {/* Avatar & Title Header */}
      <div className="relative z-10 flex flex-col items-center gap-3.5 mb-7">
        <div className="relative group cursor-pointer" onClick={onStartCall} title="Click to start live voice call">
          <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 opacity-75 blur-md group-hover:opacity-100 transition duration-500 group-hover:scale-105" />
          <div className="relative w-22 h-22 sm:w-26 sm:h-26 rounded-full overflow-hidden border-4 border-pink-400/90 shadow-2xl waheeda-glow transition-transform duration-300 group-hover:scale-105">
            <img src="/waheeda-avatar.png" alt="Waheeda" className="w-full h-full object-cover" />
          </div>
          <span className="absolute bottom-1 right-1 bg-emerald-500 border-2 border-gray-950 w-5 h-5 rounded-full shadow-lg flex items-center justify-center" title="Waheeda AI Ready">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          </span>
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-950/60 border border-pink-500/30 text-[11px] font-bold uppercase tracking-wider text-pink-300 mb-2 shadow-sm">
            <span>✨ AI Spoken English Tutor</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold gradient-title tracking-tight flex items-center justify-center gap-2">
            <span>Vanakkam! I'm Waheeda</span>
            <span className="text-3xl animate-bounce [animation-duration:3s]">🌸</span>
          </h2>
          <p className="text-xs sm:text-sm text-pink-200/90 font-medium max-w-lg mt-2 leading-relaxed">
            Speak in Tamil, Thanglish, or English. I'm here to build your confidence and help you speak fluent English every day!
          </p>
        </div>
      </div>

      {/* Interactive Suggestion Cards Grid */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl mb-7">
        {samplePrompts.map((item, index) => (
          <button
            key={index}
            onClick={() => onSelectPrompt(item.prompt)}
            className={
              "waheeda-btn text-left p-4 sm:p-4.5 rounded-2xl border bg-gradient-to-br transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-xl flex items-start gap-3.5 group backdrop-blur-xl relative overflow-hidden " +
              item.gradient
            }
          >
            <div className="text-2xl p-2.5 rounded-xl bg-white/10 group-hover:bg-pink-500/20 transition-colors shrink-0 border border-white/10 shadow-inner">
              {item.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <h3 className="text-sm font-bold text-white group-hover:text-pink-300 transition-colors">
                  {item.title}
                </h3>
                <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/10 text-pink-200 border border-white/10">
                  {item.badge}
                </span>
              </div>
              <p className="text-xs text-gray-300/80 mt-1.5 leading-snug line-clamp-2 font-medium">{item.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Quick Action Bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={onStartCall}
          className="waheeda-btn px-6 py-3 rounded-full font-bold text-xs uppercase tracking-wider text-white bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 shadow-2xl shadow-pink-950/70 border border-pink-400/50 flex items-center gap-2.5 active:scale-95 transition-all"
        >
          <span className="text-sm">🎧</span>
          <span>Start Live Voice Call</span>
          <span className="text-xs">✨</span>
        </button>
        <button
          onClick={onStartRecording}
          className="waheeda-btn px-6 py-3 rounded-full font-bold text-xs uppercase tracking-wider text-pink-200 bg-slate-900/90 hover:bg-slate-800 border border-pink-500/35 hover:border-pink-400/70 flex items-center gap-2.5 active:scale-95 shadow-lg transition-all"
        >
          <span className="text-sm">🎙️</span>
          <span>Quick Voice Message</span>
        </button>
      </div>
    </div>
  );
}
