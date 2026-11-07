"""
Smart background extraction:
1. Find the precise crop of JUST the web content (no tablet bezel/chrome)
2. Pick scroll positions where background photo is most visible
3. Use inpainting to remove baked-in text from the original video
"""
import cv2
import numpy as np
from PIL import Image, ImageFilter
import os

VIDEO_PATH = "/Users/kushalgowdacm/KISHORDEEPTHI/WhatsApp Video 2026-11-04 at 8.57.27 PM.mp4"
OUT_DIR    = "/Users/kushalgowdacm/KISHORDEEPTHI/wedding-invitation/public/images"
os.makedirs(OUT_DIR, exist_ok=True)

cap = cv2.VideoCapture(VIDEO_PATH)
fps = cap.get(cv2.CAP_PROP_FPS)

# ── PRECISE CONTENT CROP (no tablet chrome) ──────────────────────────
# After measuring: web content area in raw 576x1024 frame is roughly:
#   X: 115 → 460   (content width ~345px)
#   Y: 290 → 876   (content height ~586px, below browser chrome)
CX1, CY1 = 115, 290
CX2, CY2 = 460, 876

TARGET_W, TARGET_H = 1080, 1920

def get_frame(ts_sec):
    cap.set(cv2.CAP_PROP_POS_FRAMES, int(ts_sec * fps))
    ret, frame = cap.read()
    return frame if ret else None

def crop_content(frame):
    """Crop to web content area only."""
    return frame[CY1:CY2, CX1:CX2]

def upscale_to_target(img_rgb_pil):
    """Scale-to-fill 1080x1920, centre-crop."""
    scale = max(TARGET_W / img_rgb_pil.width, TARGET_H / img_rgb_pil.height)
    new_w = int(img_rgb_pil.width * scale)
    new_h = int(img_rgb_pil.height * scale)
    resized = img_rgb_pil.resize((new_w, new_h), Image.LANCZOS)
    left = (new_w - TARGET_W) // 2
    top  = (new_h - TARGET_H) // 2
    return resized.crop((left, top, left + TARGET_W, top + TARGET_H))

def inpaint_text(frame_bgr_cropped):
    """
    Use OpenCV inpainting to remove light-coloured text from dark backgrounds.
    Creates a mask of near-white pixels (the overlaid text) and inpaints them.
    """
    # Convert to LAB for luminance-based masking
    lab = cv2.cvtColor(frame_bgr_cropped, cv2.COLOR_BGR2LAB)
    L   = lab[:, :, 0]
    # Text in the reference is bright white/cream on dark backgrounds
    # Mask: very bright areas that are "text-like" (small connected components)
    _, bright_mask = cv2.threshold(L, 210, 255, cv2.THRESH_BINARY)
    # Dilate to cover anti-aliasing
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    text_mask = cv2.dilate(bright_mask, kernel, iterations=2)
    # Only mask small connected regions (text, not large bright sky areas)
    n_labels, labels, stats, _ = cv2.connectedComponentsWithStats(text_mask)
    refined_mask = np.zeros_like(text_mask)
    for i in range(1, n_labels):
        area = stats[i, cv2.CC_STAT_AREA]
        w    = stats[i, cv2.CC_STAT_WIDTH]
        h    = stats[i, cv2.CC_STAT_HEIGHT]
        # Text components are narrow or small area
        if area < 2000 and (w < 300 or h < 60):
            refined_mask[labels == i] = 255
    # Inpaint
    inpainted = cv2.inpaint(frame_bgr_cropped, refined_mask, 5, cv2.INPAINT_TELEA)
    return inpainted

# Best timestamps for clean background (each section mid-scroll)
SECTIONS = {
    # Hero: use a frame mid-zoom so gopuram fills most screen
    "hero-gopuram.jpg":    1.5,
    # Blessing: use frame before/at start where text is minimal
    "temple-corridor.jpg": 3.3,
    # Light: use frame where camera shows temple exterior open hall
    "pillared-mandapa.jpg":8.0,
    # Gathering: use frame with stone colonnade + blue sky
    "stone-colonnade.jpg": 10.3,
    # Horizon: coastal sea, most scenic
    "coastal-sea.jpg":     14.3,
    # Promise: stone arch with ocean — peak composition
    "coastal-arch.jpg":    18.0,
}

for filename, ts in SECTIONS.items():
    frame = get_frame(ts)
    if frame is None:
        print(f"✗ {filename}: frame read failed")
        continue

    # Crop content area
    cropped = crop_content(frame)
    # Inpaint text overlays
    clean   = inpaint_text(cropped)
    # To PIL RGB
    rgb     = cv2.cvtColor(clean, cv2.COLOR_BGR2RGB)
    img     = Image.fromarray(rgb)
    # Upscale
    final   = upscale_to_target(img)
    # Save
    dest    = os.path.join(OUT_DIR, filename)
    final.save(dest, "JPEG", quality=92)
    print(f"✓ {filename}")

cap.release()
print("\nDone — clean backgrounds saved.")

