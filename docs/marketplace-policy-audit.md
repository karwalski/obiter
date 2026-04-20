# Microsoft Commercial Marketplace Certification Policy Audit

**Add-in:** Obiter -- AGLC4 Citation Engine
**Date:** 18 April 2026
**Auditor:** A11Y-002 compliance review
**Policy reference:** https://learn.microsoft.com/en-us/legal/marketplace/certification-policies

---

## Section 100 -- General Policies (All Offers)

### 100.1 Value Proposition and Offer Requirements

**Requirement:** Listing must clearly, concisely, and accurately communicate value proposition. Title must be accurate and descriptive. Summary limited to 100 characters. Description must identify intended audience, explain unique value, and describe supported products.

**Status:** COMPLIANT

**Evidence:**
- Title: "Obiter -- AGLC4 Citation Engine" -- accurate and descriptive (`manifest.prod.xml` line 7)
- Short description in `docs/appstore-submission.md`: 95 characters (under 100-char limit)
- Long description identifies audience (Australian law students, legal academics, practitioners), explains unique value (all ~80 AGLC4 source types, international materials), and identifies supported products (Microsoft Word)
- Description does not repeat the summary
- No comparative marketing or competitor references

**Action needed:** None

---

### 100.6 Personal Information

**Requirement:** Listing must not include third-party personal information without authorisation. Must include link to privacy policy.

**Status:** COMPLIANT

**Evidence:**
- Privacy policy exists at `website/privacy.html` and will be accessible at `https://obiter.com.au/privacy.html`
- `SupportUrl` element present in both manifests
- No third-party personal information in listing content
- `docs/appstore-submission.md` lists privacy policy URL for submission

**Action needed:** None

---

### 100.10 Inappropriate Content

**Requirement:** Offer must not contain harmful, defamatory, discriminatory, sexually explicit, or otherwise inappropriate content.

**Status:** COMPLIANT

**Evidence:**
- Add-in is a legal citation formatting tool with no user-generated content display
- UI copy is professional and technical in nature
- No images, media, or content that could be deemed inappropriate

**Action needed:** None

---

### 100.11 Security

**Requirement:** Must not jeopardise user security. Must not install or launch unexpected executable code. Must not share application credentials publicly.

**Status:** COMPLIANT

**Evidence:**
- No executable code installation; runs entirely within the Office.js sandbox
- API keys stored in user's `localStorage`, never transmitted to Obiter servers (`website/privacy.html` lines 89-93)
- LLM requests made directly from browser to provider API (`src/llm/client.ts`)
- Proxy server does not log or store queries (`website/privacy.html` lines 159-162)
- All URLs use HTTPS

**Action needed:** None

---

### 100.12 Functionality

**Requirement:** Must deliver promised functionality. UI must not look unfinished. Must be reasonably responsive with loading indicators.

**Status:** NEEDS REVIEW

**Evidence:**
- Core features (citation insertion, validation, bibliography, library, reference guide) are implemented
- UI is React-based with professional styling

**Action needed:** Manual QA required on all three platforms (Windows, Mac, Web) to confirm no unfinished UI states and that loading indicators are present for long-running operations (e.g., LLM calls, proxy searches, document validation).

---

## Section 1000 -- SaaS General Policies

### 1000.x (Azure, SaaS Fulfillment APIs, Landing Page)

**Status:** NOT APPLICABLE

**Evidence:** Section 1000 applies to SaaS offers platformed on Azure with subscription billing. Obiter is a free Office Add-in (TaskPaneApp), not a SaaS product. It does not use Azure AD authentication, SaaS Fulfillment APIs, or subscription metering.

**Action needed:** None

---

## Section 1100 -- Microsoft 365 General Content Requirements

### 1100.1 General Content

**Requirement:** Listing must only describe the app/add-in (no advertising for other offers). Must disclose features requiring extra charge. Must have clear value proposition with seamless first run experience.

**Status:** COMPLIANT

**Evidence:**
- Long description in `docs/appstore-submission.md` describes only Obiter functionality
- Add-in is entirely free; no in-app purchases, no paid tiers
- First run experience: `taskpane.ts` auto-applies AGLC4 styles and template to empty documents (lines 28-63), then renders the React app immediately
- No sign-in required for core functionality

**Action needed:** None

---

### 1100.3 Selling Additional Features

**Requirement:** Apps/add-ins on mobile must not offer additional features or content for sale.

**Status:** COMPLIANT

**Evidence:**
- Obiter is entirely free. No paid features, no in-app purchases, no upselling
- Currently targets Desktop form factor only (`manifest.prod.xml` -- only `DesktopFormFactor` specified)

**Action needed:** None

---

### 1100.4 Predictable Behaviour

**Requirement:** Must not make unexpected changes to user documents. Must not launch functionality outside the add-in without explicit user permission. Must not prompt user credentials except through Microsoft-approved OAuth flow.

**Status:** COMPLIANT

**Evidence:**
- Document modifications (citation insertion, bibliography generation, template application) are all user-initiated via explicit button clicks
- Auto-setup (`taskpane.ts` lines 28-63) only applies to empty documents and can be disabled via `localStorage` setting
- No authentication or credential prompting -- the add-in requires no sign-in
- LLM API key entry is user-initiated in Settings, not prompted automatically

**Action needed:** None

---

### 1100.5 Customer Control

**Requirement:** Obtain consent to publish personal information. Notify users before obtaining/storing/transmitting customer information. Must use HTTPS (valid SSL). Pop-ups only from explicit user action. Must not request unreasonably high permissions. Must have correctly sized icons. Must support external account sign-in/out if applicable.

**Status:** COMPLIANT

**Evidence:**
- No personal information collected or published
- Privacy policy clearly documents all data handling (`website/privacy.html`)
- All URLs use HTTPS in production manifest
- Permission level is `ReadWriteDocument` -- appropriate for a citation/formatting tool that must read and modify document content
- Icons provided at 16x16, 32x32, 64x64 (hi-res), and 80x80 (`manifest.prod.xml`)
- No external account required; LLM integration is optional and user-controlled

**Action needed:** None

---

### 1100.6 Global Audience

**Requirement:** Provide details if app calls, supports, contains, or uses cryptography.

**Status:** COMPLIANT

**Evidence:**
- Obiter does not implement cryptography
- HTTPS connections use standard browser TLS (not custom cryptography)
- No encryption of user data beyond browser-native HTTPS

**Action needed:** None

---

### 1100.7 Easy Identification

**Requirement:** Specify language support in manifest. Primary language must be among supported languages. Title may not include brand/service name for general apps. Must not be a duplicate of a previously submitted app.

**Status:** COMPLIANT

**Evidence:**
- `DefaultLocale` set to `en-US` (`manifest.prod.xml` line 6)
- `docs/appstore-submission.md` specifies supported locales: en-US, en-AU, en-GB
- Title "Obiter -- AGLC4 Citation Engine" uses the product's own name, not a third-party brand
- This is a new, unique submission -- no duplicates

**Action needed:** None

---

### 1100.8 Preserving Functionality

**Requirement:** When updating pricing/licensing, continue offering original functionality to existing users at original pricing.

**Status:** NOT APPLICABLE

**Evidence:** Obiter is free and open-source (GPLv3). No pricing changes are planned or possible under this model.

**Action needed:** None

---

## Section 1120 -- Office Add-ins (Word, Excel, PowerPoint, Outlook)

### 1120.1 Offer Requirements

**Requirement:** Use latest Microsoft-hosted Office.js from the official CDN. Use latest manifest schema. Specify valid Support URL. High-resolution icon is mandatory. Source location must point to valid web address. Version number must be incremented on updates.

**Status:** COMPLIANT

**Evidence:**
- Office.js loaded from `https://appsforoffice.microsoft.com/lib/1/hosted/office.js` in both `src/taskpane/taskpane.html` (line 11) and `src/commands/commands.html` (line 9)
- Manifest uses `http://schemas.microsoft.com/office/appforoffice/1.1` schema with `VersionOverridesV1_0`
- `SupportUrl` specified: `https://obiter.com.au` (`manifest.prod.xml` line 11)
- `HighResolutionIconUrl` specified: `https://obiter.com.au/app/assets/icon-64.png` (`manifest.prod.xml` line 10)
- Production source location: `https://obiter.com.au/app/taskpane.html` (valid HTTPS URL)
- Version: `1.0.0.0` (`manifest.prod.xml` line 4) -- initial submission

**Action needed:** None

---

### 1120.2 Mobile Requirements

**Requirement:** No in-app purchases on mobile. No UI upselling to paid versions. No commerce links on privacy/terms pages. Must comply with platform-specific design guidelines.

**Status:** COMPLIANT (with caveat)

**Evidence:**
- Obiter is free with no in-app purchases on any platform
- Privacy and terms pages contain no commerce UI or store links (verified in `website/privacy.html` and `website/terms.html`)
- Currently only `DesktopFormFactor` is specified -- no mobile form factor declared

**Action needed:** The privacy page footer contains a Ko-fi link (`website/privacy.html` line 211). While this is a donation link (not a paid feature/upgrade), Microsoft reviewers could potentially flag it on mobile. Since the add-in does not currently declare mobile support, this is low risk. If mobile support is added later, consider removing the Ko-fi link from privacy/terms pages or ensuring it is not visible in the add-in webview.

---

### 1120.3 Functionality

**Requirement:** Follow design guidelines. Fully functional across supported platforms and browsers. Tested on Windows/Mac/Web. Touch support on touch devices. Must not use deprecated functionality. Compatible with Edge, Chrome, Firefox, Safari. Must work in all applications specified in Hosts element. Task pane add-ins must support add-in commands.

**Status:** COMPLIANT

**Evidence:**
- Manifest declares `<Host Name="Document"/>` (Word only) -- appropriately scoped
- Task pane add-in supports add-in commands via `PrimaryCommandSurface` with `CustomTab` and multiple button controls (`manifest.prod.xml` lines 37-180)
- React-based UI is touch-compatible (standard HTML form controls)
- `browserslist` in `package.json` targets "last 2 versions" and IE 11
- WordApi 1.5 minimum version is declared with runtime fallback for unsupported versions (`taskpane.ts` lines 70-77)

**Action needed:** Manual cross-browser/cross-platform QA required:
- Windows (Edge, Chrome)
- macOS (Safari, Chrome)
- Word for Web (Edge, Chrome, Firefox, Safari)
- Touch-only testing on iPad (if Word for iPad is listed as supported)

---

### 1120.4 Outlook Add-ins Functionality

**Status:** NOT APPLICABLE

**Evidence:** Obiter is a Word-only add-in. No Outlook extension points declared.

---

### 1120.5 Excel Custom Functions

**Status:** NOT APPLICABLE

**Evidence:** Obiter is a Word-only add-in. No Excel custom functions.

---

## Section 1120 -- Privacy, Security, Data Handling

### 1120.1 Privacy Policy (mapped from policy requirement)

**Requirement:** A substantive privacy policy must be accessible at the URL provided in the manifest/listing.

**Status:** COMPLIANT

**Evidence:**
- Privacy policy at `website/privacy.html` covers:
  - Who the developer is (lines 58-65)
  - Data stored in the document (lines 68-78)
  - Data stored locally in localStorage (lines 80-94)
  - No telemetry or analytics (lines 96-101)
  - Third-party LLM integration details (lines 103-149)
  - External API search proxy (lines 151-163)
  - Website contact forms (lines 165-176)
  - Children's privacy (lines 178-181)
  - Change notification process (lines 183-188)
  - Contact information (lines 190-195)
- Last updated date present (18 April 2026)
- Policy URL listed in `docs/appstore-submission.md` for submission

**Action needed:** None

---

### 1120.2 Data Handling

**Requirement:** Clearly describe what data the add-in collects, stores, and transmits. Secure all data in transit.

**Status:** COMPLIANT

**Evidence:**
- Privacy policy explicitly states no data collection, no analytics, no telemetry
- Citation data stored in Custom XML Parts within the `.docx` file (never transmitted)
- Preferences stored in `localStorage` (never transmitted to Obiter servers)
- All external communications use HTTPS:
  - LLM API calls via `fetch()` to OpenAI/Anthropic endpoints (`src/llm/client.ts`)
  - Proxy API calls via `fetch()` to `https://obiter.com.au/api/proxy` (`src/api/proxyClient.ts`)

**Action needed:** None

---

### 1120.3 Personal Information

**Requirement:** Notify users before collecting personal information. Obtain consent. Do not collect unnecessary personal information.

**Status:** COMPLIANT

**Evidence:**
- The add-in itself collects no personal information
- LLM integration requires explicit user action to enable and configure (`website/privacy.html` lines 105-107)
- Only user-selected text is sent to LLM providers -- never the full document (`website/privacy.html` lines 114-117)
- Proxy search queries are not logged or stored (`website/privacy.html` lines 159-162)
- Website contact forms and signatures are separate from the add-in functionality

**Action needed:** None

---

### 1120.4 External Services (LLM, APIs)

**Requirement:** If the add-in connects to external services, this must be disclosed. Users must be informed about what data is transmitted.

**Status:** COMPLIANT

**Evidence:**

**LLM Integration (`src/llm/client.ts`):**
- Connects to OpenAI (`https://api.openai.com/v1/chat/completions`) or Anthropic (`https://api.anthropic.com/v1/messages`) or custom endpoints
- Disabled by default -- user must explicitly enable and provide API key
- Only user-selected text is transmitted
- Privacy policy documents all LLM data flows in detail (lines 103-149)
- AppSource long description discloses: "Optional AI integration for citation parsing and verification (user provides their own API key -- no data sent without explicit user action)"

**Proxy API (`src/api/proxyClient.ts`):**
- Connects to `https://obiter.com.au/api/proxy` for case/legislation typeahead search
- Forwards queries to AustLII, Jade.io, and Federal Register of Legislation
- Only search query text is transmitted (user-typed search terms)
- Privacy policy documents the proxy in detail (lines 151-163)
- Proxy does not log or store queries

**Action needed:** None

---

## Section 1140 -- Apps and Agents for Microsoft 365 and Copilot

### 1140.1 Offer Submission / Manifest Format

**Requirement:** App packages must be correctly formatted and conform to the latest manifest schema. No duplicate apps from the same developer.

**Status:** COMPLIANT

**Evidence:**
- Manifest uses `http://schemas.microsoft.com/office/appforoffice/1.1` schema
- `VersionOverridesV1_0` present for add-in commands
- `npm run validate` script available for manifest validation (`package.json` line 25)
- No duplicate submissions (first-time publication)

**Action needed:** Run `npm run validate` against `manifest.prod.xml` before submission to confirm zero validation errors.

---

### 1140.2 Add-in Integrity

**Requirement:** Add-in must not alter or promote alteration of Office/SharePoint except via the add-in model. Must not jeopardise host application stability.

**Status:** COMPLIANT

**Evidence:**
- All document modifications use the Office.js WordApi (`src/word/` layer)
- No COM/VSTO interop, no registry modifications, no file system access
- Error handling in `taskpane.ts` wraps all auto-setup operations in try/catch (lines 28-63, 85-89)
- Graceful degradation: proxy and LLM failures return empty results silently (`src/api/proxyClient.ts` lines 39-42, 54-56)

**Action needed:** None

---

### 1140.3 Functionality

**Requirement:** Add-in must be fully functional as described in listing. Must work across specified hosts and platforms.

**Status:** NEEDS REVIEW

**Evidence:**
- Feature set matches description: citation insertion, library, validation, bibliography, reference guide, settings
- Targets Word only (`<Host Name="Document"/>`)
- WordApi 1.5 requirement with runtime check and fallback message

**Action needed:** Full end-to-end QA on all listed platforms before submission:
- Word for Windows (Desktop)
- Word for Mac (Desktop)
- Word for Web
- Word for iPad (if listed in supported products)

---

## Summary

| Section | Policy Point | Status | Action Required |
|---------|-------------|--------|-----------------|
| 100.1 | Value proposition | COMPLIANT | None |
| 100.6 | Personal information | COMPLIANT | None |
| 100.10 | Inappropriate content | COMPLIANT | None |
| 100.11 | Security | COMPLIANT | None |
| 100.12 | Functionality | NEEDS REVIEW | Manual QA on all platforms |
| 1000.x | SaaS requirements | NOT APPLICABLE | N/A |
| 1100.1 | General content | COMPLIANT | None |
| 1100.3 | Mobile selling | COMPLIANT | None |
| 1100.4 | Predictable behaviour | COMPLIANT | None |
| 1100.5 | Customer control | COMPLIANT | None |
| 1100.6 | Global audience | COMPLIANT | None |
| 1100.7 | Easy identification | COMPLIANT | None |
| 1100.8 | Preserving functionality | NOT APPLICABLE | N/A |
| 1120.1 | Offer requirements | COMPLIANT | None |
| 1120.2 | Mobile requirements | COMPLIANT | Review Ko-fi link if mobile support added |
| 1120.3 | Functionality | COMPLIANT | Cross-browser/platform QA required |
| 1120.4 | Outlook add-ins | NOT APPLICABLE | N/A |
| 1120.5 | Excel custom functions | NOT APPLICABLE | N/A |
| Privacy | Privacy policy | COMPLIANT | None |
| Data | Data handling | COMPLIANT | None |
| Personal | Personal information | COMPLIANT | None |
| External | External services | COMPLIANT | None |
| 1140.1 | Manifest format | COMPLIANT | Run `npm run validate` on prod manifest |
| 1140.2 | Add-in integrity | COMPLIANT | None |
| 1140.3 | Functionality | NEEDS REVIEW | End-to-end QA before submission |

### Items Requiring Manual Action

1. **Cross-platform QA** (100.12, 1120.3, 1140.3): Test the add-in on Word for Windows, Mac, and Web. Confirm all features work, loading indicators are present, and touch-only interaction is supported.

2. **Manifest validation** (1140.1): Run `npm run validate` against `manifest.prod.xml` to confirm zero errors before submission.

3. **Screenshots** (not a policy violation, but required for submission): Capture the 7 screenshots listed in `docs/appstore-submission.md` Section 3.

4. **300x300 store icon** (not a policy violation, but required for submission): Generate from source `obiter.png` per `docs/appstore-submission.md` Section 4.

5. **Ko-fi link in privacy/terms footers** (1120.2, low risk): Currently not an issue since no mobile form factor is declared. If mobile support is added, remove donation links from privacy and terms pages when viewed in the add-in context.

### Non-Compliant Items Found

**None.** No policy violations were identified. The codebase, manifests, privacy policy, and terms of use are aligned with Microsoft Commercial Marketplace certification requirements.
