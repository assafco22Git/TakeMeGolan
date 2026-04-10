"use client";

interface MicButtonProps {
  active: boolean;
  onClick: () => void;
  forTextarea?: boolean;
}

export function MicButton({ active, onClick, forTextarea = false }: MicButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={active ? "Stop recording" : "Speak to fill"}
      className={`absolute right-2.5 ${forTextarea ? "top-2.5 translate-y-0" : "top-1/2 -translate-y-1/2"} p-1.5 rounded-full transition-colors z-10
        ${active
          ? "text-red-500 animate-pulse bg-red-50 dark:bg-red-900/30"
          : "text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800"
        }`}
    >
      {active ? (
        // Stop / recording icon
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      ) : (
        // Mic icon
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 0 1 3 3v8a3 3 0 0 1-6 0V4a3 3 0 0 1 3-3z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v1a7 7 0 0 1-14 0v-1" />
          <line x1="12" y1="19" x2="12" y2="23" strokeLinecap="round" />
          <line x1="8" y1="23" x2="16" y2="23" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}
