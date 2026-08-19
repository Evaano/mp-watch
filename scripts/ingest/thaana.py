# -*- coding: utf-8 -*-
"""Thaana helpers: visual-order repair, romanisation, and slugs.

Kept separate from the extractor so every future ingest source can reuse it.
"""
import re
import unicodedata

# Consonants (akuru). Alifu carries no sound of its own.
CONSONANTS = {
    0x780: 'h',  0x781: 'sh', 0x782: 'n',  0x783: 'r',  0x784: 'b',
    0x785: 'lh', 0x786: 'k',  0x787: '',   0x788: 'v',  0x789: 'm',
    0x78A: 'f',  0x78B: 'dh', 0x78C: 'th', 0x78D: 'l',  0x78E: 'g',
    0x78F: 'gn', 0x790: 's',  0x791: 'd',  0x792: 'z',  0x793: 't',
    0x794: 'y',  0x795: 'p',  0x796: 'j',  0x797: 'ch',
    # Thikijehi akuru, used for Arabic loanwords and most formal names.
    0x798: 'th', 0x799: 'h',  0x79A: 'kh', 0x79B: 'dh', 0x79C: 'z',
    0x79D: 'sh', 0x79E: 's',  0x79F: 'z',  0x7A0: 't',  0x7A1: 'z',
    0x7A2: '',   0x7A3: 'gh', 0x7A4: 'q',  0x7A5: 'w',
}

# Vowels (fili). Sukun (0x7B0) marks the absence of a vowel.
VOWELS = {
    0x7A6: 'a',  0x7A7: 'aa', 0x7A8: 'i',  0x7A9: 'ee', 0x7AA: 'u',
    0x7AB: 'oo', 0x7AC: 'e',  0x7AD: 'ey', 0x7AE: 'o',  0x7AF: 'oa',
    0x7B0: '',
}

# Honorifics the Majlis uses in front of member names.
TITLES = {
    'އަލްފާޟިލް': 'Alfaazil',
    'އަލްފާޟިލާ': 'Alfaazilaa',
    'ޑޮކްޓަރ': 'Dr',
    'އަލްއުސްތާޛު': 'Al-Ustaz',
    'އަލްއުސްތާޛާ': 'Al-Ustaza',
    'އައްޝައިޚް': 'Al-Sheikh',
}


def repair_visual_order(word):
    """The Majlis PDFs emit Thaana runs character-reversed. Undo that."""
    return word[::-1]


def romanise(text):
    """Approximate Latin transliteration, good enough for slugs and search."""
    out = []
    for ch in text:
        cp = ord(ch)
        if cp in CONSONANTS:
            out.append(CONSONANTS[cp])
        elif cp in VOWELS:
            out.append(VOWELS[cp])
        elif ch.isspace():
            out.append(' ')
        elif ch == 'ا' or cp == 0xFDF2:  # stray Arabic in names like ﷲ
            out.append('ullah')
        elif ch.isalnum():
            out.append(ch)
    return re.sub(r'\s+', ' ', ''.join(out)).strip()


def slugify(text):
    base = romanise(text) if any(0x780 <= ord(c) <= 0x7B1 for c in text) else text
    base = unicodedata.normalize('NFKD', base).encode('ascii', 'ignore').decode()
    base = re.sub(r'[^a-zA-Z0-9]+', '-', base).strip('-').lower()
    return re.sub(r'-{2,}', '-', base)


def split_title(name):
    """Return (latin_title, thaana_title, bare_name).

    Both forms are kept. The Latin label is for English display; the original
    Thaana honorific is what a Dhivehi page must show, since transliterating it
    back would print "Alfaazil" in the middle of a Thaana name.
    """
    parts = name.split()
    if parts and parts[0] in TITLES:
        return TITLES[parts[0]], parts[0], ' '.join(parts[1:])
    return None, None, name


# Thikijehi (Arabic-derived) letters and their plain Thaana counterparts.
# Maldivian official documents disagree on which to use for the same name:
# the Majlis roster writes Mahloof with 0x799, the premium disclosure writes it
# with 0x79A. Folding these is an orthographic equivalence, in the same spirit
# as case folding, not fuzzy matching.
FOLD = {
    0x798: 0x78C,  # thaa   -> thaviyani
    0x799: 0x780,  # haa    -> haa
    0x79A: 0x780,  # khaa   -> haa
    0x79B: 0x78B,  # dhaalu -> dhaalu
    0x79C: 0x792,  # zaa    -> zaviyani
    0x79D: 0x781,  # sheenu -> shaviyani
    0x79E: 0x790,  # saadhu -> seenu
    0x79F: 0x792,  # daadhu -> zaviyani
    0x7A0: 0x78C,  # to     -> thaviyani
    0x7A1: 0x792,  # zo     -> zaviyani
    0x7A2: 0x787,  # ainu   -> alifu
    0x7A3: 0x78E,  # ghainu -> gaafu
    0x7A4: 0x78E,  # qaafu  -> gaafu
    0x7A5: 0x788,  # waavu  -> vaavu
}


# Fili (vowel marks) also vary between official documents: the roster writes
# Muaz as 'ZAVIYANI + sukun', the disclosure as 'ZAVIYANI + u'. Dropping fili
# leaves a consonant skeleton. Measured against the two sources we hold, this
# gains 8 further matches and adds no new key collisions, so it is safe to use
# alongside an exact constituency match.
FILI = re.compile('[ަ-ް]')


def fold_for_match(text):
    """Normalise a name or place for comparison only. Never for display.

    Folds thikijehi letters to their plain counterparts and drops fili, so two
    government spellings of the same name compare equal.
    """
    folded = ''.join(chr(FOLD.get(ord(c), ord(c))) for c in text or '')
    return re.sub(r'\s+', ' ', FILI.sub('', folded)).strip()
