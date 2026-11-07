"""
Download background images for the wedding invitation.
Using high-quality Unsplash photos of Rameswaram / temple landscapes.
"""
import urllib.request
import os
import sys

IMAGES_DIR = "/Users/kushalgowdacm/KISHORDEEPTHI/wedding-invitation/public/images"
os.makedirs(IMAGES_DIR, exist_ok=True)

# Curated Unsplash images matching each section
# Using direct Unsplash CDN URLs with specific photo IDs
images = {
    # S1: Hero - Ramanathaswamy Temple gopuram exterior
    "hero-gopuram.jpg":
        "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=1080&q=85&fit=crop",

    # S2: Blessing - Temple interior corridor with painted ceiling
    "temple-corridor.jpg":
        "https://images.unsplash.com/photo-1621508638997-e34f96190858?w=1080&q=85&fit=crop",

    # S3: Light - Pillared temple mandapa / open hall
    "pillared-mandapa.jpg":
        "https://images.unsplash.com/photo-1596526131083-e8c633064dbc?w=1080&q=85&fit=crop",

    # S4: Gathering - Stone colonnade / temple courtyard
    "stone-colonnade.jpg":
        "https://images.unsplash.com/photo-1587135991058-8816b028691f?w=1080&q=85&fit=crop",

    # S5: Horizon - Coastal Rameswaram sea
    "coastal-sea.jpg":
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1080&q=85&fit=crop",

    # S6: Promise - Stone arch with ocean view
    "coastal-arch.jpg":
        "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=1080&q=85&fit=crop",
}

headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
}

for filename, url in images.items():
    dest = os.path.join(IMAGES_DIR, filename)
    print(f"Downloading {filename}...", end=" ", flush=True)
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=30) as response:
            with open(dest, 'wb') as f:
                f.write(response.read())
        size = os.path.getsize(dest) / 1024
        print(f"✓ {size:.0f} KB")
    except Exception as e:
        print(f"✗ FAILED: {e}")

print("\nDone.")

