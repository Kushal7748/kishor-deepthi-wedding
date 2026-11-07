"""
Precisely crop ONLY the web content area from each reference frame.
Then extract clean, pure background images (just the photography, not the text).
Strategy: use frames where the scrolled content shows mostly background
  with minimal text, then apply content-aware crop.
"""
import cv2
import numpy as np
from PIL import Image
import os

VIDEO_PATH = "/Users/kushalgowdacm/KISHORDEEPTHI/WhatsApp Video 2026-11-04 at 8.57.27 PM.mp4"
OUT_DIR    = "/Users/kushalgowdacm/KISHORDEEPTHI/wedding-invitation/public/images"
os.makedirs(OUT_DIR, exist_ok=True)

cap = cv2.VideoCapture(VIDEO_PATH)
fps = cap.get(cv2.CAP_PROP_FPS)
W   = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))   # 576
H   = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))  # 1024

# ── PRECISE CONTENT CROP ──────────────────────────────────────────────
# From careful inspection of reference frames, the web content (without tablet
# frame or browser chrome) occupies:
#   Left edge:   ~112px  (tablet bezel)
#   Right edge:  ~462px  (tablet bezel + stylus)
#   Top edge:    ~288px  (tablet bezel + browser chrome/address bar)
#   Bottom edge: ~880px  (tablet bottom bezel)
# Content area: 350px wide × 592px tall
CX1, CY1 = 112, 288
CX2, CY2 = 462, 882
CONTENT_W = CX2 - CX1  # ~350px
CONTENT_H = CY2 - CY1  # ~594px

TARGET_W, TARGET_H = 1080, 1920

def get_frame(ts_sec):
    cap.set(cv2.CAP_PROP_POS_FRAMES, int(ts_sec * fps))
    ret, frame = cap.read()
    return frame if ret else None

def crop_and_upscale(frame, cx1=CX1, cy1=CY1, cx2=CX2, cy2=CY2):
    """Crop web content area and upscale to 1080x1920."""
    cropped = frame[cy1:cy2, cx1:cx2]
    rgb = cv2.cvtColor(cropped, cv2.COLOR_BGR2RGB)
    img = Image.fromarray(rgb)
    # Scale to fill target height; crop width to target width
    scale = TARGET_H / img.height
    new_w = int(img.width * scale)
    new_h = TARGET_H
    resized = img.resize((new_w, new_h), Image.LANCZOS)
    # Centre-crop to target width
    x_off = max(0, (new_w - TARGET_W) // 2)
    final = resized.crop((x_off, 0, x_off + TARGET_W, TARGET_H))
    return final

# ── SECTION BACKGROUND EXTRACTION STRATEGY ───────────────────────────
# For each section, pick the frame where:
# - The section photo fills most of the viewport
# - Minimal original text overlay interference
# - The parallax has revealed the most scenic part of the photo
#
# For the hero — we only want the LOWER portion (the gopuram photo strip).
# We handle it specially by using a frame where the camera has partially
# scrolled (the gopuram fills more of the frame).

sections = {
    # Hero: frame at ~0.5s shows full page with gopuram in lower half
    # We want JUST the gopuram image portion (bottom 60% of content)
    "hero-gopuram.jpg":    (0.5,   None),  # special handling

    # Blessing: at ~4.5s the ornate corridor fills the whole viewport  
    "temple-corridor.jpg": (4.5,   None),

    # Light: at ~7.5s the pillared mandapa is fully visible
    "pillared-mandapa.jpg":(7.5,   None),

    # Gathering: at ~11.0s stone colonnade with blue sky  
    "stone-colonnade.jpg": (11.0,  None),

    # Horizon: at ~15.0s the coastal sea fills the frame
    "coastal-sea.jpg":     (15.0,  None),

    # Promise: at ~18.5s the stone arch with ocean — most visible
    "coastal-arch.jpg":    (18.5,  None),
}

for filename, (ts, _) in sections.items():
    frame = get_frame(ts)
    if frame is None:
        print(f"✗ {filename}: frame read failed at {ts}s")
        continue

    if filename == "hero-gopuram.jpg":
        # Special: crop only the GOPURAM portion (lower 55% of content area)
        # This gives us just the stone temple image without names/text box
        gopuram_y1 = CY1 + int(CONTENT_H * 0.42)  # ~42% down from content top
        img = crop_and_upscale(frame, CX1, gopuram_y1, CX2, CY2)
    else:
        img = crop_and_upscale(frame)

    dest = os.path.join(OUT_DIR, filename)
    img.save(dest, "JPEG", quality=93)
    print(f"✓ {filename}: saved {img.size}")

cap.release()
print("\nAll backgrounds extracted cleanly.")

