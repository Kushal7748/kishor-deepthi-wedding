"""
Measure exact browser chrome height by analysing pixel values.
The browser chrome ends where we see the first content pixels.
"""
import cv2
import numpy as np

VIDEO_PATH = "/Users/kushalgowdacm/KISHORDEEPTHI/WhatsApp Video 2026-11-04 at 8.57.27 PM.mp4"
cap = cv2.VideoCapture(VIDEO_PATH)
cap.set(cv2.CAP_PROP_POS_FRAMES, 15)  # ~0.5s
ret, frame = cap.read()
cap.release()

# frame is 576x1024
# Focus on centre column to find where chrome ends
cx = 288  # horizontal centre
print("Analysing pixel row by row at centre column:")
print("Row  | R    G    B   | Note")

prev_dark = False
for y in range(260, 360):
    b, g, r = frame[y, cx]
    is_dark = (r < 50 and g < 50 and b < 70)  # dark chrome
    if prev_dark and not is_dark:
        print(f"  >>> CHROME ENDS at y={y} <<<")
    if 260 <= y <= 320:
        print(f"  y={y:3d} | {r:3d}  {g:3d}  {b:3d}")
    prev_dark = is_dark

# Also check left edge for tablet bezel
print("\nLeft edge scan at y=400:")
for x in range(100, 140):
    b, g, r = frame[400, x]
    print(f"  x={x} | {r:3d}  {g:3d}  {b:3d}")

