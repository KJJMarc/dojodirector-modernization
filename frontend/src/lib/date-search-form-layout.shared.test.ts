import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DATE_SEARCH_FORM_LAYOUT } from "@/lib/date-search-form-layout.shared";

describe("DATE_SEARCH_FORM_LAYOUT", () => {
  it("stacks controls through lg and only uses side-by-side columns at lg+", () => {
    assert.match(DATE_SEARCH_FORM_LAYOUT.controls, /grid-cols-1/);
    assert.match(
      DATE_SEARCH_FORM_LAYOUT.controls,
      /lg:grid-cols-\[minmax\(0,1fr\)_auto\]/,
    );
    assert.doesNotMatch(DATE_SEARCH_FORM_LAYOUT.controls, /sm:flex-row/);
  });

  it("keeps the date field and actions in one width-constrained controls wrapper", () => {
    assert.match(DATE_SEARCH_FORM_LAYOUT.controls, /overflow-hidden/);
    assert.match(DATE_SEARCH_FORM_LAYOUT.controls, /max-w-full/);
    assert.match(DATE_SEARCH_FORM_LAYOUT.fieldInputWrapper, /overflow-hidden/);
    assert.match(DATE_SEARCH_FORM_LAYOUT.fieldInputWrapper, /max-w-full/);
    assert.match(DATE_SEARCH_FORM_LAYOUT.fieldInput, /date-search-input/);
  });

  it("uses matching full-width rules for date input and action buttons on narrow widths", () => {
    assert.match(DATE_SEARCH_FORM_LAYOUT.actionRow, /flex-col/);
    assert.match(DATE_SEARCH_FORM_LAYOUT.actionButton, /w-full/);
    assert.match(DATE_SEARCH_FORM_LAYOUT.actionButton, /box-border/);
    assert.match(DATE_SEARCH_FORM_LAYOUT.nav, /grid-cols-2/);
    assert.match(DATE_SEARCH_FORM_LAYOUT.navButton, /w-full/);
    assert.match(DATE_SEARCH_FORM_LAYOUT.actionButton, /lg:w-auto/);
  });
});
