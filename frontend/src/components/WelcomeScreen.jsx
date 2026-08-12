export function WelcomeScreen({ onSelectPrompt, onStartCall, onStartRecording }) {
  const samplePrompts = [
    {
      icon: "🗣️",
      title: "Daily Conversation",
      desc: "Let's practice casual English about my day.",
      prompt: "Hello Waheeda! Let's practice a casual English conversation about daily life.",
      color: "from-pink-900/40 to-purple-900/40 border-pink-500/30 hover:border-pink-400",
    },
    {
      icon: "📝",
      title: "Grammar & Corrections",
      desc: "Check my English sentences for errors.",
      prompt: "Can you help me correct my English grammar mistakes when I speak?",
      color: "from-purple-900/40 to-indigo-900/40 border-purple-500/30 hover:border-purple-400",
    },
    {
      icon: "💼",
      title: "Interview Practice",
      desc: "Mock job interview in simple English.",
      prompt: "Let's do a mock job interview. Ask me the first question in simple English.",
      color: "from-indigo-900/40 to-pink-900/40 border-indigo-500/30 hover:border-indigo-400",
    },
    {
      icon: "📚",
      title: "Vocabulary Booster",
      desc: "Learn 3 useful new words today.",
      prompt: "Teach me 3 smart English words with easy examples and their meanings.",
      color: "from-fuchsia-900/40 to-pink-900/40 border-fuchsia-500/30 hover:border-fuchsia-400",
    },
  ];

  return (
    <div className="flex h-full w-full flex-col items-center justify-center p-4 sm:p-8 overflow-y-auto text-center">
      {/* Avatar & Title */}
      <div className="flex flex-col items-center gap-3 mb-6 animate-fade-in">
        <div className="relative group cursor-pointer" onClick={onStartCall}>
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-4 border-pink-400/80 shadow-2xl shadow-pink-900/50 waheeda-glow transition-transform duration-300 group-hover:scale-105">
            <img src="/waheeda-avatar.png" alt="Waheeda" className="w-full h-full object-cover" />
          </div>
          <span className="absolute bottom-0 right-0 bg-emerald-500 border-2 border-gray-950 w-5 h-5 rounded-full shadow-md" title="Waheeda is online" />
        </div>

        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold gradient-title tracking-tight flex items-center justify-center gap-2">
            <span>Vanakkam! I'm Waheeda</span>
            <span className="text-2xl">🌸</span>
          </h2>
          <p className="text-xs sm:text-sm text-pink-200/80 font-medium max-w-md mt-1">
            Your friendly AI English Tutor. Type in Tamil, Thanglish, or English — I will help you speak English fluently!
          </p>
        </div>
      </div>

      {/* Suggestion Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full max-w-2xl mb-6">
        {samplePrompts.map((item, index) => (
          <button
            key={index}
            onClick={() => onSelectPrompt(item.prompt)}
            className={
              "waheeda-btn text-left p-4 rounded-2xl border bg-gradient-to-br transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg flex items-start gap-3.5 group " +
              item.color
            }
          >
            <span className="text-2xl p-2 rounded-xl bg-white/10 group-hover:bg-white/20 transition-colors shrink-0">
              {item.icon}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-white group-hover:text-pink-300 transition-colors flex items-center justify-between">
                <span>{item.title}</span>
                <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">✨</span>
              </h3>
              <p className="text-xs text-gray-300/80 mt-1 line-clamp-2">{item.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Quick Action Bar */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={onStartCall}
          className="waheeda-btn px-5 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider text-white bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 shadow-xl shadow-pink-950/50 border border-pink-400/40 flex items-center gap-2 active:scale-95"
        >
          <span>🎧 Start Voice Call</span>
        </button>
        <button
          onClick={onStartRecording}
          className="waheeda-btn px-5 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider text-pink-200 bg-slate-900/90 hover:bg-slate-800 border border-pink-500/30 hover:border-pink-400 flex items-center gap-2 active:scale-95"
        >
          <span>🎙️ Voice Message</span>
        </button>
      </div>
    </div>
  );
}
