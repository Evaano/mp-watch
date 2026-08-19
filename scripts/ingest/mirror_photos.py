"""Mirror member portraits into the repo.

The Majlis serves the portraits from behind Cloudflare, which answers 403 to
Vercel's image optimiser (the browser is let through, the datacentre is not).
Hotlinking also puts a hit on a government server for every reader we get, and
leaves the site one silent file move away from a page of grey squares.

So we take a copy. Run this after build_graph.py; it reads the graph, writes
square WebP thumbnails to public/members/, and records what it managed to fetch
in a manifest the registry reads. A person missing from the manifest falls back
to the initial-letter placeholder rather than to the remote URL, so a failure
here shows up at build time instead of in production.
"""

import json
import pathlib
import sys
import urllib.request

from PIL import Image, ImageOps

ROOT = pathlib.Path(__file__).resolve().parents[2]
GRAPH = ROOT / "src" / "data" / "graph.json"
OUT_DIR = ROOT / "public" / "members"
MANIFEST = ROOT / "src" / "data" / "photo-manifest.json"

# Largest render is the 144px profile portrait on a 2x screen.
SIZE = 320
UA = "Mozilla/5.0 (compatible; mp-watch-ingest/1.0; +https://github.com/evaano/mp-watch)"


def fetch(url):
    request = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read()


def main():
    graph = json.loads(GRAPH.read_text(encoding="utf-8"))
    people = [p for p in graph["persons"] if p.get("photoUrl")]
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    manifest, failures = {}, []
    for person in people:
        name = f"{person['id']}.webp"
        target = OUT_DIR / name
        if not target.exists():
            try:
                raw = fetch(person["photoUrl"])
            except Exception as error:  # noqa: BLE001 - reported, not swallowed
                failures.append((person["id"], repr(error)))
                continue
            image = Image.open(__import__("io").BytesIO(raw)).convert("RGB")
            # Crop to a square from the centre: the cards are circles, and a
            # letterboxed portrait inside a circle loses the face.
            ImageOps.fit(image, (SIZE, SIZE), Image.LANCZOS).save(
                target, "WEBP", quality=82, method=6
            )
        manifest[person["id"]] = f"/members/{name}"

    MANIFEST.write_text(
        json.dumps(dict(sorted(manifest.items())), indent=2) + "\n", encoding="utf-8"
    )

    total = sum(f.stat().st_size for f in OUT_DIR.glob("*.webp"))
    print(f"mirrored {len(manifest)} of {len(people)} portraits, {total / 1e6:.1f} MB")
    for person_id, error in failures:
        print(f"  FAILED {person_id}: {error}", file=sys.stderr)
    if failures:
        raise SystemExit(f"ABORT: {len(failures)} portraits could not be fetched")


if __name__ == "__main__":
    main()
