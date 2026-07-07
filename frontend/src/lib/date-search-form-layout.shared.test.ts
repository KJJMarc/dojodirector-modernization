import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DATE_SEARCH_FORM_LAYOUT } from "@/lib/date-search-form-layout.shared";

describe("DATE_SEARCH_FORM_LAYOUT", () => {
  it("stacks the toolbar through lg and only uses side-by-side columns at lg+", () => {
    assert.match(DATE_SEARCH_FORM_LAYOUT.form, /grid-cols-1/);
    assert.match(DATE_SEARCH_FORM_LAYOUT.form, /lg:grid-cols-\[minmax\(0,1fr\)_auto\]/);
    assert.doesNotMatch(DATE_SEARCH_FORM_LAYOUT.form, /sm:flex-row/);
  });

  it("constrains the card and date field to the parent width", () => {
    assert.match(DATE_SEARCH_FORM_LAYOUT.card, /overflow-hidden/);
    assert.match(DATE_SEARCH_FORM_LAYOUT.fieldWrapper, /min-w-0/);
    assert.match(DATE_SEARCH_FORM_LAYOUT.fieldWrapper, /max-w-full/);
    assert.match(DATE_SEARCH_FORM_LAYOUT.fieldInput, /min-w-0/);
    assert.match(DATE_SEARCH_FORM_LAYOUT.fieldInput, /max-w-full/);
    assert.match(DATE_SEARCH_FORM_LAYOUT.fieldInput, /box-border/);
  });

  it("keeps action and navigation controls wrapping on narrow widths", () => {
    assert.match(DATE_SEARCH_FORM_LAYOUT.actionRow, /flex-wrap/);
    assert.match(DATE_SEARCH_FORM_LAYOUT.nav, /flex-wrap/);
    assert.match(DATE_SEARCH_FORM_LAYOUT.actionButton, /w-full/);
    assert.match(DATE_SEARCH_FORM_LAYOUT.actionButton, /lg:w-auto/);
  });
});
