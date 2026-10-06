#!/usr/bin/env python3
"""Pack the COURT-105 synthetic Flat OPC fixtures into .docx files.

Standard library only. Reads every tests/fixtures/ooxml/*.xml (Flat OPC:
one <pkg:part> per package part), writes each part into a ZIP with a
[Content_Types].xml built from the parts' declared content types, and saves
<out>/<name>.docx. The output is for device tests (COURT-104 log) and for
running scripts/research/inspect_ooxml.py over the same structures; it is
never committed (the Flat OPC sources are the fixtures).

The fixtures are synthetic: no court bytes, no court text, no personal
names. Word opens the .xml sources directly as well.

Usage: python3 build_ooxml_fixtures.py [--src DIR] [--out DIR]
Defaults: --src tests/fixtures/ooxml, --out a temporary directory (printed).
"""
import os
import re
import sys
import tempfile
import zipfile
import xml.etree.ElementTree as ET

CT = "http://schemas.openxmlformats.org/package/2006/content-types"
# Fixed ZIP timestamp, as Word writes, so rebuilt files are byte-stable.
EPOCH = (1980, 1, 1, 0, 0, 0)


PART_RE = re.compile(
    r'<pkg:part\s+pkg:name="([^"]+)"\s+pkg:contentType="([^"]+)"[^>]*>\s*'
    r"<pkg:xmlData>(.*?)</pkg:xmlData>\s*</pkg:part>",
    re.S,
)


def parts_of(path):
    """(part name, content type, bytes) for each part of a Flat OPC file.

    Each part's XML is copied as written (not re-serialised), so namespace
    prefixes stay exactly as Word expects them; every part root declares its
    own namespaces, so the copied text is a standalone document.
    """
    ET.parse(path)  # well-formedness check
    text = open(path, encoding="utf-8").read()
    out = []
    for name, ctype, body in PART_RE.findall(text):
        xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + body.strip()
        out.append((name, ctype, xml.encode("utf-8")))
    return out


def content_types(parts):
    ET.register_namespace("", CT)
    types = ET.Element("{%s}Types" % CT)
    ET.SubElement(types, "{%s}Default" % CT, Extension="rels",
                  ContentType="application/vnd.openxmlformats-package.relationships+xml")
    ET.SubElement(types, "{%s}Default" % CT, Extension="xml", ContentType="application/xml")
    for name, ctype, _ in parts:
        if name.endswith(".rels") or ctype == "application/xml":
            continue
        ET.SubElement(types, "{%s}Override" % CT, PartName=name, ContentType=ctype)
    return ET.tostring(types, encoding="UTF-8", xml_declaration=True)


def write_docx(parts, dest):
    with zipfile.ZipFile(dest, "w", zipfile.ZIP_DEFLATED) as z:
        info = zipfile.ZipInfo("[Content_Types].xml", EPOCH)
        z.writestr(info, content_types(parts), zipfile.ZIP_DEFLATED)
        for name, _, body in parts:
            z.writestr(zipfile.ZipInfo(name.lstrip("/"), EPOCH), body, zipfile.ZIP_DEFLATED)


def main(argv):
    here = os.path.dirname(os.path.abspath(__file__))
    src = os.path.normpath(os.path.join(here, "..", "..", "tests", "fixtures", "ooxml"))
    out = None
    i = 0
    while i < len(argv):
        if argv[i] == "--src":
            src = argv[i + 1]
            i += 2
        elif argv[i] == "--out":
            out = argv[i + 1]
            i += 2
        else:
            sys.exit("unknown argument: %s" % argv[i])
    out = out or tempfile.mkdtemp(prefix="obiter-ooxml-fixtures-")
    os.makedirs(out, exist_ok=True)
    for fname in sorted(os.listdir(src)):
        if not fname.endswith(".xml"):
            continue
        dest = os.path.join(out, fname[:-4] + ".docx")
        write_docx(parts_of(os.path.join(src, fname)), dest)
        print(dest)


if __name__ == "__main__":
    main(sys.argv[1:])
