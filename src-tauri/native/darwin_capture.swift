import Cocoa
import ApplicationServices
import Vision
import CoreGraphics
import ImageIO

struct PermissionStatus: Codable {
    let accessibility: Bool
    let screenRecording: Bool
    let platform: String
}

struct AutoRedactionRect: Codable {
    let x: Double
    let y: Double
    let w: Double
    let h: Double
    let label: String
}

struct CapturedEventPayload: Codable {
    let id: String
    let timestampMs: Int64
    let appName: String
    let bundleId: String
    let windowTitle: String
    let button: String
    let shortcutKey: String
    let normX: Double
    let normY: Double
    let screenWidth: Int
    let screenHeight: Int
    let scaleFactor: Double
    let elementRole: String
    let elementLabel: String
    let ocrText: String
    let detectionSource: String
    let imagePath: String
    let autoRedactions: [AutoRedactionRect]
}

func emitJSON<T: Encodable>(_ value: T) {
    let encoder = JSONEncoder()
    if let data = try? encoder.encode(value),
       let text = String(data: data, encoding: .utf8) {
        print(text)
        fflush(stdout)
    }
}

func stringAttr(_ element: AXUIElement, _ attr: String) -> String? {
    var raw: CFTypeRef?
    let err = AXUIElementCopyAttributeValue(element, attr as CFString, &raw)
    guard err == .success, let val = raw else { return nil }
    if let str = val as? String {
        let trimmed = str.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }
    return nil
}

func inspectAXAt(quartzX: Float, quartzY: Float) -> (role: String, label: String, windowTitle: String) {
    guard AXIsProcessTrusted() else {
        return ("", "", "")
    }
    let systemWide = AXUIElementCreateSystemWide()
    var hitElement: AXUIElement?
    let err = AXUIElementCopyElementAtPosition(systemWide, quartzX, quartzY, &hitElement)
    guard err == .success, var current = hitElement else {
        return ("", "", "")
    }

    var bestRole = stringAttr(current, kAXRoleAttribute as String) ?? ""
    var bestLabel = ""
    var winTitle = ""

    for _ in 0..<6 {
        if bestLabel.isEmpty {
            let candidates = [
                stringAttr(current, kAXTitleAttribute as String),
                stringAttr(current, kAXDescriptionAttribute as String),
                stringAttr(current, kAXPlaceholderValueAttribute as String),
                stringAttr(current, kAXValueAttribute as String)
            ]
            for c in candidates {
                if let text = c, text.count <= 80 {
                    bestLabel = text
                    if bestRole.isEmpty {
                        bestRole = stringAttr(current, kAXRoleAttribute as String) ?? ""
                    }
                    break
                }
            }
        }
        let roleHere = stringAttr(current, kAXRoleAttribute as String) ?? ""
        if roleHere == (kAXWindowRole as String), winTitle.isEmpty {
            winTitle = stringAttr(current, kAXTitleAttribute as String) ?? ""
        }
        var parentRef: CFTypeRef?
        let pErr = AXUIElementCopyAttributeValue(current, kAXParentAttribute as CFString, &parentRef)
        if pErr == .success, let parent = parentRef {
            current = (parent as! AXUIElement)
        } else {
            break
        }
    }

    return (bestRole, bestLabel, winTitle)
}

let secretPatterns: [(label: String, regex: NSRegularExpression)] = {
    let defs: [(String, String)] = [
        ("API Secret Key", "(?:sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{28,}|eyJ[A-Za-z0-9_-]{14,}\\.[A-Za-z0-9_-]{14,})"),
        ("Credential Assignment", "(?i)(?:api[_-]?key|secret|password|passwd|access[_-]?token)\\s*[:=]\\s*['\\\"]?[A-Za-z0-9_\\-./+=]{8,}"),
    ]
    return defs.compactMap { name, pat in
        if let rx = try? NSRegularExpression(pattern: pat, options: []) {
            return (name, rx)
        }
        return nil
    }
}()

func analyzeImageVision(
    imagePath: String,
    normX: Double,
    normY: Double,
    needClickLabel: Bool
) -> (clickLabel: String, redactions: [AutoRedactionRect]) {
    let url = URL(fileURLWithPath: imagePath)
    guard let src = CGImageSourceCreateWithURL(url as CFURL, nil),
          let fullImage = CGImageSourceCreateImageAtIndex(src, 0, nil) else {
        return ("", [])
    }

    var clickText = ""
    if needClickLabel {
        let imgW = Double(fullImage.width)
        let imgH = Double(fullImage.height)
        let cropW = min(imgW, 440.0)
        let cropH = min(imgH, 160.0)
        let cropX = max(0.0, min(imgW - cropW, normX * imgW - cropW / 2.0))
        let cropY = max(0.0, min(imgH - cropH, normY * imgH - cropH / 2.0))

        if let cropped = fullImage.cropping(to: CGRect(x: cropX, y: cropY, width: cropW, height: cropH)) {
            let req = VNRecognizeTextRequest { r, _ in
                guard let results = r.results as? [VNRecognizedTextObservation] else { return }
                let sorted = results.sorted { a, b in
                    let da = pow(a.boundingBox.midX - 0.5, 2) + pow(a.boundingBox.midY - 0.5, 2)
                    let db = pow(b.boundingBox.midX - 0.5, 2) + pow(b.boundingBox.midY - 0.5, 2)
                    return da < db
                }
                if let best = sorted.first?.topCandidates(1).first?.string.trimmingCharacters(in: .whitespacesAndNewlines),
                   !best.isEmpty {
                    clickText = best
                }
            }
            req.recognitionLevel = .accurate
            req.recognitionLanguages = ["zh-Hans", "zh-Hant", "en-US"]
            req.usesLanguageCorrection = false
            try? VNImageRequestHandler(cgImage: cropped, options: [:]).perform([req])
        }
    }

    // Fast full-frame scan for API keys / secrets to auto-redact offline
    var autoBoxes: [AutoRedactionRect] = []
    let scanReq = VNRecognizeTextRequest { r, _ in
        guard let results = r.results as? [VNRecognizedTextObservation] else { return }
        for obs in results {
            guard let candidate = obs.topCandidates(1).first?.string else { continue }
            let range = NSRange(location: 0, length: (candidate as NSString).length)
            for item in secretPatterns {
                if item.regex.firstMatch(in: candidate, options: [], range: range) != nil {
                    let bb = obs.boundingBox
                    // Convert Vision bottom-left normalized box to top-left normalized box
                    let rx = max(0.0, Double(bb.origin.x) - 0.004)
                    let ry = max(0.0, 1.0 - Double(bb.origin.y + bb.height) - 0.004)
                    let rw = min(1.0 - rx, Double(bb.width) + 0.008)
                    let rh = min(1.0 - ry, Double(bb.height) + 0.008)
                    autoBoxes.append(AutoRedactionRect(x: rx, y: ry, w: rw, h: rh, label: item.label))
                    break
                }
            }
        }
    }
    scanReq.recognitionLevel = .fast
    scanReq.usesLanguageCorrection = false
    try? VNImageRequestHandler(cgImage: fullImage, options: [:]).perform([scanReq])

    return (clickText, autoBoxes)
}

func captureStepAt(
    mouseCocoa: NSPoint,
    button: String,
    shortcutKey: String,
    outputDir: String,
    skipPid: Int32
) -> CapturedEventPayload? {
    let frontApp = NSWorkspace.shared.frontmostApplication
    if let pid = frontApp?.processIdentifier, skipPid > 0 && pid == skipPid {
        return nil
    }
    if let bundle = frontApp?.bundleIdentifier, bundle == "dev.stepcast.desktop" {
        return nil
    }

    let screens = NSScreen.screens
    guard let primary = screens.first else { return nil }
    let primaryH = primary.frame.height

    let targetScreen = screens.first(where: { NSMouseInRect(mouseCocoa, $0.frame, false) }) ?? primary
    let frame = targetScreen.frame
    let scale = Double(targetScreen.backingScaleFactor)

    let quartzMouseX = Double(mouseCocoa.x)
    let quartzMouseY = Double(primaryH - mouseCocoa.y)
    let screenQuartzX = Double(frame.origin.x)
    let screenQuartzY = Double(primaryH - (frame.origin.y + frame.height))

    let normX = max(0.0, min(1.0, (quartzMouseX - screenQuartzX) / Double(frame.width)))
    let normY = max(0.0, min(1.0, (quartzMouseY - screenQuartzY) / Double(frame.height)))

    let stepId = UUID().uuidString.lowercased()
    let outPath = (outputDir as NSString).appendingPathComponent("step_\(stepId).png")
    let rectArg = "\(Int(screenQuartzX.rounded())),\(Int(screenQuartzY.rounded())),\(Int(frame.width.rounded())),\(Int(frame.height.rounded()))"

    let proc = Process()
    proc.executableURL = URL(fileURLWithPath: "/usr/sbin/screencapture")
    proc.arguments = ["-x", "-R", rectArg, outPath]
    try? proc.run()
    proc.waitUntilExit()

    let fileExists = FileManager.default.fileExists(atPath: outPath)
    let axInfo = inspectAXAt(quartzX: Float(quartzMouseX), quartzY: Float(quartzMouseY))

    var ocrText = ""
    var redactions: [AutoRedactionRect] = []
    var source = "coords"

    if fileExists {
        let visionRes = analyzeImageVision(
            imagePath: outPath,
            normX: normX,
            normY: normY,
            needClickLabel: axInfo.label.isEmpty && shortcutKey.isEmpty
        )
        ocrText = visionRes.clickLabel
        redactions = visionRes.redactions
    }

    if !axInfo.label.isEmpty || !shortcutKey.isEmpty {
        source = "accessibility"
    } else if !ocrText.isEmpty {
        source = "vision_ocr"
    }

    let appName = frontApp?.localizedName ?? "Desktop"
    let bundleId = frontApp?.bundleIdentifier ?? ""

    return CapturedEventPayload(
        id: stepId,
        timestampMs: Int64(Date().timeIntervalSince1970 * 1000),
        appName: appName,
        bundleId: bundleId,
        windowTitle: axInfo.windowTitle,
        button: button,
        shortcutKey: shortcutKey,
        normX: normX,
        normY: normY,
        screenWidth: Int(frame.width),
        screenHeight: Int(frame.height),
        scaleFactor: scale,
        elementRole: axInfo.role,
        elementLabel: axInfo.label,
        ocrText: ocrText,
        detectionSource: source,
        imagePath: fileExists ? outPath : "",
        autoRedactions: redactions
    )
}

func formatShortcut(_ event: NSEvent) -> String? {
    let flags = event.modifierFlags.intersection(.deviceIndependentFlagsMask)
    let hasCmdOrCtrl = flags.contains(.command) || flags.contains(.control)
    // Privacy-by-design: never log plain typing (passwords/messages); only capture explicit Command/Ctrl shortcuts
    guard hasCmdOrCtrl else { return nil }
    guard let chars = event.charactersIgnoringModifiers?.uppercased(), !chars.isEmpty else {
        return nil
    }
    var parts: [String] = []
    if flags.contains(.control) { parts.append("⌃") }
    if flags.contains(.option) { parts.append("⌥") }
    if flags.contains(.shift) { parts.append("⇧") }
    if flags.contains(.command) { parts.append("⌘") }
    parts.append(chars)
    return parts.joined()
}

let args = CommandLine.arguments
let mode = args.count > 1 ? args[1] : "check"

switch mode {
case "check":
    emitJSON(PermissionStatus(
        accessibility: AXIsProcessTrusted(),
        screenRecording: CGPreflightScreenCaptureAccess(),
        platform: "macos"
    ))

case "request-ax":
    let opts = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true] as CFDictionary
    _ = AXIsProcessTrustedWithOptions(opts)
    if let url = URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility") {
        NSWorkspace.shared.open(url)
    }
    emitJSON(PermissionStatus(
        accessibility: AXIsProcessTrusted(),
        screenRecording: CGPreflightScreenCaptureAccess(),
        platform: "macos"
    ))

case "request-screen":
    _ = CGRequestScreenCaptureAccess()
    if let url = URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture") {
        NSWorkspace.shared.open(url)
    }
    emitJSON(PermissionStatus(
        accessibility: AXIsProcessTrusted(),
        screenRecording: CGPreflightScreenCaptureAccess(),
        platform: "macos"
    ))

case "snapshot":
    let outDir = args.count > 2 ? args[2] : NSTemporaryDirectory()
    try? FileManager.default.createDirectory(atPath: outDir, withIntermediateDirectories: true)
    let loc = NSEvent.mouseLocation
    if let payload = captureStepAt(
        mouseCocoa: loc,
        button: "left",
        shortcutKey: "",
        outputDir: outDir,
        skipPid: 0
    ) {
        emitJSON(payload)
    }

case "watch":
    let outDir = args.count > 2 ? args[2] : NSTemporaryDirectory()
    let skipPid = args.count > 3 ? (Int32(args[3]) ?? 0) : 0
    try? FileManager.default.createDirectory(atPath: outDir, withIntermediateDirectories: true)

    let app = NSApplication.shared
    app.setActivationPolicy(.prohibited)

    let workerQueue = DispatchQueue(label: "dev.stepcast.capture.worker", qos: .userInitiated)
    var lastEventMs: Int64 = 0

    NSEvent.addGlobalMonitorForEvents(matching: [.leftMouseDown, .rightMouseDown]) { event in
        let nowMs = Int64(Date().timeIntervalSince1970 * 1000)
        if nowMs - lastEventMs < 260 {
            return
        }
        lastEventMs = nowMs
        let loc = NSEvent.mouseLocation
        let btn = event.type == .rightMouseDown ? "right" : "left"
        workerQueue.async {
            if let payload = captureStepAt(
                mouseCocoa: loc,
                button: btn,
                shortcutKey: "",
                outputDir: outDir,
                skipPid: skipPid
            ) {
                emitJSON(payload)
            }
        }
    }

    NSEvent.addGlobalMonitorForEvents(matching: [.keyDown]) { event in
        guard let combo = formatShortcut(event) else { return }
        // Ignore common copy/tab-switch noise if desired, or keep meaningful shortcuts
        if combo == "⌘TAB" { return }
        let nowMs = Int64(Date().timeIntervalSince1970 * 1000)
        if nowMs - lastEventMs < 350 { return }
        lastEventMs = nowMs
        let loc = NSEvent.mouseLocation
        workerQueue.async {
            if let payload = captureStepAt(
                mouseCocoa: loc,
                button: "shortcut",
                shortcutKey: combo,
                outputDir: outDir,
                skipPid: skipPid
            ) {
                emitJSON(payload)
            }
        }
    }

    app.run()

default:
    break
}
