"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Girl } from "@/types";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { MicButton } from "@/components/ui/MicButton";
import { vibeColor, vibeEmoji, vibeLabel } from "@/lib/utils";
import type { Vibe } from "@/types";

interface GirlFormProps {
  initial?: Partial<Girl>;
  girlId?: string;
  mode: "create" | "edit";
  readOnly?: boolean;
}

// Date input that displays as DD/MM/YYYY but stores YYYY-MM-DD internally
function DateInput({ value, onChange, className, disabled, required }: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}) {
  function toDisplay(v: string) {
    if (!v || v.length < 10) return v;
    const [y, m, d] = v.split("-");
    return `${d}/${m}/${y}`;
  }

  function toISO(raw: string) {
    const parts = raw.replace(/\D/g, "");
    if (parts.length < 8) return "";
    return `${parts.slice(4, 8)}-${parts.slice(2, 4)}-${parts.slice(0, 2)}`;
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    let raw = e.target.value.replace(/[^\d/]/g, "");
    // Auto-insert slashes
    const digits = raw.replace(/\//g, "");
    if (digits.length >= 2 && raw.length === 2) raw = raw + "/";
    if (digits.length >= 4 && raw.length === 5) raw = raw + "/";
    if (raw.length > 10) raw = raw.slice(0, 10);

    // Update parent with ISO value when we have a full date
    const iso = toISO(raw);
    if (iso && iso.length === 10) onChange(iso);
    else if (!raw) onChange("");

    // Update display directly via the input element
    e.target.value = raw;
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    // Normalize display on blur
    const iso = value;
    e.target.value = toDisplay(iso);
  }

  return (
    <input
      type="text"
      defaultValue={toDisplay(value)}
      key={value} // re-render when value changes externally (e.g. voice fill)
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder="DD/MM/YYYY"
      className={className}
      disabled={disabled}
      required={required}
      maxLength={10}
    />
  );
}

export default function GirlForm({ initial, girlId, mode, readOnly = false }: GirlFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [speechLang, setSpeechLang] = useState<"he-IL" | "en-US">("he-IL");
  const [filling, setFilling] = useState(false); // whole-form mic active
  const [fillStatus, setFillStatus] = useState(""); // status message

  const handleSpeechResult = useCallback((field: string, text: string) => {
    setForm((prev) => ({ ...prev, [field]: text }));
  }, []);
  const { listeningField, startListening } = useSpeechToText(handleSpeechResult, speechLang);

  // Whole-form fill via AI
  const handleFillByVoice = useCallback(() => {
    const SR =
      typeof window !== "undefined"
        ? (window.SpeechRecognition ?? window.webkitSpeechRecognition)
        : null;

    if (!SR) {
      alert("Speech recognition is not supported in this browser. Try Chrome or Safari.");
      return;
    }

    const rec = new SR();
    rec.lang = speechLang;
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    setFilling(true);
    setFillStatus("Listening… speak now");

    rec.onresult = async (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0][0].transcript;
      setFillStatus("Thinking…");
      try {
        const res = await fetch("/api/parse-girl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Parse failed");

        setForm((prev) => ({
          ...prev,
          name: data.name ?? prev.name,
          origin: data.origin ?? prev.origin,
          hometown: data.hometown ?? prev.hometown,
          occupation: data.occupation ?? prev.occupation,
          vibe: (["good", "bad", "neutral"].includes(data.vibe) ? data.vibe : prev.vibe) as Vibe,
          matchedApp: data.matchedApp ?? prev.matchedApp,
          matchedDate: data.matchedDate ?? prev.matchedDate,
          startDate: data.startDate ?? prev.startDate,
          endDate: data.endDate ?? prev.endDate,
          firstWhatsapp: data.firstWhatsapp ?? prev.firstWhatsapp,
          notes: data.notes ?? prev.notes,
        }));
        if (data.endDate) setOngoing(false);
        setFillStatus("✓ Form filled!");
      } catch (err) {
        setFillStatus("Error: " + (err instanceof Error ? err.message : "Unknown"));
      } finally {
        setFilling(false);
      }
    };

    rec.onerror = () => {
      setFilling(false);
      setFillStatus("Mic error — try again");
    };

    rec.onend = () => {
      if (filling) setFilling(false);
    };

    rec.start();
  }, [speechLang, filling]);

  const isOngoing = !initial?.endDate;
  const [ongoing, setOngoing] = useState(isOngoing);

  const [form, setForm] = useState({
    name: initial?.name || "",
    origin: initial?.origin || "",
    hometown: initial?.hometown || "",
    occupation: initial?.occupation || "",
    startDate: initial?.startDate ? (initial.startDate as string).slice(0, 10) : "",
    endDate: initial?.endDate ? initial.endDate.slice(0, 10) : "",
    vibe: (initial?.vibe as Vibe) || "neutral",
    notes: initial?.notes || "",
    matchedDate: initial?.matchedDate ? initial.matchedDate.slice(0, 10) : "",
    matchedApp: initial?.matchedApp || "",
    firstWhatsapp: initial?.firstWhatsapp ? initial.firstWhatsapp.slice(0, 10) : "",
  });

  function set(field: string, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // When matchedDate is set, default the other date fields if empty
      if (field === "matchedDate" && value) {
        if (!prev.firstWhatsapp) next.firstWhatsapp = value;
        if (!prev.startDate) next.startDate = value;
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const payload = {
      name: form.name,
      origin: form.origin || null,
      hometown: form.hometown || null,
      occupation: form.occupation || null,
      startDate: form.startDate ? new Date(form.startDate + "T12:00:00Z").toISOString() : null,
      endDate: ongoing ? null : (form.endDate ? new Date(form.endDate + "T12:00:00Z").toISOString() : null),
      vibe: form.vibe,
      notes: form.notes || null,
      status: ongoing ? "ACTIVE" : "PAST",
      matchedDate: form.matchedDate ? new Date(form.matchedDate + "T12:00:00Z").toISOString() : null,
      matchedApp: form.matchedApp || null,
      firstWhatsapp: form.firstWhatsapp ? new Date(form.firstWhatsapp + "T12:00:00Z").toISOString() : null,
    };

    try {
      const res = await fetch(
        mode === "create" ? "/api/girls" : `/api/girls/${girlId}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (!res.ok) {
        const msg = typeof data.error === "string" ? data.error : data.error?.formErrors?.[0] ?? JSON.stringify(data.error);
      throw new Error(msg || "Something went wrong");
      }

      router.push("/girls");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    `w-full bg-slate-50 dark:bg-[#0a0f1e] border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm${readOnly ? " opacity-70 cursor-default" : ""}`;
  const micInputClass = inputClass + " pr-10";
  const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {readOnly && (
        <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          View only — switch to Golan to make changes
        </div>
      )}
      {error && (
        <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      {!readOnly && (
        <div className="space-y-3">
          {/* Language toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">🎤 Voice language:</span>
            <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 text-xs font-medium">
              {(["he-IL", "en-US"] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setSpeechLang(lang)}
                  className={`px-3 py-1.5 transition-colors ${
                    speechLang === lang
                      ? "bg-blue-600 text-white"
                      : "bg-white dark:bg-[#0a0f1e] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {lang === "he-IL" ? "🇮🇱 Hebrew" : "🇬🇧 English"}
                </button>
              ))}
            </div>
          </div>

          {/* Fill entire form by voice */}
          <button
            type="button"
            onClick={handleFillByVoice}
            disabled={filling}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed text-sm font-medium transition-all
              ${filling
                ? "border-red-400 text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 animate-pulse cursor-not-allowed"
                : "border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 0 1 3 3v8a3 3 0 0 1-6 0V4a3 3 0 0 1 3-3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v1a7 7 0 0 1-14 0v-1" />
              <line x1="12" y1="19" x2="12" y2="23" strokeLinecap="round" />
              <line x1="8" y1="23" x2="16" y2="23" strokeLinecap="round" />
            </svg>
            {filling ? fillStatus : fillStatus.startsWith("✓") ? fillStatus : "Fill entire form by voice"}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className={labelClass}>Name *</label>
          <div className="relative">
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={micInputClass}
              placeholder="Her name"
              required={!readOnly}
              disabled={readOnly}
            />
            {!readOnly && <MicButton active={listeningField === "name"} onClick={() => startListening("name")} />}
          </div>
        </div>

        <div>
          <label className={labelClass}>Origin</label>
          <div className="relative">
            <input
              type="text"
              value={form.origin}
              onChange={(e) => set("origin", e.target.value)}
              className={micInputClass}
              placeholder="e.g. Tel Aviv, New York"
              disabled={readOnly}
            />
            {!readOnly && <MicButton active={listeningField === "origin"} onClick={() => startListening("origin")} />}
          </div>
        </div>

        <div>
          <label className={labelClass}>Current City</label>
          <div className="relative">
            <input
              type="text"
              value={form.hometown}
              onChange={(e) => set("hometown", e.target.value)}
              className={micInputClass}
              placeholder="e.g. Tel Aviv, Berlin"
              disabled={readOnly}
            />
            {!readOnly && <MicButton active={listeningField === "hometown"} onClick={() => startListening("hometown")} />}
          </div>
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass}>Occupation</label>
          <div className="relative">
            <input
              type="text"
              value={form.occupation}
              onChange={(e) => set("occupation", e.target.value)}
              className={micInputClass}
              placeholder="e.g. Designer, Engineer"
              disabled={readOnly}
            />
            {!readOnly && <MicButton active={listeningField === "occupation"} onClick={() => startListening("occupation")} />}
          </div>
        </div>

        <div>
          <label className={labelClass}>Matched Date *</label>
          <DateInput
            value={form.matchedDate}
            onChange={(v) => set("matchedDate", v)}
            className={inputClass}
            required={!readOnly}
            disabled={readOnly}
          />
        </div>

        <div>
          <label className={labelClass}>Matched App</label>
          <select
            value={form.matchedApp}
            onChange={(e) => set("matchedApp", e.target.value)}
            className={inputClass}
            disabled={readOnly}
          >
            <option value="">— select app —</option>
            <option value="Hinge">Hinge</option>
            <option value="Tinder">Tinder</option>
            <option value="OKCupid">OKCupid</option>
            <option value="Bumble">Bumble</option>
            <option value="Matchmaking">Matchmaking</option>
            <option value="Met her on my own">Met her on my own</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>First WhatsApp Conversation</label>
          <DateInput
            value={form.firstWhatsapp}
            onChange={(v) => set("firstWhatsapp", v)}
            className={inputClass}
            disabled={readOnly}
          />
        </div>

        <div>
          <label className={labelClass}>First Date <span className="text-slate-400 font-normal text-xs">(optional)</span></label>
          <DateInput
            value={form.startDate}
            onChange={(v) => set("startDate", v)}
            className={inputClass}
            disabled={readOnly}
          />
        </div>

        <div>
          <label className={labelClass}>End Date</label>
          <label className="flex items-center gap-2 mb-2 cursor-pointer w-fit">
            <div
              onClick={() => !readOnly && setOngoing((v) => !v)}
              className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${ongoing ? "bg-green-500" : "bg-slate-700"}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${ongoing ? "translate-x-4" : "translate-x-0"}`} />
            </div>
            <span className="text-sm text-slate-400">Still ongoing 💚</span>
          </label>
          {!ongoing && (
            <DateInput
              value={form.endDate}
              onChange={(v) => set("endDate", v)}
              className={inputClass}
              disabled={readOnly}
            />
          )}
        </div>
      </div>

      <div>
        <label className={labelClass}>Vibe</label>
        <div className="grid grid-cols-3 gap-3">
          {(["good", "neutral", "bad"] as Vibe[]).map((v) => {
            const selected = form.vibe === v;
            return (
              <button
                key={v}
                type="button"
                disabled={readOnly}
                onClick={() => set("vibe", v)}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                  readOnly ? "opacity-70 cursor-default" : "cursor-pointer"
                }`}
                style={{
                  borderColor: selected ? vibeColor(v) : "transparent",
                  backgroundColor: selected ? vibeColor(v) + "22" : (undefined),
                  color: selected ? vibeColor(v) : undefined,
                }}
              >
                <span className="text-2xl">{vibeEmoji(v)}</span>
                <span>{vibeLabel(v)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className={labelClass}>Notes</label>
        <div className="relative">
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            className={micInputClass}
            rows={3}
            placeholder="Any thoughts..."
            disabled={readOnly}
          />
          {!readOnly && <MicButton active={listeningField === "notes"} onClick={() => startListening("notes")} forTextarea />}
        </div>
      </div>

      {!readOnly && (
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold transition-colors text-sm"
          >
            {loading ? "Saving..." : mode === "create" ? "Add Girl" : "Save Changes"}
          </button>
        </div>
      )}
    </form>
  );
}
