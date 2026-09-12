/**
 * @jest-environment jsdom
 *
 * INTEROP-011: the browser-side file helpers shared by the interchange
 * dialogs, Recovery and Settings.
 */

import {
  copyTextToClipboard,
  downloadTextFile,
  readFileAsText,
  todayStamp,
} from "../../src/ui/fileTransfer";

describe("downloadTextFile", () => {
  test("creates, clicks, removes an anchor and revokes the URL", () => {
    const createObjectURL = jest.fn(() => "blob:x");
    const revokeObjectURL = jest.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = jest
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    downloadTextFile("obiter-library.ris", "TY  - JOUR", "application/x-research-info-systems");
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:x");
    expect(document.querySelector("a[download]")).toBeNull();
    click.mockRestore();
  });
});

describe("copyTextToClipboard", () => {
  test("uses the Clipboard API when present", async () => {
    const writeText = jest.fn(async () => undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    expect(await copyTextToClipboard("x")).toBe(true);
    expect(writeText).toHaveBeenCalledWith("x");
  });

  test("falls back to execCommand and reports failure honestly", async () => {
    Object.assign(navigator, { clipboard: undefined });
    const exec = jest.fn(() => true);
    Object.assign(document, { execCommand: exec });
    expect(await copyTextToClipboard("y")).toBe(true);
    expect(exec).toHaveBeenCalledWith("copy");
    Object.assign(document, { execCommand: () => false });
    expect(await copyTextToClipboard("z")).toBe(false);
  });
});

describe("readFileAsText and todayStamp", () => {
  test("reads a Blob as text", async () => {
    const blob = new Blob(["TY  - BOOK\n"], { type: "text/plain" });
    expect(await readFileAsText(blob)).toBe("TY  - BOOK\n");
  });

  test("formats the local date", () => {
    expect(todayStamp(new Date(2026, 8, 12, 23, 30))).toBe("2026-09-12");
    expect(todayStamp(new Date(2026, 0, 3))).toBe("2026-01-03");
  });
});
