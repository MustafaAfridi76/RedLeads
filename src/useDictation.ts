import { useEffect, useRef, useState } from "react";

type SpeechResult = { isFinal: boolean; 0: { transcript: string } };
type SpeechEvent = { resultIndex: number; results: ArrayLike<SpeechResult> };
type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

export function useDictation(onFinal: (text: string) => void) {
  const callback = useRef(onFinal);
  callback.current = onFinal;
  const recognition = useRef<Recognition | null>(null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");
  const supported =
    typeof window !== "undefined" &&
    !!(
      (window as SpeechWindow).SpeechRecognition ||
      (window as SpeechWindow).webkitSpeechRecognition
    );
  useEffect(
    () => () => {
      recognition.current?.stop();
    },
    [],
  );
  function stop() {
    recognition.current?.stop();
    setListening(false);
    setInterim("");
  }
  function start() {
    if (!supported) {
      setError(
        "Dictation is not supported in this browser. You can type your notes below.",
      );
      return;
    }
    if (listening) {
      stop();
      return;
    }
    const Ctor =
      (window as SpeechWindow).SpeechRecognition ||
      (window as SpeechWindow).webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    recognition.current = rec;
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-CA";
    setError("");
    rec.onresult = (event) => {
      let final = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) final += result[0].transcript.trim() + " ";
        else interimText += result[0].transcript;
      }
      if (final) callback.current(final.trim());
      setInterim(interimText);
    };
    rec.onerror = (event) => {
      setError(
        event.error === "not-allowed"
          ? "Microphone access was blocked. You can type your notes instead."
          : "Dictation stopped. Please try again.",
      );
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
    };
    try {
      rec.start();
      setListening(true);
    } catch {
      setError("Could not start the microphone. Please try again.");
    }
  }
  return { supported, listening, interim, error, start, stop };
}
