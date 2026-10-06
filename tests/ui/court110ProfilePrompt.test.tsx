/**
 * @jest-environment jsdom
 *
 * COURT-110 follow-up (owner, 7 Oct 2026): the per-document "Update court
 * profile" prompt (COURT-106) lists the starting-page correction (AGLC4
 * r 2.2.5) in plain words for a court document written before the fix.
 */
import * as React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { CourtProfileUpdatePrompt } from "../../src/ui/components/CourtProfileInfo";
import {
  REPORT_STARTING_PAGE_DETAIL,
  createMigratedProfile,
  getPresetToggles,
} from "../../src/engine/court/profile";

test("COURT-110: the prompt shows the starting-page change with a plain explanation", () => {
  const toggles = { ...getPresetToggles("NSWSC")!, reportStartingPage: "legacy" };
  const onAccept = jest.fn();
  render(
    <CourtProfileUpdatePrompt
      jurisdiction="NSWSC"
      toggles={toggles}
      profile={createMigratedProfile("NSWSC", new Date("2026-10-07T00:00:00Z"))}
      onAccept={onAccept}
      onDecline={jest.fn()}
    />
  );
  const prompt = screen.getByRole("group", { name: "Update court profile" });
  const row = within(prompt).getByLabelText(
    "Report starting page with a paragraph pinpoint: Left out (earlier Obiter form) to Always shown (AGLC4 r 2.2.5)"
  );
  expect(row).toBeChecked();
  expect(within(prompt).getByTestId("profile-change-detail-reportStartingPage").textContent).toBe(
    REPORT_STARTING_PAGE_DETAIL
  );
  fireEvent.click(within(prompt).getByRole("button", { name: "Apply update" }));
  expect(onAccept).toHaveBeenCalledWith(["reportStartingPage"]);
});
