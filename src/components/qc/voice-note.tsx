import { useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type SpeechResult = { isFinal: boolean; 0: { transcript: string } };

type BrowserRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { resultIndex: number; results: ArrayLike<SpeechResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function createRecognizer() {
  if (typeof window === "undefined") return null;
  const host = window as Window & {
    SpeechRecognition?: new () => BrowserRecognition;
    webkitSpeechRecognition?: new () => BrowserRecognition;
  };
  const Ctor = host.SpeechRecognition ?? host.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export function appendTranscript(current: string, spoken: string) {
  const next = spoken.replace(/\s+/g, " ").trim();
  if (!next) return current;
  const base = current.trim();
  return base ? `${base} ${next}` : next;
}

function clock(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export function VoiceNote({ onTranscript }: { onTranscript: (spoken: string) => void }) {
  const onTranscriptRef = useRef(onTranscript);
  const recognitionRef = useRef<BrowserRecognition | null>(null);
  const liveRef = useRef("");
  const committedRef = useRef(0);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [live, setLive] = useState("");

  onTranscriptRef.current = onTranscript;

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [recording]);

  useEffect(() => () => { recognitionRef.current?.stop(); }, []);

  const publishLive = () => {
    const extra = liveRef.current.trim();
    liveRef.current = "";
    setLive("");
    if (extra) onTranscriptRef.current(extra);
  };

  const start = () => {
    const recognition = createRecognizer();
    if (!recognition) {
      toast.error("Voice input is not available in this browser. Type the check instead.");
      return;
    }
    recognition.lang = "en-IN";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let interim = "";
      let finals = 0;
      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (!result) continue;
        if (result.isFinal) {
          finals += 1;
          if (finals > committedRef.current) onTranscriptRef.current(result[0].transcript);
        } else interim += result[0].transcript;
      }
      committedRef.current = finals;
      liveRef.current = interim;
      setLive(interim.trim());
    };
    recognition.onerror = (event) => {
      if (event.error === "aborted" || event.error === "no-speech") return;
      toast.error(event.error === "not-allowed" || event.error === "service-not-allowed"
        ? "Allow microphone access to dictate a test check."
        : "Voice input stopped before the check was captured.");
      recognitionRef.current = null;
      setRecording(false);
    };
    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return;
      recognitionRef.current = null;
      publishLive();
      setRecording(false);
    };
    committedRef.current = 0;
    try {
      recognition.start();
    } catch {
      toast.error("Voice input is not available in this browser. Type the check instead.");
      return;
    }
    recognitionRef.current = recognition;
    setSeconds(0);
    setLive("");
    setRecording(true);
  };

  const stop = () => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    recognition?.stop();
    publishLive();
    setRecording(false);
  };

  return (
    <div className="mt-2">
      {recording ? (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-destructive/40 bg-danger-soft px-3 py-2">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-destructive" />
          <span className="flex h-4 items-end gap-0.5" aria-hidden>
            {[10, 16, 8, 14].map((height, index) => (
              <span key={height} className="w-0.5 animate-pulse rounded-full bg-destructive" style={{ height, animationDelay: `${index * 120}ms` }} />
            ))}
          </span>
          <span className="font-mono text-sm">Recording... {clock(seconds)}</span>
          {live && <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{live}</span>}
          <Button type="button" size="sm" variant="destructive" onClick={stop}>Stop & Convert</Button>
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={start}><Mic className="h-4 w-4" /> Record Voice Note</Button>
      )}
      <p className="mt-1 text-xs text-muted-foreground">Speak your test check steps naturally; voice input will convert automatically into plain English bot instructions.</p>
    </div>
  );
}
