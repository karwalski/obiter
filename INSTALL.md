# Installing Obiter — AGLC4 Word Add-in

## Prerequisites

- Microsoft Word 2024 or Microsoft 365 (Windows or Mac)
- An active internet connection (the add-in loads from a web server)

## Sideloading the Add-in

Sideloading lets you install the add-in directly from the manifest file
included in this package. This is the recommended method for testing or
personal use outside of the Microsoft AppSource store.

### Mac

1. Open Microsoft Word.
2. Open any document (or create a new one).
3. Go to **Insert** > **My Add-ins**.
4. Click **Upload My Add-in** (at the bottom of the dialog).
5. Click **Browse** and select the `manifest.xml` file from this package.
6. Click **Upload**.
7. The **AGLC4** tab will appear in the Word ribbon.

### Windows

1. Open Microsoft Word.
2. Open any document (or create a new one).
3. Go to **Insert** > **My Add-ins**.
4. Click **Upload My Add-in** (at the top-right of the dialog).
5. Click **Browse** and select the `manifest.xml` file from this package.
6. Click **Upload**.
7. The **AGLC4** tab will appear in the Word ribbon.

## Verifying the Installation

After sideloading, you should see an **AGLC4** tab in the Word ribbon with
buttons for Insert Citation, Library, Validate, Bibliography, Guide, and
Settings. Click any button to open the Obiter task pane.

## Troubleshooting

- **Add-in does not appear:** Ensure you are using a supported version of
  Word (2024 or Microsoft 365). Older versions may not support the required
  WordApi 1.5 API set.
- **Upload option missing:** On some managed enterprise installations, the
  sideloading option may be disabled by your IT administrator. Contact your
  administrator or request the add-in through your organisation's app catalog.
- **Task pane is blank:** Check your internet connection. The add-in loads
  its interface from a remote server.

## Production Use

For production use, Obiter will be available from the Microsoft AppSource
store. Once published, you can install it directly from **Insert** >
**Get Add-ins** > search for "Obiter".
