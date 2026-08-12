export function Sidebar({ sessions, activeSessionId, onSelectSession, onNewSession, onDeleteSession, onDeleteAllHistory, isOpen, onClose }) {
  return (
    <aside className={"w-full h-full bg-[#0e0919]/95 backdrop-blur-2xl flex flex-col transition-transform duration-300 ease-in-out shadow-2xl " + (isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0")}>
      {/* Sidebar Header */}
      <div className="p-4 flex items-center justify-between border-b border-pink-500/20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-pink-400/50 shrink-0 shadow-md waheeda-glow">
            <img src="/waheeda-avatar.png" alt="Waheeda" className="w-full h-full object-cover" />
          </div>
          <span className="font-extrabold text-sm tracking-wide gradient-title">Waheeda AI</span>
        </div>
        <button onClick={onClose} className="md:hidden text-gray-400 hover:text-white p-1">
          ✕
        </button>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <button
          onClick={onNewSession}
          className="waheeda-btn w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 transition-all duration-200 shadow-lg shadow-pink-950/40 border border-pink-400/30 active:scale-[0.98]"
        >
          <span className="text-base">+</span>
          <span>New Chat</span>
          <span className="text-xs">✨</span>
        </button>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto px-2.5 py-2 flex flex-col gap-1.5">
        <div className="text-[10px] font-extrabold uppercase tracking-wider text-pink-300/70 px-3 py-1 flex items-center justify-between">
          <span>Chat History</span>
          <span className="text-gray-400 font-mono text-[9px]">{sessions.length}</span>
        </div>
        {sessions.length === 0 ? (
          <div className="text-xs text-gray-400 px-3 py-3 italic border border-dashed border-white/10 rounded-xl text-center">
            No active conversations
          </div>
        ) : (
          sessions.map((sess) => {
            const isActive = sess.id === activeSessionId;
            return (
              <div
                key={sess.id}
                onClick={() => onSelectSession(sess.id)}
                className={
                  "waheeda-btn group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs font-medium transition-all duration-150 relative overflow-hidden " +
                  (isActive
                    ? "bg-gradient-to-r from-pink-950/80 to-purple-950/70 border border-pink-500/50 text-pink-200 font-bold shadow-md shadow-pink-950/50 border-l-4 border-l-pink-400"
                    : "text-gray-300 hover:bg-white/5 hover:text-white border border-transparent hover:border-white/10")
                }
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm">{isActive ? "🌸" : "💬"}</span>
                  <span className="truncate max-w-[170px]">{sess.title}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(sess.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 hover:text-pink-400 p-1 transition-opacity text-xs"
                  title="Delete chat"
                >
                  🗑️
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-pink-500/20 flex flex-col gap-2 text-[11px] text-gray-400 font-medium">
        <div className="flex items-center justify-center gap-1.5 text-center">
          <span>Waheeda - English Tutor</span>
          <span className="text-pink-400">✨</span>
        </div>
        <button
          onClick={onDeleteAllHistory}
          className="waheeda-btn w-full rounded-xl px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-pink-200 bg-pink-950/40 border border-pink-500/25 hover:border-pink-400/60 hover:text-white transition-colors"
          title="Delete all chats and start fresh"
        >
          Delete All History
        </button>
      </div>
    </aside>
  );
}
