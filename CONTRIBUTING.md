# Contributing to StepCast

Thank you for helping build the open-source standard for local-first visual SOPs and AI Agent `SKILL.md` compilation!

## Development Prerequisites

- **Node.js** 20+ and **pnpm** 9+
- **Rust** 1.77.2+ (`rustup`)
- **macOS**: Xcode Command Line Tools (`xcode-select --install`) for `swiftc` (`Cocoa`, `ApplicationServices`, `Vision`)
- **Windows**: Microsoft Visual Studio C++ Build Tools & WebView2 Runtime

## Local Setup

```bash
git clone https://github.com/botshen/stepcast.git
cd stepcast
pnpm install

# Run frontend unit tests
pnpm test

# Run Rust + SQLite + skill-packager unit tests
cargo test --manifest-path src-tauri/Cargo.toml

# Launch full native desktop studio + floating HUD recorder
pnpm tauri dev
```

## Architecture Overview

StepCast decouples OS-specific low-level event hooks from the Tauri Rust core via a clean newline-delimited JSON (`JSONL`) contract over `stdout`:

- `src-tauri/native/darwin_capture.swift`: Non-blocking macOS `NSEvent` monitor + multi-display Retina coordinate normalization + `AXUIElementCopyElementAtPosition` + `Vision.framework` 15ms offline OCR & secret bounding-box scanner.
- `src-tauri/native/win_capture.ps1`: DPI-aware Windows `UIAutomation` `ElementFromPoint` + `CopyFromScreen` capture loop.
- `src-tauri/src/capture.rs` & `db.rs`: Spawns and supervises the OS helper, hydrates base64 frames, persists sessions in SQLite, and coordinates the frameless Floating HUD window (`?window=hud`).
- `src/lib/compilers.ts` & `zipBuilder.ts`: High-DPI `<canvas>` auto-zoom renderer, destructive redaction baker, interactive standalone HTML player generator, `agentskills`-compliant `SKILL.md` compiler, and zero-dependency PKZIP archiver.

## Pull Request Checklist

- [ ] `pnpm test` and `pnpm build` pass with zero TypeScript errors.
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml` passes.
- [ ] Both English (`?lang=en`) and Chinese (`?lang=zh`) UI strings in `src/lib/i18n.ts` are updated when adding UI controls.
