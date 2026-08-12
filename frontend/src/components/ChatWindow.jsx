import { useState, useEffect, useRef, memo } from "react";

const VoiceNoteBubble = memo(function VoiceNoteBubble({ audioUrl, transcript, isUser }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
    setPlaying(!playing);
  };

  return (
    <div className={"flex flex-col gap-1 " + (isUser ? "items-end msg-swing-user" : "items-start msg-swing-ai")}>
      <span className="text-[10px] font-bold uppercase tracking-wider text-pink-300/90 px-1 flex items-center gap-1">
        <span>{isUser ? "You" : "WAHEEDA"}</span>
        <span className="text-[9px]">✨</span>
      </span>
      <div
        className={
          "flex items-center gap-3 p-3.5 rounded-2xl max-w-xs sm:max-w-md shadow-lg border relative overflow-hidden " +
          (isUser
            ? "bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-700 text-white border-pink-400/40 ml-auto shadow-pink-900/30 rounded-br-xs"
            : "bg-gradient-to-r from-purple-950/90 via-slate-900/90 to-pink-950/80 text-white border-pink-500/30 shadow-black/50 rounded-bl-xs")
        }
      >
        <button
          onClick={togglePlay}
          className="waheeda-btn bg-white/20 hover:bg-white/30 rounded-full p-2.5 text-sm flex items-center justify-center shrink-0 transition-all border border-white/20"
        >
          {playing ? "⏸️" : "▶️"}
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-pink-300 font-bold flex items-center gap-1">
            <span>{isUser ? "Call Audio" : "Waheeda Voice Reply"}</span>
          </div>
          <div className="text-sm leading-snug font-medium mt-0.5">{transcript}</div>
        </div>
        <audio ref={audioRef} src={audioUrl} onEnded={() => setPlaying(false)} />
      </div>
    </div>
  );
});

/* Custom Soft Animated Loading Indicator (Waheeda Thinking) */
const WaheedaThinkingLoader = memo(function WaheedaThinkingLoader() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-pink-950/30 border border-pink-500/30 text-pink-200 max-w-xs msg-swing-ai">
      <div className="w-7 h-7 rounded-full overflow-hidden border border-pink-400/60 shrink-0">
        <img src="/waheeda-avatar.png" alt="Waheeda" className="w-full h-full object-cover" />
      </div>
      <div className="text-xs font-semibold tracking-wide text-pink-200 flex items-center gap-2">
        <span>Waheeda is thinking...</span>
        <div className="flex gap-1 items-center">
          <span className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce [animation-delay:0s]" />
          <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:0.2s]" />
          <span className="w-1.5 h-1.5 bg-fuchsia-400 rounded-full animate-bounce [animation-delay:0.4s]" />
        </div>
      </div>
    </div>
  );
});

const MessageItem = memo(function MessageItem({ msg, isStreaming, onRegenerate }) {
  const [copied, setCopied] = useState(false);
  const isUser = msg.role === "user";

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (msg.audioUrl) {
    return <VoiceNoteBubble audioUrl={msg.audioUrl} transcript={msg.content} isUser={isUser} />;
  }

  return (
    <div className={"group flex gap-3 " + (isUser ? "justify-end msg-swing-user" : "justify-start msg-swing-ai")}>
      {/* AI Avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-pink-400/60 shrink-0 mt-0.5 shadow-md waheeda-glow">
          <img src="/waheeda-avatar.png" alt="Waheeda" className="w-full h-full object-cover" />
        </div>
      )}

      <div className={"flex flex-col gap-1.5 max-w-[88%] sm:max-w-[82%] " + (isUser ? "items-end" : "items-start")}>
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-pink-300/80 px-1 flex items-center gap-1">
          <span>{isUser ? "You" : "WAHEEDA"}</span>
        </span>

        {/* Message Bubble */}
        <div
          className={
            "relative text-sm leading-relaxed px-4 py-3 rounded-2xl transition-all duration-200 whitespace-pre-wrap " +
            (isUser
              ? "bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-700 text-white rounded-br-xs shadow-lg shadow-pink-950/40 border-l-2 border-pink-300"
              : "bg-slate-900/90 border border-purple-500/20 border-l-2 border-l-pink-400 text-gray-100 rounded-bl-xs shadow-md shadow-black/40")
          }
        >
          {msg.content}
          {isStreaming && <span className="streaming-cursor" />}
        </div>

        {/* Action Buttons */}
        {!isStreaming && msg.content && (
          <div
            className={
              "flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity text-[11px] text-gray-400 px-1 " +
              (isUser ? "justify-end" : "justify-start")
            }
          >
            <button onClick={handleCopy} className="hover:text-pink-300 transition-colors flex items-center gap-1">
              <span>{copied ? "✓ Copied" : "📋 Copy"}</span>
            </button>
            {!isUser && onRegenerate && (
              <button onClick={onRegenerate} className="hover:text-pink-300 transition-colors flex items-center gap-1">
                <span>🔄 Retry</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-900 to-indigo-950 border border-pink-400/40 flex items-center justify-center text-xs text-pink-200 shrink-0 mt-0.5 shadow-sm">
          👤
        </div>
      )}
    </div>
  );
});

export const ChatWindow = memo(function ChatWindow({ messages, isStreaming, streamingText, onRegenerate }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  return (
    <div className="waheeda-glass flex-1 overflow-y-auto flex flex-col gap-5 p-4 sm:p-6 h-full relative">
      {messages.map((msg, i) => (
        <MessageItem
          key={msg.id || i}
          msg={msg}
          isStreaming={false}
          onRegenerate={i === messages.length - 1 && msg.role === "assistant" ? onRegenerate : null}
        />
      ))}

      {/* Render loader or active streaming message */}
      {isStreaming && (
        streamingText ? (
          <MessageItem
            msg={{ role: "assistant", content: streamingText }}
            isStreaming={true}
          />
        ) : (
          <WaheedaThinkingLoader />
        )
      )}
      <div ref={bottomRef} />
    </div>
  );
});
