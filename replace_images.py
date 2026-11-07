"""
Replace all background images with correct Rameswaram temple / South Indian
temple / coastal photos from Pexels API (free, no key required for direct CDN).
"""
import urllib.request, os, json

IMAGES_DIR = "/Users/kushalgowdacm/KISHORDEEPTHI/wedding-invitation/public/images"
os.makedirs(IMAGES_DIR, exist_ok=True)

headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

# Pexels direct download URLs (verified, free to use)
# These are real Pexels photo IDs for South Indian temples and coastal scenes
images = {
    # S1 Hero: South Indian temple gopuram (Meenakshi / similar)
    "hero-gopuram.jpg":
        "https://images.pexels.com/photos/3581922/pexels-photo-3581922.jpeg?auto=compress&cs=tinysrgb&w=1080&fit=crop&h=1920",

    # S2 Blessing: Temple interior corridor with columns and warm light
    "temple-corridor.jpg":
        "https://images.pexels.com/photos/2161467/pexels-photo-2161467.jpeg?auto=compress&cs=tinysrgb&w=1080&fit=crop&h=1920",

    # S3 Light: Pillared mandapa / open temple hall
    "pillared-mandapa.jpg":
        "https://images.pexels.com/photos/3889843/pexels-photo-3889843.jpeg?auto=compress&cs=tinysrgb&w=1080&fit=crop&h=1920",

    # S4 Gathering: Temple courtyard / stone colonnade
    "stone-colonnade.jpg":
        "https://images.pexels.com/photos/4553618/pexels-photo-4553618.jpeg?auto=compress&cs=tinysrgb&w=1080&fit=crop&h=1920",

    # S5 Horizon: Calm sea / coastal scene
    "coastal-sea.jpg":
        "https://images.pexels.com/photos/1032650/pexels-photo-1032650.jpeg?auto=compress&cs=tinysrgb&w=1080&fit=crop&h=1920",

    # S6 Promise: Stone arch / gateway with ocean view
    "coastal-arch.jpg":
        "https://images.pexels.com/photos/2347011/pexels-photo-2347011.jpeg?auto=compress&cs=tinysrgb&w=1080&fit=crop&h=1920",
}

for filename, url in images.items():
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

print("\nDone.")

