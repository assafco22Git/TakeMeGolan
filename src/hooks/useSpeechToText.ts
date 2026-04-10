"use client";

import { useRef, useState, useCallback } from "react";

export function useSpeechToText(onResult: (field: string, text: string) => void, lang = "he-IL") {
  const [listeningField, setListeningField] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognition | null>(null);

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

      rec.onresult = (e: SpeechRecognitionEvent) => {
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
