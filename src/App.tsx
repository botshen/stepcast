import React, { useEffect } from "react";
import { useWorkflowStore } from "./store/useWorkflowStore";
import { TopBar } from "./components/TopBar";
import { StepTimeline } from "./components/StepTimeline";
import { StageCanvas } from "./components/StageCanvas";
import { InspectorPanel } from "./components/InspectorPanel";
import { SopPreviewView } from "./components/SopPreviewView";
import { SkillPreviewView } from "./components/SkillPreviewView";
import { RecordingHudPill } from "./components/RecordingHudPill";

const isHudWindow =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("window") === "hud";

export const App: React.FC = () => {
  const { activeTab, toastMessage, initialize, undo, redo, stepRelative } =
    useWorkflowStore();

  useEffect(() => {
    if (isHudWindow) return;
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (isHudWindow) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      const isEditingText =
        tag === "input" || tag === "textarea" || tag === "select";

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !isEditingText) {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      if (!isEditingText && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          stepRelative(1);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          stepRelative(-1);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo, stepRelative]);

  if (isHudWindow) {
    return <RecordingHudPill />;
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#f4f3ef] text-[#161615] overflow-hidden">
      <TopBar />

      <div className="flex-1 min-h-0 flex">
        {activeTab === "studio" && (
          <>
            <StepTimeline />
            <StageCanvas />
            <InspectorPanel />
          </>
        )}
        {activeTab === "sop" && <SopPreviewView />}
        {activeTab === "skill" && <SkillPreviewView />}
      </div>

      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-[#18181b] text-white text-xs font-medium shadow-lg"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default App;
