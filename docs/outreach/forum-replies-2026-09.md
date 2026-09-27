# Forum replies — September 2026

Drafts only; not posted. One reply per forum, in threads where someone asked for this kind of tool and it hasn't been answered.
Checked on 27 Sep 2026: both threads are open, with no "don't revive" notice.

---

## 1. Zotero forums: "Adding new style request: New Zealand Law Style Guide"

https://forums.zotero.org/discussion/102632/adding-new-style-request-new-zealand-law-style-guide

Context: an NZ law librarian asked for an NZLSG style in 2023. In March 2025 someone asked for "updates… or nearest alternative". In October 2025 jodaar shared an unofficial NZLSG 3rd ed style through the University of Canterbury LibGuides, and was invited to submit it to the official repository.

Why this is on-topic: the reply points people to the Zotero option first. Obiter imports Zotero exports, so it works alongside Zotero rather than replacing it.

> Adding this for anyone who lands here looking for the "nearest alternative" asked about above. For Zotero itself, jodaar's NZLSG 3rd ed style via the University of Canterbury LibGuides is the one to use. Thanks for making it, and it would be great to see it in the official repository.
>
> If you write in Word and don't mind a separate tool, I develop Obiter, a free, open-source (GPLv3) Word add-in. It formats NZLSG 3rd ed footnotes, including subsequent references and the bibliography, as you write. It can import a Zotero library exported as CSL-JSON, RIS or BibTeX, so you can keep collecting in Zotero. It's on Microsoft AppSource, and the source is at https://github.com/karwalski/obiter.
>
> One caveat: it follows the 3rd edition. A 4th edition looks to be on its way, and I'll update Obiter once it's published.

Before posting:
- NZLSG 4th ed: checked 27 Sep 2026 and it's still unpublished (`docs/research/nzlsg4-watch-2026-09.md`), so the "follows the 3rd edition" wording stands. Recheck before posting.
- Check that CSL-JSON, RIS and BibTeX import handles a real Zotero NZ export (Māori Land Court and Waitangi Tribunal items).

---

## 2. The Student Room: "Help with Oscola Referencing"

https://www.thestudentroom.co.uk/showthread.php?t=7499132

Context: about two years ago the poster asked for accurate OSCOLA reference generators. The only reply recommends Cite This For Me and RefME. RefME shut down in 2017.

> Late reply, but for anyone finding this thread now: RefME closed in 2017, so that suggestion no longer works. Whatever tool you use, check its output against the free OSCOLA guide from Oxford's Faculty of Law. Generators most often go wrong on the position-dependent parts (repeat citations and cross-references to earlier footnotes) rather than on first citations.
>
> Disclosure: I built a free tool for this, so weigh my opinion accordingly. Obiter is an open-source Microsoft Word add-in. It formats OSCOLA footnotes as you write, keeps subsequent references in step when you reorder footnotes, and generates the table of cases, the table of legislation and the bibliography. It's on Microsoft AppSource, or see obiter.com.au. It was built mainly for the Australian style (AGLC4), so feedback from OSCOLA users is very welcome.

Before posting:
- The claim about the tables of cases and legislation has been checked: the OSCOLA bibliography builds both, in `src/engine/rules/oscola/tables.ts`, called from `rules/v4/general/bibliography.ts`.
- The Student Room's rules only allow links for disclosed personal interest. A new account's post with a link may be held for moderation; that's normal.

---

## Not recommended

Everything else from the research, and why:
- Other Zotero AGLC4 and OSCOLA threads: already solved or marked "don't revive".
- The CSL styles GitHub repository: it's for style files only.
- Whirlpool: the only AGLC thread is archived.
- Microsoft Q&A, Quora and Stack Exchange: no relevant threads.

Reddit couldn't be checked, because it blocks automated access. Search while signed in and only reply to threads under about six months old. In r/auslaw, a disclosed post of your own is better than reviving a thread.
