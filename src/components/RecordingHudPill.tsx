import React, { useEffect, useState } from "react";
import { Camera, GripVertical, Square } from "lucide-react";
import { nativeBridge } from "../lib/bridge";
import { detectInitialLocale, messages } from "../lib/i18n";

export const RecordingHudPill: React.FC = () => {
  const locale = detectInitialLocale();
  const t = messages[locale];
  const [stepCount, setStepCount] = useState(0);
  const [lastApp, setLastApp] = useState<string>("");
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const timer = window.setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - start) / 1000));
    }, 1000);

    let unlisten: (() => void) | null = null;
    void nativeBridge.onStepCaptured((evt) => {
      setStepCount((n) => n + 1);
      setLastApp(evt.appName);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      window.clearInterval(timer);
      if (unlisten) unlisten();
    };
  }, []);

  const mm = String(Math.floor(elapsedSec / 60)).padStart(2, "0");
  const ss = String(elapsedSec % 60).padStart(2, "0");

  return (
    <div
      data-tauri-drag-region
      className="h-screen w-screen bg-[#18181b] text-white px-3 flex items-center justify-between gap-2.5 select-none overflow-hidden"
    >
      <div
        data-tauri-drag-region
        className="flex items-center gap-2 min-w-0 cursor-move"
      >
        <GripVertical className="w-3.5 h-3.5 text-[#a1a1aa] shrink-0" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] animate-record-dot shrink-0" />
        <span className="text-xs font-semibold tabular-nums shrink-0">
          {mm}:{ss}
        </span>
        <span className="text-xs text-[#d4d4d8] truncate">
          {t.stepsCount(stepCount)}
          {lastApp ? ` · ${lastApp}` : ""}
        </span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => void nativeBridge.captureInstantSnapshot()}
          className="h-7 px-2.5 rounded-md bg-[#27272a] hover:bg-[#3f3f46] text-white text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>{t.hudSnap}</span>
        </button>
        <button
          type="button"
          onClick={() => void nativeBridge.stopRecording()}
          className="h-7 px-3 rounded-md bg-[#c5281c] hover:bg-[#ab2016] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Square className="w-3 h-3 fill-current" />
          <span>{t.hudFinish}</span>
        </button>
      </div>
    </div>
  );
};
