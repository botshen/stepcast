# Changelog

All notable changes to **StepCast** are documented in this file.

## [0.1.0] - 2026-11-23

### Added
- **Cross-Application Native Capture Engine**:
  - macOS native Swift helper (`AXUIElement` accessibility inspection + `Vision.framework` 15ms offline Chinese/English OCR fallback for GPU-rendered terminals and Electron apps + Retina multi-monitor normalization).
  - Offline automatic secret bounding-box detection (`sk-`, `ghp_`, `github_pat_`, `AKIA`, JWTs) that pre-populates redaction masks upon capture.
  - Privacy-safe command shortcut capture (`⌘`/`⌃` chords only; zero plain-text keylogging).
  - Windows native `UIAutomation` (`ElementFromPoint`) + DPI-aware screen capture helper (`win_capture.ps1`).
- **Floating Recording HUD Pill**:
  - Auto-minimizes the main Studio window when recording starts and floats an always-on-top mini HUD pill with live timer, step ticker, instant snap, and one-click finish.
- **Studio Canvas & Visual Polish**:
  - Screen-Studio-inspired backdrop framing (`Obsidian`, `Warm Sand`, `Deep Slate`, `Minimal`) and smooth Auto-Zoom (`1.0x – 2.8x`) anchored around click coordinates.
  - Drag-to-draw destructive privacy redaction masks and spotlight callout boxes.
  - Full 25-step Undo/Redo history (`⌘Z` / `⌘⇧Z`), step duplication, reordering, and bilingual UI (`English` / `简体中文`).
- **Dual Human + AI Agent Compilers**:
  - **Visual SOP Exports**: Standalone interactive HTML guide (with built-in step-by-step walkthrough player), clean relative-path Markdown + `assets/` `.zip` bundle, and high-DPI vertical long PNG.
  - **Agent `SKILL.md` Compiler**: Generates `agentskills`-compliant `SKILL.md` + `references/visual-sop.md` and installs directly into `~/.claude/skills`, `~/.codex/skills`, or `~/.cursor/skills`.
