/**
 * @jest-environment jsdom
 *
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * COURT-120: the transcript form supports several pinpoint + speaker rows
 * (AGLC4 r 2.7.2 ex 119), stored in the existing `pinpoints` array model.
 * One row stays in `pinpoint` / `speaker`, as before.
 */
import * as React from "react";
import { render as rtlRender, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { renderCaseTranscriptForm } from "../../src/ui/views/InsertCitation";

type Data = Record<string, unknown>;

// FieldHelp links to the guide, so the form renders inside a router.
const render = (ui: React.ReactElement): ReturnType<typeof rtlRender> =>
  rtlRender(<MemoryRouter>{ui}</MemoryRouter>);

function Harness({ initial, onData }: { initial: Data; onData: (d: Data) => void }): JSX.Element {
  const [data, setData] = React.useState<Data>(initial);
  const updateField = (key: string, value: unknown): void => {
    setData((prev) => {
      const next = { ...prev, [key]: value };
      onData(next);
      return next;
    });
  };
  return renderCaseTranscriptForm(data, updateField, true);
}

describe("COURT-120: transcript pinpoint + speaker rows (r 2.7.2)", () => {
  test("one row writes pinpoint and speaker only", () => {
    let latest: Data = {};
    render(<Harness initial={{}} onData={(d) => (latest = d)} />);
    fireEvent.change(screen.getByLabelText("Pinpoint"), { target: { value: "31" } });
    fireEvent.change(screen.getByPlaceholderText("e.g. McHugh J"), { target: { value: "PJ Bick QC" } });
    expect(latest.pinpoint).toBe("31");
    expect(latest.speaker).toBe("PJ Bick QC");
    expect(latest.pinpoints).toBeUndefined();
  });

  test("adding a row stores the pinpoints array; removing it returns to one row", () => {
    let latest: Data = {};
    render(<Harness initial={{ hcaTranscript: true, pinpoint: "2499–517" }} onData={(d) => (latest = d)} />);
    fireEvent.click(screen.getByRole("button", { name: "+ Add pinpoint and speaker" }));
    fireEvent.change(screen.getByLabelText("Pinpoint 2"), { target: { value: "2589–93" } });
    fireEvent.change(screen.getByLabelText(/^Speaker 2/), { target: { value: "McHugh J" } });
    expect(latest.pinpoints).toEqual([{ value: "2499–517" }, { value: "2589–93", speaker: "McHugh J" }]);
    expect(latest.pinpoint).toBe("2499–517");

    fireEvent.click(screen.getByRole("button", { name: "Remove pinpoint 2" }));
    expect(latest.pinpoints).toBeUndefined();
    expect(screen.queryByLabelText("Pinpoint 2")).toBeNull();
  });

  test("stored rows with numeric values (XML round trip) load as text", () => {
    render(
      <Harness
        initial={{ hcaTranscript: true, pinpoints: [{ value: 2499 }, { value: 2589, speaker: "McHugh J" }] }}
        onData={() => undefined}
      />
    );
    expect(screen.getByLabelText("Pinpoint")).toHaveValue("2499");
    expect(screen.getByLabelText("Pinpoint 2")).toHaveValue("2589");
    expect(screen.getByLabelText(/^Speaker 2/)).toHaveValue("McHugh J");
  });
});
