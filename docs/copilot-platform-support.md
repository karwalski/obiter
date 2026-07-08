# Copilot skill — platform support & the Word-on-web execution gap

Research record (2026-07-08) explaining why the Obiter Copilot agent, when asked to cite a
source in **Word on the web**, produces the correct structured `insertCitation` call but
prints it as JSON instead of inserting a footnote — and what to test on desktop.

## What we observed (live, trial tenant, Word on the web)

- Add-in half loaded and current: pane reports **Obiter v1.14.3**, URL carries `?product=copilot`.
- Agent semantics perfect: for both *Mabo v Queensland (No 2)* and *R v Tang*, Copilot emitted
  the exact correct payload (`{"sourceType":"case.reported","data":{…},"shortTitle":…}`).
- **The action never executed.** The agent rendered the tool-call JSON as a chat message; the
  document was unchanged (verified by downloading the .docx — footnote count stayed at 5).

This is the signature of a client that recognises the function *declaration* (so it can build
the call) but has no wired *executor* to route it to the add-in runtime.

## What the research establishes

The feature we depend on — **"Combine Copilot Agents with Office Add-ins"** (a declarative
agent invoking an add-in's `office.js` functions via a local plugin + `executeDataFunction`) —
is **preview**, and the evidence points to it being validated on **Word for Windows desktop
(Beta Channel), not Word on the web**:

1. **Still preview.** Microsoft Learn describes it as "Create custom Copilot agents that read
   and write to documents open in Office applications (preview)." Announced at Build 2025;
   an "updated preview" (confirmation-card flow, action filtering) at Ignite 2025 (Nov 2025).
   No GA date published.
2. **Both official working samples require Windows desktop, Beta Channel.** The
   `OfficeRedlineAgent` and `poemwriter-copilot-and-addin` READMEs both state the prerequisite
   *"Word/Excel/PowerPoint for Windows: Beta Channel, Build 18514 or higher"* and debug by
   launching **Word desktop** (F5 → `office-addin-dev-settings sideload ./dist/manifest.json`).
   Neither tests action execution in Word on the web.
3. **No web-support statement exists.** The docs give no web-vs-desktop matrix for this feature
   — a conspicuous absence next to features that do call out web support.
4. **Our configuration is correct**, so this is not our bug: the package validates 0-errors
   against the official schemas (manifest v1.25, agent v1.5, plugin v2.3), the plugin binding is
   recognised (the agent builds the exact call), and the export-time invariant guarantees
   plugin function name == runtime `executeDataFunction` id == `Office.actions.associate` id.
5. **Not in Known Issues** — because unsupported-surface ≠ bug. (The Known Issues entry that
   *custom engine* agents are unsupported in Word does not apply: ours is a **declarative**
   agent + local plugin, a different mechanism.)

Do not confuse this with **Agent Mode in Word** — the built-in Copilot document agent, which
IS generally available on web, Windows, and Mac. That is Microsoft's first-party feature; it is
not the third-party add-in-action path Obiter uses.

## Conclusion

The Word-on-web behaviour is almost certainly the **preview not executing add-in actions on the
web yet**, not a defect in our package. The discriminating test is Word desktop.

## Desktop test checklist (for the other machine)

Prerequisites:
- Windows with **Microsoft 365 Apps, Beta Channel**, Word build **≥ 18514** (Insider → Beta
  Channel; verify File → Account → About Word). Mac desktop support for this preview is
  unconfirmed — use Windows.
- The signed-in user has a **Microsoft 365 Copilot licence** (the trial tenant user qualifies).

Fastest path (sideload, no admin propagation wait):
1. On this repo's `copilot/v1.14` branch: `npm run build:prod` (web assets already deployed at
   `obiter.com.au/app/`), then `npm run package:skill` to emit `obiter-copilot-skill-v1.15.1.zip`.
2. Sideload the unified package into Word desktop with the Microsoft 365 Agents Toolkit
   (or `office-addin-dev-settings sideload manifest.skill.json`). The package already points at
   the production host, so no `urlProd` edit is needed.
3. Open Word → the Obiter ribbon group should appear (confirms the add-in + shared runtime
   loaded). Open Copilot → select the **Obiter — AGLC4 Citations** agent.
4. Prompt: *"Cite Mabo v Queensland (No 2) (1992) 175 CLR 1 as a footnote."*
   - **Pass:** a real footnote is inserted, formatted by the engine (a confirmation card may
     appear first — accept it). The web fixes in v1.14.2 mean the footnote structure/italics
     are correct.
   - **Fail (same JSON echo on desktop too):** then it is our runtime wiring, not the web gap —
     align the skill-function runtime with the samples (they register `executeDataFunction`
     handlers on a dedicated commands/function runtime with an explicit `<script>` file, vs our
     `SharedRuntime` page) and retest. See `src/actions/unifiedManifest.ts` runtimes and
     `src/runtime/sharedRuntime.ts`.

## If the desktop test passes

Then the code is correct and the only gap is Microsoft's web rollout. Options: document
"Copilot skill: Word desktop (Beta Channel) during preview" as the supported surface, and
wait for the web preview to light up. Track via the Office Add-ins devblog and the
combine-agents-with-add-ins docs.

## Sources

- Combine Copilot Agents with Office Add-ins (preview) — Microsoft Learn:
  https://learn.microsoft.com/office/dev/add-ins/design/agent-and-add-in-overview
- Build your first add-in as a Copilot skill (quickstart) — Microsoft Learn:
  https://learn.microsoft.com/office/dev/add-ins/quickstarts/agent-and-add-in-quickstart
- Office Add-ins at Build 2025 (announcement) — M365 Dev Blog:
  https://devblogs.microsoft.com/microsoft365dev/office-addins-at-build-2025/
- Ignite 2025: What's new for Office Add-ins — M365 Dev Blog:
  https://devblogs.microsoft.com/microsoft365dev/ignite-2025-whats-new-for-office-add-ins/
- Known Issues in Microsoft 365 Copilot Extensibility — Microsoft Learn:
  https://learn.microsoft.com/microsoft-365/copilot/extensibility/known-issues
- Working samples (Windows Beta Channel prereq): OfficeRedlineAgent, poemwriter-copilot-and-addin.
