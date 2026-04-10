"use client";

import { useState, useEffect, useRef } from "react";

interface Comment {
  id: string;
  role: string;
  authorName: string | null;
  text: string;
  createdAt: string;
}

interface Props {
  girlId: string;
  currentRole: string;
}

const NAME_KEY = "comment_author_name";

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function CommentsSection({ girlId, currentRole }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load saved name from localStorage
  useEffect(() => {
    setAuthorName(localStorage.getItem(NAME_KEY) ?? "");
  }, []);

  useEffect(() => {
    fetch(`/api/girls/${girlId}/comments`)
      .then((r) => r.json())
      .then(setComments)
      .catch(() => {});
  }, [girlId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  function saveName(name: string) {
    setAuthorName(name);
    localStorage.setItem(NAME_KEY, name);
  }

  async function send() {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/girls/${girlId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, authorName }),
      });
      const comment = await res.json();
      setComments((prev) => [...prev, comment]);
      setText("");
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function displayName(c: Comment) {
    return c.authorName || (c.role === "OWNER" ? "Golan" : "Friend");
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Messages */}
      <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
        {comments.length === 0 && (
          <p className="text-slate-400 text-sm text-center py-6">No comments yet — start the conversation</p>
        )}
        {comments.map((c) => {
          const mine = c.role === currentRole;
          return (
            <div key={c.id} className={`flex flex-col gap-0.5 ${mine ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                  ${mine
                    ? "bg-blue-600 text-white rounded-br-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-sm"
                  }`}
              >
                {c.text}
              </div>
              <span className="text-xs text-slate-400 px-1">
                {displayName(c)} · {formatTime(c.createdAt)}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Name + message input */}
      <div className="flex flex-col gap-2">
        <input
          type="text"
          value={authorName}
          onChange={(e) => saveName(e.target.value)}
          placeholder="Your name (optional)"
          className="w-48 bg-slate-50 dark:bg-[#0a0f1e] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
        <div className="flex gap-2 items-end">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Write a comment… (Enter to send)"
            className="flex-1 resize-none bg-slate-50 dark:bg-[#0a0f1e] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
          <button
            onClick={send}
            disabled={!text.trim() || sending}
            className="flex-shrink-0 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
