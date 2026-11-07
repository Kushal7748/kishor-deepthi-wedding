"""
Fix missing images with working Unsplash alternatives.
"""
import urllib.request, os

IMAGES_DIR = "/Users/kushalgowdacm/KISHORDEEPTHI/wedding-invitation/public/images"

# Alternative URLs for the two failed images
fixes = {
    # Temple interior corridor with ornate ceiling & warm lanterns
    "temple-corridor.jpg":
        "https://images.unsplash.com/photo-1565038540994-cf62a7c4d99c?w=1080&q=85&fit=crop",
    # Pillared mandapa / hall — open colonnade
    "pillared-mandapa.jpg":
        "https://images.unsplash.com/photo-1585503418537-88331351ad99?w=1080&q=85&fit=crop",
}

headers = {'User-Agent': 'Mozilla/5.0'}

for filename, url in fixes.items():
    dest = os.path.join(IMAGES_DIR, filename)
    print(f"Downloading {filename}...", end=" ", flush=True)
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=30) as r:
            data = r.read()
        with open(dest, 'wb') as f:
            f.write(data)
        print(f"✓ {len(data)//1024} KB")
    except Exception as e:
        print(f"✗ {e}")

