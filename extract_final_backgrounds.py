"""
Final precise background extraction.
Exact crop: x=122→460, y=352→876 (web content below browser chrome).
Then upscale cleanly to 1080x1920.
"""
import cv2
import numpy as np
from PIL import Image, ImageEnhance
import os

VIDEO_PATH = "/Users/kushalgowdacm/KISHORDEEPTHI/WhatsApp Video 2026-11-04 at 8.57.27 PM.mp4"
OUT_DIR    = "/Users/kushalgowdacm/KISHORDEEPTHI/wedding-invitation/public/images"
os.makedirs(OUT_DIR, exist_ok=True)

cap = cv2.VideoCapture(VIDEO_PATH)
fps = cap.get(cv2.CAP_PROP_FPS)

# Exact content crop (measured above)
CX1, CY1 = 122, 352   # left, top  (below browser chrome)
CX2, CY2 = 460, 875   # right, bottom (above tablet bottom bezel)

TARGET_W, TARGET_H = 1080, 1920

def get_frame(ts):
    cap.set(cv2.CAP_PROP_POS_FRAMES, int(ts * fps))
    ret, frame = cap.read()
    return frame if ret else None

def process(frame, enhance_contrast=False):
    cropped = frame[CY1:CY2, CX1:CX2]
    rgb = cv2.cvtColor(cropped, cv2.COLOR_BGR2RGB)
    img = Image.fromarray(rgb)
    # Scale to fill 1080x1920 (cover mode)
    scale = max(TARGET_W / img.width, TARGET_H / img.height)
    nw, nh = int(img.width * scale), int(img.height * scale)
    img = img.resize((nw, nh), Image.LANCZOS)
    # Centre crop
    ox = (nw - TARGET_W) // 2
    oy = (nh - TARGET_H) // 2
    img = img.crop((ox, oy, ox + TARGET_W, oy + TARGET_H))
    if enhance_contrast:
        img = ImageEnhance.Contrast(img).enhance(1.08)
        img = ImageEnhance.Sharpness(img).enhance(1.1)
    return img

# Best timestamps — where each section bg photo is clearest
# Using scroll positions where camera has moved PAST the text overlay
# (the parallax means bg is revealed cleanly as page scrolls)
SECTIONS = [
    # filename,              ts,    contrast_boost
    ("hero-gopuram.jpg",    2.1,   False),  # gopuram filling frame, text gone
    ("temple-corridor.jpg", 3.5,   True),   # golden corridor — just entering
    ("pillared-mandapa.jpg",7.8,   False),  # open mandapa with blue sky
    ("stone-colonnade.jpg", 11.3,  False),  # stone porch + columns
    ("coastal-sea.jpg",     14.5,  False),  # coastal sea
    ("coastal-arch.jpg",    17.9,  False),  # stone arch with ocean
]

for (filename, ts, enhance) in SECTIONS:
    frame = get_frame(ts)
    if frame is None:
        print(f"✗ {filename}: read failed")
        continue
    img = process(frame, enhance)
    dest = os.path.join(OUT_DIR, filename)
    img.save(dest, "JPEG", quality=92)
    print(f"✓ {filename} — from t={ts}s — {img.size}")

cap.release()
print("\nComplete.")

