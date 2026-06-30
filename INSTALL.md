# Installing Obiter — AGLC4 Word Add-in

For most people the easiest way to install Obiter is from the Microsoft
marketplace. Manual sideloading (below) is for testing a local build or using a
development manifest.

The website has the canonical, screenshot-by-screenshot install guide:
<https://obiter.com.au/download.html>.

## Prerequisites

- Microsoft Word 2024 or Microsoft 365 — Windows, Mac, Word for the web, or iPad
- An internet connection for installation (Obiter then works offline)

## Install from AppSource (recommended)

Obiter is published on the Microsoft marketplace:
<https://marketplace.microsoft.com/en-au/product/office/WA200010629>.

1. Open the listing and click **Get it now**.
2. Confirm your details and click **Get it now** again.
3. Choose **Open in Word**.
4. In Word, click **Allow and Continue** on the New Office Add-in dialog.

Obiter then appears in its own **Obiter** tab in the Word ribbon. Updates are
delivered automatically through AppSource.

## Sideloading a manifest (testing / local builds)

Sideloading installs the add-in directly from a `manifest.xml` file — use it to
test a development build.

### Mac

1. Copy `manifest.xml` to
   `~/Library/Containers/com.microsoft.Word/Data/Documents/wef`
   (create the `wef` folder if it does not exist).
2. Open Microsoft Word and open or create a document.
3. Go to **Insert** > **My Add-ins** > **My Organization**.
4. Select **Obiter** and click **Add**.

### Windows

1. Copy `manifest.xml` to `%LOCALAPPDATA%\Microsoft\Office\16.0\Wef\`
   (create the `Wef` folder if it does not exist).
2. Open Microsoft Word and open or create a document.
3. Go to **Insert** > **My Add-ins** > **My Organization**.
4. Select **Obiter** and click **Add**.

### Word for the web

1. Open a document at <https://www.office.com>.
2. Go to **Insert** > **Office Add-ins** > **Upload My Add-in**.
3. Browse to `manifest.xml` and click **Upload**.

## Verifying the installation

After installation you should see an **Obiter** tab in the Word ribbon with
buttons for Insert Citation, Library, Validate, Bibliography, Guide, Refresh All,
Apply Template, Block Quote, Styling, and Settings. Click any button to open the
Obiter task pane.

## Troubleshooting

- **Add-in does not appear:** Ensure you are using a supported version of Word
  (2024 or Microsoft 365). Older versions may not support the required WordApi
  1.5 API set.
- **Upload option missing:** On some managed enterprise installations,
  sideloading is disabled by your IT administrator. Request Obiter through your
  organisation's app catalog instead.
- **Task pane is blank:** Check your internet connection. The add-in loads its
  interface from a remote server on first use.
- **Small caps look like ordinary capitals:** This is expected in Word for the
  web, which does not render the small-capitals font attribute. The formatting is
  preserved and displays correctly in Word for Windows, Mac, or iPad.
