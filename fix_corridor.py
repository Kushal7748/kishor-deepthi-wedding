"""
Final attempt for temple-corridor image with multiple fallbacks.
"""
import urllib.request, os

dest = "/Users/kushalgowdacm/KISHORDEEPTHI/wedding-invitation/public/images/temple-corridor.jpg"
headers = {'User-Agent': 'Mozilla/5.0'}

urls = [
    # Brihadeeswarar temple interior / corridor
    "https://images.unsplash.com/photo-1570939274717-7eda259b50ed?w=1080&q=85&fit=crop",
    # Dark ornate temple hall
    "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=1080&q=85&fit=crop",
    # Indian temple pillared hall
    "https://images.unsplash.com/photo-1568454537842-d933259bb258?w=1080&q=85&fit=crop",
    # Generic warm golden temple interior
    "https://images.unsplash.com/photo-1534536281715-e28d76689b4d?w=1080&q=85&fit=crop",
]

for url in urls:
    print(f"Trying {url[:60]}...", end=" ", flush=True)
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=20) as r:
            data = r.read()
        with open(dest, 'wb') as f:
            f.write(data)
        print(f"✓ {len(data)//1024} KB")
        break
    except Exception as e:
        print(f"✗ {e}")

