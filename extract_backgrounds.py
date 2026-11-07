"""
Extract clean background images directly from the reference video.
These will be used as the actual section backgrounds in the web app,
perfectly matching the original design.
"""
import cv2
import os
from PIL import Image

VIDEO_PATH = "/Users/kushalgowdacm/KISHORDEEPTHI/WhatsApp Video 2026-11-04 at 8.57.27 PM.mp4"
OUT_DIR    = "/Users/kushalgowdacm/KISHORDEEPTHI/wedding-invitation/public/images"
os.makedirs(OUT_DIR, exist_ok=True)

cap = cv2.VideoCapture(VIDEO_PATH)
fps = cap.get(cv2.CAP_PROP_FPS)

# Crop region: the browser viewport inside the recorded tablet frame.
# From Phase 1 analysis, the browser content occupies roughly:
# x: 115–460  y: 290–880  (of the 576×1024 frame)
# We'll crop this area and upscale to 1080×1920 for each section.
CROP_X1, CROP_Y1 = 112, 290
CROP_X2, CROP_Y2 = 462, 882

# Timestamps (seconds) for the BEST background moment in each section
# Using mid-scroll moment where background photo is most visible & unobscured
SECTIONS = {
    "hero-gopuram.jpg":    0.5,    # First frame — full gopuram, text visible top
    "temple-corridor.jpg": 4.5,    # Temple corridor — ornate ceiling, golden
    "pillared-mandapa.jpg":8.0,    # Open pillared mandapa — columns, blue sky
    "stone-colonnade.jpg": 11.5,   # Stone porch — open sky, minimal text
    "coastal-sea.jpg":     15.5,   # Coastal sea — calm horizon
    "coastal-arch.jpg":    19.0,   # Stone arch — ocean framing
}

def extract_frame(ts_sec):
    frame_idx = int(ts_sec * fps)
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
    ret, frame = cap.read()
    return frame if ret else None

for filename, ts in SECTIONS.items():
    frame = extract_frame(ts)
    if frame is None:
        print(f"✗ Failed to extract frame at {ts}s for {filename}")
        continue

    # Crop to browser viewport only
    cropped = frame[CROP_Y1:CROP_Y2, CROP_X1:CROP_X2]

    # Convert BGR → RGB
    rgb = cv2.cvtColor(cropped, cv2.COLOR_BGR2RGB)
    img = Image.fromarray(rgb)

    # Upscale to 1080×1920 portrait (maintain aspect ratio with letterbox fill)
    target_w, target_h = 1080, 1920
    orig_w, orig_h = img.size
    scale = min(target_w / orig_w, target_h / orig_h)
    new_w = int(orig_w * scale)
    new_h = int(orig_h * scale)

    resized = img.resize((new_w, new_h), Image.LANCZOS)

    # Place on target canvas (centered)
    canvas = Image.new("RGB", (target_w, target_h), (20, 18, 16))
    offset_x = (target_w - new_w) // 2
    offset_y = (target_h - new_h) // 2
    canvas.paste(resized, (offset_x, offset_y))

    dest = os.path.join(OUT_DIR, filename)
    canvas.save(dest, "JPEG", quality=92)
    print(f"✓ {filename}: {target_w}×{target_h}")

cap.release()
print("\nAll backgrounds extracted from reference video.")

