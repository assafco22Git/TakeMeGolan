"use client";

import { useRef, useState, useCallback } from "react";

// Web Speech API type declarations (not in TS lib by default)
declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition;
    webkitSpeechRecognition: new () => ISpeechRecognition;
  }
}

interface ISpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onresult: ((e: ISpeechRecognitionEvent) => void) | null;
  onerror: ((e: Event) => void) | null;
  onend: (() => void) | null;
}

interface ISpeechRecognitionEvent {
  results: { [index: number]: { [index: number]: { transcript: string } } };
}

export function useSpeechToText(onResult: (field: string, text: string) => void, lang = "he-IL") {
  const [listeningField, setListeningField] = useState<string | null>(null);
  const recRef = useRef<ISpeechRecognition | null>(null);

  const startListening = useCallback(
    (field: string) => {
      // Stop any existing session first
      if (recRef.current) {
        recRef.current.onend = null;
        recRef.current.stop();
        recRef.current = null;
      }

      // If clicking the already-active field, just stop
      if (listeningField === field) {
        setListeningField(null);
        return;
      }

      const SR =
        typeof window !== "undefined"
          ? (window.SpeechRecognition ?? window.webkitSpeechRecognition)
          : null;

      if (!SR) {
        alert("Speech recognition is not supported in this browser. Try Chrome or Safari.");
        return;
      }

      const rec = new SR();
      rec.lang = lang;
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      rec.onresult = (e: ISpeechRecognitionEvent) => {
        const transcript = e.results[0][0].transcript;
        onResult(field, transcript);
      };

      rec.onerror = () => {
        setListeningField(null);
      };

      rec.onend = () => {
        setListeningField(null);
        recRef.current = null;
      };

      rec.start();
      recRef.current = rec;
      setListeningField(field);
    },
    [listeningField, onResult, lang]
  );

  return { listeningField, startListening };
}
