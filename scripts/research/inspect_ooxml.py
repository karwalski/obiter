#!/usr/bin/env python3
"""Read-only OOXML (DOCX/DOTX/DOCM/DOTM) inspector for court-document corpus research.

Standard library only. Opens the package as a ZIP; never executes macros, never
resolves external relationships. Personal identifiers (creator, lastModifiedBy,
revision authors, comment authors, file paths) are redacted.

Usage: python3 inspect_ooxml.py FILE [FILE ...] [--out DIR] [--text]
Emits one JSON document per file (stdout, or DIR/<basename>.json).
Footnote text is left out by default (--no-text, COURT-105), so the JSON can
be kept without copying document content. --text includes it for private,
local analysis only; never commit JSON produced with --text.
Non-OOXML inputs (e.g. RTF) get a minimal record with a format note.
"""
import hashlib
import json
import os
import re
import sys
import zipfile
from collections import Counter
from urllib.parse import urlparse
import xml.etree.ElementTree as ET

W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PR = "http://schemas.openxmlformats.org/package/2006/relationships"
CP = "http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
EP = "http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
CUSTP = "http://schemas.openxmlformats.org/officeDocument/2006/custom-properties"
VT = "http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"
DC = "http://purl.org/dc/elements/1.1/"
DCT = "http://purl.org/dc/terms/"


def q(ns, tag):
    return "{%s}%s" % (ns, tag)


def wattr(el, name):
    return el.get(q(W, name))


def redact_path(target):
    if not target:
        return target
    t = target
    if re.match(r"^(file:|[A-Za-z]:\\|\\\\|/)", t) or "\\" in t:
        base = re.split(r"[\\/]", t)[-1]
        return "[path]/" + base if base else "[path]"
    return t


def parse(z, name):
    try:
        return ET.fromstring(z.read(name))
    except (KeyError, ET.ParseError):
        return None


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def sniff(path):
    with open(path, "rb") as f:
        head = f.read(8)
    if head.startswith(b"PK"):
        return "zip/ooxml"
    if head.startswith(b"{\\rtf"):
        return "rtf"
    if head.startswith(b"\xd0\xcf\x11\xe0"):
        return "ole2 (legacy .doc)"
    if head.startswith(b"%PDF"):
        return "pdf"
    return "unknown"


def doc_props(z):
    out = {}
    app = parse(z, "docProps/app.xml")
    if app is not None:
        for tag in ("Application", "AppVersion", "Template", "DocSecurity", "Pages", "Words"):
            el = app.find(q(EP, tag))
            if el is not None and el.text is not None:
                out[tag] = el.text if tag != "Template" else redact_path(el.text)
    core = parse(z, "docProps/core.xml")
    if core is not None:
        c = {}
        for ns, tag in ((DC, "creator"), (CP, "lastModifiedBy")):
            el = core.find(q(ns, tag))
            c[tag + "_present"] = bool(el is not None and (el.text or "").strip())
        for ns, tag in ((DCT, "created"), (DCT, "modified"), (CP, "revision")):
            el = core.find(q(ns, tag))
            if el is not None:
                c[tag] = el.text
        el = core.find(q(DC, "title"))
        c["title_present"] = bool(el is not None and (el.text or "").strip())
        out["core"] = c
    cust = parse(z, "docProps/custom.xml")
    if cust is not None:
        # record property NAMES only (values may carry identities/paths)
        out["custom_property_names"] = sorted(
            p.get("name") for p in cust.findall(q(CUSTP, "property")))
    return out


def rels(z):
    out = {"by_type": Counter(), "external": [], "attachedTemplate": None}
    for name in z.namelist():
        if not name.endswith(".rels"):
            continue
        root = parse(z, name)
        if root is None:
            continue
        for rel in root.findall(q(PR, "Relationship")):
            typ = rel.get("Type", "").rsplit("/", 1)[-1]
            out["by_type"][typ] += 1
            if typ == "attachedTemplate":
                out["attachedTemplate"] = redact_path(rel.get("Target"))
            if rel.get("TargetMode") == "External" and typ != "hyperlink":
                out["external"].append({"type": typ, "target": redact_path(rel.get("Target"))})
    out["by_type"] = dict(out["by_type"])
    return out


def hyperlink_domains(z):
    doms = Counter()
    n = 0
    for name in z.namelist():
        if not name.endswith(".rels"):
            continue
        root = parse(z, name)
        if root is None:
            continue
        for rel in root.findall(q(PR, "Relationship")):
            if rel.get("Type", "").endswith("/hyperlink"):
                n += 1
                t = rel.get("Target", "")
                d = urlparse(t).netloc.lower() or ("mailto" if t.startswith("mailto:") else "(non-http)")
                doms[d] += 1
    return n, dict(doms.most_common())


FIELD_RE = re.compile(r"^\s*([A-Za-z]+)")


def collect_fields(root):
    """Return list of field instruction strings (simple + complex, joined across runs)."""
    instrs = []
    for fs in root.iter(q(W, "fldSimple")):
        instrs.append(wattr(fs, "instr") or "")
    # complex fields: walk runs in document order with a stack
    stack = []
    for el in root.iter():
        if el.tag == q(W, "fldChar"):
            t = wattr(el, "fldCharType")
            if t == "begin":
                stack.append([])
            elif t == "separate" and stack:
                stack[-1].append(None)  # marker: instruction finished
            elif t == "end" and stack:
                parts = stack.pop()
                instrs.append("".join(p for p in parts if p is not None))
        elif el.tag == q(W, "instrText") and stack:
            if None not in stack[-1]:
                stack[-1].append(el.text or "")
    return instrs


def text_of(el):
    parts = []
    for node in el.iter():
        if node.tag == q(W, "t") and node.text:
            parts.append(node.text)
        elif node.tag == q(W, "tab"):
            parts.append("\t")
        elif node.tag in (q(W, "br"), q(W, "cr")):
            parts.append(" ")
        elif node.tag == q(W, "delText"):
            pass
    return "".join(parts)


def para_texts(el):
    return [text_of(p) for p in el.iter(q(W, "p"))]


# --- citation statistics -------------------------------------------------
MNC = re.compile(r"\[(\d{4})\]\s+([A-Z][A-Za-z]*(?:[A-Z][A-Za-z]*)*)\s+(\d+)")
REPORT_SQ = re.compile(r"\[\d{4}\]\s+\d*\s*(?:AC|QB|KB|Ch|WLR|All ER|UKHL|NSWLR|VR|Qd R|SASR|WAR|Tas R|AC)\b")
REPORT_RD = re.compile(r"\(\d{4}\)\s+\d+\s+(?:CLR|ALR|FCR|ALJR|FLR|Fam LR|IR|ALD|ATR|ACSR|NSWLR|VR|SASR|WAR|ACTR|NTLR|IPR|AILR|LGERA|FLC|ACLC|Qd R|NSWR|A Crim R|MVR|ATC|ACLR|BPR|AAR)\b")
REPORT_GENERIC = re.compile(r"\(\d{4}\)\s+\d+\s+[A-Z][A-Za-z ]{0,12}\s+\d+")
NREF = re.compile(r"\(n\s+\d+")
ABOVE_N = re.compile(r"\babove\s+n\s*\d+", re.I)
AT_SQ = re.compile(r"\bat\s+\[\d+")
BARE_SQ_PIN = re.compile(r"(?<!\d{4})\]\s*(?:\d+\s*)?,?\s*\[\d+\]|\s\[\d{1,4}\](?:[-–]\[\d+\])?")
AT_PAGE = re.compile(r"\bat\s+\d+")
P_PP = re.compile(r"\b(?:p|pp)\s*\.?\s*\d+")
PARA = re.compile(r"\b(?:para|paras)\.?\s+\d+")
SIGNAL = re.compile(r"^\s*(?:See(?:\s+also|\s+generally)?|Cf|cf|Compare|But see|E\.?g\.?|See,?\s+eg)\b")
IBID = re.compile(r"\b[Ii]bid\b")
ID = re.compile(r"\bId\b\s+at")
SUPRA = re.compile(r"\bsupra\b", re.I)
LOC_CIT = re.compile(r"\b(?:op\.?\s*cit|loc\.?\s*cit)\b", re.I)
TRANSCRIPT = re.compile(r"\b(?:T|Tr|Transcript)\s*\d+[.:/]\d+|\bT\s?\d+\.\d+")
EXHIBIT = re.compile(r"\b(?:Exhibit|Ex)\s+[A-Z]?\d+|\bCB\s?\d+|\bAB\s?\d+|\b[A-Z]{1,3}B\s+\d+")
STATUTE = re.compile(r"\b(?:Act|Rules|Regulations?)\s+\d{4}\b(?:\s*\((?:Cth|NSW|Vic|Qld|WA|SA|Tas|ACT|NT)\))?")
ITALIC_V = re.compile(r"\sv\s")


def note_stats(notes):
    s = Counter()
    mnc_courts = Counter()
    for n in notes:
        t = n.strip()
        if not t:
            s["empty"] += 1
            continue
        s["notes_nonempty"] += 1
        if IBID.search(t):
            s["ibid"] += 1
        if re.match(r"^\s*[Ii]bid\b", t):
            s["ibid_note_initial"] += 1
        if ID.search(t):
            s["id_at"] += 1
        if NREF.search(t):
            s["n_crossref"] += 1
        if ABOVE_N.search(t):
            s["above_n"] += 1
        if SUPRA.search(t):
            s["supra"] += 1
        if LOC_CIT.search(t):
            s["op_loc_cit"] += 1
        if AT_SQ.search(t):
            s["at_sq_pin"] += 1
        if BARE_SQ_PIN.search(t):
            s["bare_sq_pin"] += 1
        if AT_PAGE.search(t):
            s["at_page_pin"] += 1
        if P_PP.search(t):
            s["p_pp"] += 1
        if PARA.search(t):
            s["para_word"] += 1
        m = MNC.findall(t)
        if m:
            s["has_mnc"] += 1
            for _, court, _ in m:
                mnc_courts[court] += 1
        rep = REPORT_RD.search(t) or REPORT_SQ.search(t) or REPORT_GENERIC.search(t)
        if rep:
            s["has_report"] += 1
        if m and rep:
            s["mnc_and_report"] += 1
        if SIGNAL.search(t):
            s["signal_initial"] += 1
        if re.search(r"\b(?:See|Cf|cf)\b", t):
            s["signal_any"] += 1
        if TRANSCRIPT.search(t):
            s["transcript_ref"] += 1
        if EXHIBIT.search(t):
            s["exhibit_or_book_ref"] += 1
        if STATUTE.search(t):
            s["statute"] += 1
        cite_like = bool(m or rep or STATUTE.search(t) or ITALIC_V.search(t) or IBID.search(t))
        words = len(t.split())
        sentences = len(re.findall(r"[a-z][.!?](?:\s|$)", t))
        if cite_like and (sentences >= 2 or (words > 25 and re.search(r"\b(?:is|was|that|which|the|because)\b", t))):
            s["prose_plus_citation"] += 1
        elif not cite_like:
            s["no_citation_detected"] += 1
        if t.count(";") >= 1 and (len(m) >= 2 or (m and rep)):
            s["multi_authority_semicolon"] += 1
    return dict(s), dict(mnc_courts.most_common(25))


def body_inline_stats(body_paras):
    text = "\n".join(body_paras)
    return {
        "mnc_in_body": len(MNC.findall(text)),
        "report_in_body": len(REPORT_RD.findall(text)) + len(REPORT_GENERIC.findall(text)),
        "at_sq_in_body": len(AT_SQ.findall(text)),
        "ibid_in_body": len(IBID.findall(text)),
        "above_n_in_body": len(ABOVE_N.findall(text)),
        "n_crossref_in_body": len(NREF.findall(text)),
        "paren_mnc_in_body": len(re.findall(r"\([^()]*\[\d{4}\][^()]*\)", text)),
    }


def inspect_ooxml(path):
    rec = {}
    with zipfile.ZipFile(path) as z:
        names = z.namelist()
        rec["parts_count"] = len(names)
        rec["vba_present"] = any(n.lower().endswith("vbaproject.bin") for n in names)
        rec["docProps"] = doc_props(z)
        rec["relationships"] = rels(z)
        hl_n, hl_dom = hyperlink_domains(z)
        rec["hyperlinks_rel_count"] = hl_n
        rec["hyperlink_domains"] = hl_dom
        # customXml
        cx = []
        for n in names:
            if n.startswith("customXml/") and re.match(r"customXml/item\d+\.xml$", n):
                root = parse(z, n)
                ns = root.tag.split("}")[0].strip("{") if root is not None and root.tag.startswith("{") else (root.tag if root is not None else "unparseable")
                cx.append(ns)
        rec["customXml_root_namespaces"] = cx
        rec["embedded_objects"] = [n.split("/")[-1].rsplit(".", 1)[-1] for n in names if "/embeddings/" in n]
        rec["media_count"] = sum(1 for n in names if "/media/" in n)
        rec["has_people_part"] = "word/people.xml" in names
        rec["webextensions"] = [n for n in names if n.startswith("word/webextensions/") or n.startswith("webextensions/")]
        bib = 0
        bib_present = False
        for n in names:
            if re.match(r"customXml/item\d+\.xml$", n):
                root = parse(z, n)
                if root is not None and root.tag == "{http://schemas.openxmlformats.org/officeDocument/2006/bibliography}Sources":
                    bib_present = True
                    bib += len(root.findall("{http://schemas.openxmlformats.org/officeDocument/2006/bibliography}Source"))
        rec["bibliography_sources_entries"] = bib

        doc = parse(z, "word/document.xml")
        fn = parse(z, "word/footnotes.xml")
        en = parse(z, "word/endnotes.xml")
        styles = parse(z, "word/styles.xml")
        numbering = parse(z, "word/numbering.xml")
        comments = parse(z, "word/comments.xml")
        settings = parse(z, "word/settings.xml")

        # styles
        style_names = {}
        custom_styles = []
        if styles is not None:
            for st in styles.findall(q(W, "style")):
                sid = wattr(st, "styleId")
                nm = st.find(q(W, "name"))
                style_names[sid] = wattr(nm, "val") if nm is not None else sid
                if wattr(st, "customStyle") == "1":
                    custom_styles.append(style_names[sid])
        rec["styles_defined"] = len(style_names)
        rec["custom_styles"] = sorted(custom_styles)

        def style_usage(root):
            c = Counter()
            if root is None:
                return {}
            for tag in ("pStyle", "rStyle"):
                for el in root.iter(q(W, tag)):
                    c[style_names.get(wattr(el, "val"), wattr(el, "val"))] += 1
            return dict(c.most_common(40))

        rec["style_usage_body"] = style_usage(doc)
        rec["style_usage_footnotes"] = style_usage(fn)

        if numbering is not None:
            rec["numbering"] = {
                "abstractNum": len(numbering.findall(q(W, "abstractNum"))),
                "num": len(numbering.findall(q(W, "num"))),
            }
        if settings is not None:
            at = settings.find(q(W, "attachedTemplate"))
            rec["settings_attachedTemplate_rid"] = wattr(at, "id") if at is not None else None
            rec["settings_flags"] = sorted({el.tag.split("}")[1] for el in settings if el.tag.startswith("{" + W)} & {
                "trackRevisions", "documentProtection", "updateFields", "linkStyles", "attachedSchema",
                "doNotTrackMoves", "removePersonalInformation", "rsids", "docVars", "mailMerge"})
            dv = settings.find(q(W, "docVars"))
            rec["docVar_names"] = sorted(wattr(v, "name") for v in dv.findall(q(W, "docVar"))) if dv is not None else []

        # parts with fields: body, foot/endnotes, headers/footers
        all_instr = []
        hdrftr = [n for n in names if re.match(r"word/(header|footer)\d*\.xml$", n)]
        rec["headers_footers"] = len(hdrftr)
        for part in [doc, fn, en] + [parse(z, n) for n in hdrftr]:
            if part is not None:
                all_instr.extend(collect_fields(part))
        types = Counter()
        addin_samples = []
        for ins in all_instr:
            m = FIELD_RE.match(ins)
            ft = m.group(1).upper() if m else "(blank)"
            types[ft] += 1
            if ft in ("ADDIN", "CITATION", "BIBLIOGRAPHY", "TA", "TOA", "MACROBUTTON", "DOCVARIABLE", "DOCPROPERTY", "INCLUDETEXT", "LINK"):
                txt = re.sub(r'(?:[A-Za-z]:\\\\|\\\\\\\\|file:)[^"\s]*', '[path]', ins.strip())
                addin_samples.append(txt[:120])
        rec["field_types"] = dict(types.most_common())
        rec["field_marker_samples"] = sorted(set(addin_samples))[:20]

        if doc is not None:
            body = doc.find(q(W, "body"))
            rec["sections"] = len(list(doc.iter(q(W, "sectPr"))))
            rec["bookmarks"] = len(list(doc.iter(q(W, "bookmarkStart"))))
            bm_names = Counter()
            for b in doc.iter(q(W, "bookmarkStart")):
                nm = wattr(b, "name") or ""
                bm_names[re.sub(r"\d+$", "#", nm)[:20]] += 1
            rec["bookmark_name_patterns"] = dict(bm_names.most_common(12))
            rec["hyperlink_elements_body"] = len(list(doc.iter(q(W, "hyperlink"))))
            sdts = []
            for sdt in doc.iter(q(W, "sdt")):
                pr = sdt.find(q(W, "sdtPr"))
                tag = alias = None
                if pr is not None:
                    t = pr.find(q(W, "tag"))
                    a = pr.find(q(W, "alias"))
                    tag = wattr(t, "val") if t is not None else None
                    alias = wattr(a, "val") if a is not None else None
                    kinds = [c.tag.split("}")[1] for c in pr if c.tag.split("}")[1] not in ("rPr", "id", "tag", "alias", "placeholder", "showingPlcHdr", "lock")]
                else:
                    kinds = []
                xp = None
                if pr is not None and pr.find(q(W, "dataBinding")) is not None:
                    xp = wattr(pr.find(q(W, "dataBinding")), "xpath")
                sdts.append({"tag": tag, "alias": alias, "kind": kinds[:3], "dataBinding_xpath": xp})
            rec["content_controls"] = sdts[:40]
            rec["content_controls_count"] = len(sdts)
            rec["ins_count"] = len(list(doc.iter(q(W, "ins"))))
            rec["del_count"] = len(list(doc.iter(q(W, "del"))))
            rec["moves_count"] = len(list(doc.iter(q(W, "moveFrom")))) + len(list(doc.iter(q(W, "moveTo"))))
            rec["footnote_reference_runs_body"] = len(list(doc.iter(q(W, "footnoteReference"))))
            rec["endnote_reference_runs_body"] = len(list(doc.iter(q(W, "endnoteReference"))))
            rec["objects_in_body"] = len(list(doc.iter(q(W, "object"))))
            body_paras = para_texts(body) if body is not None else []
            rec["body_paragraphs"] = len(body_paras)
            rec["body_inline_citation_stats"] = body_inline_stats(body_paras)
            # leading paragraph-number style (e.g. "12" auto or typed)
        # footnotes
        notes = []
        if fn is not None:
            for f in fn.findall(q(W, "footnote")):
                if wattr(f, "type") in ("separator", "continuationSeparator", "continuationNotice"):
                    continue
                notes.append(" ".join(para_texts(f)).strip())
            if fn is not None:
                rec["footnote_ins_del"] = [len(list(fn.iter(q(W, "ins")))), len(list(fn.iter(q(W, "del"))))]
        rec["footnote_count"] = len(notes)
        en_count = 0
        if en is not None:
            en_count = sum(1 for e in en.findall(q(W, "endnote")) if wattr(e, "type") not in ("separator", "continuationSeparator", "continuationNotice"))
        rec["endnote_count"] = en_count
        rec["comments_count"] = len(comments.findall(q(W, "comment"))) if comments is not None else 0
        stats, mnc_courts = note_stats(notes)
        rec["footnote_citation_stats"] = stats
        rec["footnote_mnc_courts"] = mnc_courts
        rec["_footnotes_text"] = notes  # kept only with --text
    return rec


def inspect_rtf(path):
    data = open(path, "rb").read().decode("latin-1", "replace")
    rec = {"note": "RTF: OOXML inventory not applicable; control-word counts only"}
    rec["footnote_groups"] = len(re.findall(r"\{\\footnote", data)) + len(re.findall(r"\\footnote\b", data)) // 2
    rec["fields"] = len(re.findall(r"\\field\b", data))
    rec["fldinst_types"] = dict(Counter(m.upper() for m in re.findall(r"\\fldinst\s*\{?[^A-Za-z]*([A-Za-z]+)", data)).most_common())
    gen = re.search(r"\{\\\*\\generator ([^;}]*)", data)
    rec["generator"] = gen.group(1) if gen else None
    rec["has_info_author"] = bool(re.search(r"\\author\s", data))
    return rec


def main(argv):
    out_dir = None
    keep_text = False  # COURT-105: --no-text is the default
    files = []
    i = 0
    while i < len(argv):
        if argv[i] == "--out":
            out_dir = argv[i + 1]
            i += 2
            continue
        if argv[i] == "--no-text":
            keep_text = False
            i += 1
            continue
        if argv[i] == "--text":
            keep_text = True
            i += 1
            continue
        files.append(argv[i])
        i += 1
    for f in files:
        rec = {"file": os.path.basename(f), "sha256": sha256(f), "bytes": os.path.getsize(f), "format": sniff(f)}
        try:
            if rec["format"] == "zip/ooxml":
                rec.update(inspect_ooxml(f))
            elif rec["format"] == "rtf":
                rec.update(inspect_rtf(f))
        except Exception as e:  # report, don't crash the cohort run
            rec["error"] = repr(e)
        if not keep_text:
            rec.pop("_footnotes_text", None)
        js = json.dumps(rec, indent=1, ensure_ascii=False, default=str)
        if out_dir:
            os.makedirs(out_dir, exist_ok=True)
            with open(os.path.join(out_dir, os.path.basename(f) + ".json"), "w") as fh:
                fh.write(js)
        else:
            print(js)


if __name__ == "__main__":
    main(sys.argv[1:])
