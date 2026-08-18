# -*- coding: utf-8 -*-
"""Cached HTTP fetch.

Responses are cached under source/cache/ and committed, for the same reason
the source PDF is vendored: an ingest should reproduce byte for byte without
depending on a government site being up, or on it not having changed since.
Delete a cache file to refetch it.
"""
import hashlib
import io
import os
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, 'source', 'cache')

# The Majlis, Elections Commission and budget portals all 403 a default
# urllib agent.
UA = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36')


def cache_path(url):
    slug = url.split('//', 1)[-1].replace('/', '_').replace('?', '_')[:80]
    digest = hashlib.sha1(url.encode('utf-8')).hexdigest()[:8]
    return os.path.join(CACHE, f'{slug}.{digest}.html')


def get(url, refresh=False, delay=0.5):
    """Return the body of `url` as text, from cache when available."""
    path = cache_path(url)
    if not refresh and os.path.exists(path):
        return io.open(path, encoding='utf-8').read()

    os.makedirs(CACHE, exist_ok=True)
    request = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(request, timeout=60) as response:
        body = response.read().decode('utf-8', errors='replace')

    io.open(path, 'w', encoding='utf-8').write(body)
    time.sleep(delay)  # be a polite guest on a small government host
    return body
