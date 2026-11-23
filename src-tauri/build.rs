use std::path::PathBuf;
use std::process::Command;

fn main() {
    #[cfg(target_os = "macos")]
    {
        println!("cargo:rerun-if-changed=native/darwin_capture.swift");
        let manifest_dir = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap());
        let swift_src = manifest_dir.join("native").join("darwin_capture.swift");
        let native_out = manifest_dir.join("native").join("stepcast-darwin-capture");
        let bin_dir = manifest_dir.join("bin");
        let _ = std::fs::create_dir_all(&bin_dir);
        let bin_out = bin_dir.join("stepcast-darwin-capture");

        let status = Command::new("/usr/bin/swiftc")
            .args([
                "-O",
                swift_src.to_str().unwrap(),
                "-o",
                native_out.to_str().unwrap(),
                "-framework",
                "Cocoa",
                "-framework",
                "ApplicationServices",
                "-framework",
                "Vision",
                "-framework",
                "CoreGraphics",
                "-framework",
                "ImageIO",
            ])
            .status()
            .expect("Failed to invoke swiftc for darwin_capture.swift");

        if !status.success() {
            panic!("swiftc failed to compile native/darwin_capture.swift");
        }
        let _ = std::fs::copy(&native_out, &bin_out);
    }

    tauri_build::build()
}
