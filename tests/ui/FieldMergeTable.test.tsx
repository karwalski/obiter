/**
 * @jest-environment jsdom
 *
 * ENP-003: FieldMergeTable — agreed fields render once, differing fields get
 * one radio per column, extra keys become rows, aliases and name lists are
 * compared by value, and the table is axe clean.
 */

import * as React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import FieldMergeTable, { buildMergeRows } from "../../src/ui/components/FieldMergeTable";
import type { FieldMergeColumn } from "../../src/ui/components/FieldMergeTable";

const columns: FieldMergeColumn[] = [
  {
    id: "a",
    label: "1 (keep)",
    data: {
      authors: [{ givenNames: "James", surname: "Edelman" }],
      title: "Unjust Enrichment",
      publisher: "Hart Publishing",
      year: 2016,
      edition: "",
    },
  },
  {
    id: "b",
    label: "2",
    data: {
      authors: [{ givenNames: "James", surname: "Edelman" }],
      title: "Unjust Enrichment ",
      publisher: "Hart",
      year: "2016",
      edition: "2nd",
      isbn: "9781849464826",
    },
  },
];

describe("FieldMergeTable (ENP-003)", () => {
  test("buildMergeRows compares by trimmed text and name lists by structure", () => {
    const rows = buildMergeRows("book", columns);
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
    expect(byKey.authors.differs).toBe(false);
    expect(byKey.authors.texts.a).toBe("James Edelman");
    expect(byKey.title.differs).toBe(false);
    expect(byKey.year.differs).toBe(false);
    expect(byKey.publisher.differs).toBe(true);
    expect(byKey.edition.differs).toBe(true);
    expect(byKey.isbn).toBeDefined();
    expect(byKey.isbn.extra).toBe(true);
    expect(byKey.isbn.differs).toBe(true);
  });

  test("agreed fields render one value; differing fields render a radio per column", () => {
    const onSelect = jest.fn();
    render(
      <FieldMergeTable
        sourceType="book"
        columns={columns}
        selection={{ publisher: "a", edition: "b", isbn: "b" }}
        onSelect={onSelect}
      />
    );
    expect(screen.getByRole("table", { name: "Fields to merge" })).toBeInTheDocument();
    expect(screen.getByText("James Edelman")).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: /^Authors:/ })).toBeNull();

    const hart = screen.getByRole("radio", { name: "Publisher: Hart Publishing (1 (keep))" });
    const hartShort = screen.getByRole("radio", { name: "Publisher: Hart (2)" });
    expect(hart).toBeChecked();
    expect(hartShort).not.toBeChecked();
    expect(hart).toHaveAttribute("name", "field-publisher");
    expect(hartShort).toHaveAttribute("name", "field-publisher");

    expect(screen.getByRole("radio", { name: "Edition: empty (1 (keep))" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "Edition: 2nd (2)" })).toBeChecked();

    fireEvent.click(hartShort);
    expect(onSelect).toHaveBeenCalledWith("publisher", "b");
    expect(screen.getByText("3 fields differ. Choose the value to keep for each.")).toBeInTheDocument();
  });

  test("fieldsOverride replaces the source type's field list", () => {
    render(
      <FieldMergeTable
        sourceType="book"
        columns={columns}
        selection={{}}
        onSelect={jest.fn()}
        fieldsOverride={[{ key: "publisher", label: "Publisher" }]}
      />
    );
    expect(screen.getAllByRole("radio", { name: /^Publisher:/ })).toHaveLength(2);
    expect(screen.queryByText("Title")).toBeNull();
    // Extra keys in the data still become rows.
    expect(screen.getByText("isbn")).toBeInTheDocument();
  });

  test("every field matching reports as such", () => {
    render(
      <FieldMergeTable
        sourceType="book"
        columns={[columns[0], { ...columns[0], id: "c", label: "2" }]}
        selection={{}}
        onSelect={jest.fn()}
      />
    );
    expect(screen.getByText("Every field matches.")).toBeInTheDocument();
    expect(screen.queryByRole("radio")).toBeNull();
  });

  test("has no axe violations", async () => {
    const { container } = render(
      <FieldMergeTable
        sourceType="book"
        columns={columns}
        selection={{ publisher: "a", edition: "b", isbn: "b" }}
        onSelect={jest.fn()}
      />
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
