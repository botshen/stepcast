export type DetectionSource =
  | "accessibility"
  | "vision_ocr"
  | "coords"
  | "manual";

export type FocusMode = "auto_zoom" | "full";

export type CanvasTheme = "obsidian" | "sand" | "slate" | "minimal";

export type ActiveWorkspaceTab = "studio" | "sop" | "skill";

export type Locale = "zh" | "en";

export type AnnotationKind = "redact" | "highlight";

export interface RedactionBox {
  id: string;
  kind?: AnnotationKind;
  /** Normalized [0..1] relative to full source image width */
  x: number;
  /** Normalized [0..1] relative to full source image height */
  y: number;
  w: number;
  h: number;
  label?: string;
}

export interface CapturedStep {
  id: string;
  timestampMs: number;
  appName: string;
  bundleId: string;
  windowTitle: string;
  button: "left" | "right" | "shortcut";
  shortcutKey?: string;
  normX: number;
  normY: number;
  screenWidth: number;
  screenHeight: number;
  scaleFactor: number;
  elementRole: string;
  elementLabel: string;
  ocrText: string;
  detectionSource: DetectionSource;
  imageDataUrl: string;
  title: string;
  note: string;
  commandSnippet?: string;
  agentInstruction: string;
  focusMode: FocusMode;
  zoomLevel: number;
  redactions: RedactionBox[];
}

export interface SkillMeta {
  slug: string;
  name: string;
  description: string;
  triggers: string;
  allowedTools: string[];
}

export interface WorkflowSession {
  id: string;
  title: string;
  subtitle: string;
  createdAt: string;
  updatedAt: string;
  canvasTheme: CanvasTheme;
  ringColor: string;
  showStepBadge: boolean;
  watermark: string;
  skillMeta: SkillMeta;
  steps: CapturedStep[];
}

export interface PermissionStatus {
  accessibility: boolean;
  screenRecording: boolean;
  platform: string;
}

export interface SessionSummary {
  id: string;
  title: string;
  stepCount: number;
  updatedAt: string;
}

export interface AutoRedactionRect {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

export interface RawNativeEvent {
  id: string;
  timestampMs: number;
  appName: string;
  bundleId: string;
  windowTitle: string;
  button: string;
  shortcutKey?: string;
  normX: number;
  normY: number;
  screenWidth: number;
  screenHeight: number;
  scaleFactor: number;
  elementRole: string;
  elementLabel: string;
  ocrText: string;
  detectionSource: string;
  imagePath: string;
  autoRedactions?: AutoRedactionRect[];
  imageDataUrl?: string;
}

export interface AiProviderConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}
