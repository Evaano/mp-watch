# -*- coding: utf-8 -*-
"""Read a PDF table by geometry rather than by reading order.

`page.extract_text()` runs cells together and gives no way to tell which
column a value came from, which is how the 20th-Majlis RTI extraction ended
up with every constituency inverted. Everything here works from word
coordinates instead, so a column is a position on the page and not a position
in a token list.
"""


def cluster(items, key, tol):
    """Group items whose key values sit within `tol` of each other."""
    out = []
    for it in sorted(items, key=key):
        if out and abs(key(it) - key(out[-1][-1])) <= tol:
            out[-1].append(it)
        else:
            out.append([it])
    return out


def merge_words(words, gap=1.6):
    """Glue tokens the PDF split mid-value, e.g. '2' + '4,000' -> '24,000'."""
    out = []
    for w in sorted(words, key=lambda w: w['x0']):
        if out and w['x0'] - out[-1]['x1'] <= gap:
            out[-1] = {'x0': out[-1]['x0'], 'x1': w['x1'],
                       'text': out[-1]['text'] + w['text']}
        else:
            out.append({'x0': w['x0'], 'x1': w['x1'], 'text': w['text']})
    return out


def bands(page, tol=3, gap=1.6):
    """The page's words as rows, top to bottom, each merged left to right."""
    return [merge_words(b, gap)
            for b in cluster(page.extract_words(), lambda w: w['top'], tol)]
