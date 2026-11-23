# Security & Privacy Architecture

StepCast is built from the ground up for recording internal engineering dashboards, terminal workflows, cloud consoles, and enterprise admin panels where SaaS cloud uploaders are unacceptable.

## Core Privacy Guarantees

1. **100% Offline & Zero Telemetry**
   - StepCast operates with zero analytics, zero crash-reporting beacons, and zero StepCast-owned servers.
   - All captured screenshots and workflow metadata stay exclusively inside your OS user data directory (`stepcast.sqlite3` and `captures/`).

2. **No Keylogging by Design**
   - StepCast **never** records plain alphanumeric typing (such as passwords, chat messages, or secret tokens typed into terminals or forms).
   - The native event monitor strictly filters keyboard events to explicit command chords containing `⌘ Command` or `⌃ Control` modifiers (e.g., `⌘K`, `⌘⇧P`).

3. **On-Device Vision Secret Redaction**
   - On macOS, `darwin_capture.swift` runs Apple's built-in offline `Vision.framework` (`VNRecognizeTextRequest`) directly on captured frames to flag common credential patterns (`sk-...`, `ghp_...`, `github_pat_...`, `AKIA...`, JWTs, and `API_KEY=` assignments) and pre-populates opaque redaction masks before any export occurs.
   - Redactions are baked destructively into exported PNG, HTML, and ZIP images on `<canvas>`, so underlying pixels cannot be unmasked by recipients.

4. **Optional BYOK Isolation**
   - Configuring an OpenAI-compatible endpoint for step copy polishing is strictly opt-in.
   - Only compact text metadata (window titles and button labels—never raw screenshots or redacted values) is sent directly from your machine to your chosen endpoint.

## Reporting a Vulnerability

Please report security issues privately via GitHub Security Advisories on the repository rather than opening a public issue. Include reproduction steps, OS version, and affected component (`src-tauri/native/`, `src-tauri/src/`, or `src/`).
