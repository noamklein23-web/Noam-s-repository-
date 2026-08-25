#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
remove_balmas.py — יוצר עותק זהה של קובץ PDF שבו סימון הסיווג «בלמ"ס» מוסר.

שימוש:
    pip install pymupdf
    python3 remove_balmas.py "לוח חשמל ראשי.pdf"                  # -> "לוח חשמל ראשי_ללא סיווג.pdf"
    python3 remove_balmas.py in.pdf -o out.pdf                     # שם פלט מפורש
    python3 remove_balmas.py in.pdf --report                       # רק דוח: איפה נמצא הסימון, בלי לכתוב קובץ
    python3 remove_balmas.py in.pdf --with-label                   # מסיר גם את המילה "סיווג:" שלצידו
    python3 remove_balmas.py in.pdf --no-fill                      # בלי ריבוע לבן (משאיר את הרקע כמו שהוא)

הטקסט באמת נמחק מזרם התוכן של ה-PDF (redaction), לא רק מוסתר.
עמודים סרוקים (תמונה בלבד) לא ניתנים לחיפוש טקסטואלי — הסקריפט ידווח עליהם בסוף.
"""

import argparse
import os
import sys

try:
    import fitz  # PyMuPDF
except ImportError:
    sys.exit("חסר PyMuPDF. התקן עם:  pip install pymupdf")

# גרשיים אפשריים: " (U+0022), ״ (U+05F4), ' (U+0027), ׳ (U+05F3)
_QUOTES = ['"', "״", "'", "׳", ""]

def _token_variants():
    """כל הכתיבים של בלמ\"ס — גם בסדר לוגי וגם בסדר ויזואלי (הפוך),
    כי ב-PDF רבים הטקסט העברי מאוחסן הפוך."""
    out = []
    for q in _QUOTES:
        logical = "בלמ" + q + "ס"
        out.append(logical)
        out.append(logical[::-1])   # סדר ויזואלי/הפוך
    # dedupe, שמירה על הסדר
    seen, uniq = set(), []
    for t in out:
        if t not in seen:
            seen.add(t)
            uniq.append(t)
    return uniq

TOKENS = _token_variants()
LABELS = ["סיווג:", "סיווג", ":גוויס", "גוויס"]  # לוגי + ויזואלי

def _patterns(with_label: bool):
    """דפוסי חיפוש, מהארוך לקצר — כדי לתפוס גם '- בלמ\"ס -' כמקטע אחד."""
    pats = []
    for t in TOKENS:
        pats.append("- " + t + " -")
        pats.append("-" + t + "-")
    if with_label:
        for lab in LABELS:
            for t in TOKENS:
                pats.append(lab + " " + t)
                pats.append(t + " " + lab)
    pats.extend(TOKENS)
    return pats

def _cluster(rects, gap=3.0):
    """RTL: search_for מחזיר ריבוע לכל תו — מאחדים תווים סמוכים למופע אחד."""
    out = []
    for r in sorted(rects, key=lambda r: (round(r.y0, 1), r.x0)):
        merged = False
        for i, c in enumerate(out):
            same_line = min(c.y1, r.y1) - max(c.y0, r.y0) > 0.5 * min(c.height, r.height)
            near = (r.x0 - c.x1 <= gap) and (c.x0 - r.x1 <= gap)
            if same_line and near:
                out[i] = c | r
                merged = True
                break
        if not merged:
            out.append(fitz.Rect(r))
    return out

_DASHES = {"-", "\u2013", "\u2014", "\u2212", "\u05be"}

def _adjacent_dashes(page, clusters, gap=22.0):
    """מקפים בודדים שעוטפים את הסימון (למשל '- בלמ\"ס -') — מוסרים גם אותם."""
    res = []
    words = page.get_text("words")
    for w in words:
        x0, y0, x1, y1, txt = w[0], w[1], w[2], w[3], w[4]
        if txt.strip() not in _DASHES:
            continue
        r = fitz.Rect(x0, y0, x1, y1)
        for c in clusters:
            same_line = min(c.y1, r.y1) - max(c.y0, r.y0) > 0.4 * min(c.height, r.height)
            near = (r.x0 - c.x1 <= gap) and (c.x0 - r.x1 <= gap)
            if same_line and near:
                res.append(r)
                break
    return res

def clean(src_path, out_path, with_label=False, fill=True, report_only=False, keep_dashes=False):
    doc = fitz.open(src_path)
    total = 0
    per_page = {}
    no_text_pages = []
    pats = _patterns(with_label)

    for pno, page in enumerate(doc, start=1):
        if not page.get_text("text").strip():
            no_text_pages.append(pno)
            continue
        found = []
        for pat in pats:
            try:
                found.extend(q.rect for q in page.search_for(pat, quads=True))
            except Exception:
                continue
        if not found:
            continue
        clusters = _cluster(found)
        targets = list(clusters)
        if not keep_dashes:
            targets += _adjacent_dashes(page, clusters)

        per_page[pno] = len(clusters)
        total += len(clusters)

        if not report_only:
            for r in targets:
                page.add_redact_annot(r, fill=(1, 1, 1) if fill else None)
            # מוחק את הטקסט בלבד; לא נוגע בתמונות או בקווי הציור
            page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE)

    print("סה\"כ מופעים שנמצאו: %d, ב-%d עמודים" % (total, len(per_page)))
    if per_page:
        items = list(per_page.items())
        preview = ", ".join("עמ' %d (x%d)" % (p, n) for p, n in items[:25])
        print("  " + preview + (" ..." if len(items) > 25 else ""))
    if no_text_pages:
        print("עמודים ללא שכבת טקסט (סרוקים? לא נבדקו): %s"
              % (", ".join(map(str, no_text_pages[:25])) + (" ..." if len(no_text_pages) > 25 else "")))

    if report_only:
        doc.close()
        return total

    doc.save(out_path, garbage=4, deflate=True)
    doc.close()
    print("נשמר: %s (%.1f MB)" % (out_path, os.path.getsize(out_path) / 1e6))
    return total

def main():
    ap = argparse.ArgumentParser(description='הסרת סימון הסיווג בלמ"ס מקובץ PDF')
    ap.add_argument("input", help="קובץ ה-PDF המקורי")
    ap.add_argument("-o", "--output", help="קובץ הפלט (ברירת מחדל: <שם>_ללא סיווג.pdf)")
    ap.add_argument("--with-label", action="store_true", help='להסיר גם את המילה "סיווג:" הצמודה')
    ap.add_argument("--no-fill", action="store_true", help="לא לצייר ריבוע לבן במקום הטקסט")
    ap.add_argument("--keep-dashes", action="store_true", help="להשאיר את המקפים שעוטפים את הסימון")
    ap.add_argument("--report", action="store_true", help="רק לדווח היכן הסימון מופיע, בלי לכתוב קובץ")
    a = ap.parse_args()

    out = a.output
    if not out:
        base, ext = os.path.splitext(a.input)
        out = base + "_ללא סיווג" + (ext or ".pdf")
    if not a.report and os.path.abspath(out) == os.path.abspath(a.input):
        sys.exit("קובץ הפלט זהה לקלט — בחר שם אחר עם -o")

    n = clean(a.input, out, with_label=a.with_label, fill=not a.no_fill,
              report_only=a.report, keep_dashes=a.keep_dashes)
    if n == 0:
        print('לא נמצא אף מופע של בלמ"ס בשכבת הטקסט.')

if __name__ == "__main__":
    main()
