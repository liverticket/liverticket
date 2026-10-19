import test from "node:test";
import assert from "node:assert/strict";
import { getScannerCode, matchesScannerCode } from "../lib/scanner-code.mjs";

test("existing event codes use their final two digits and preserve zeros", () => {
  for (const [stored, code] of [["9274", "74"], ["1207", "07"], ["1000", "00"], ["42", "42"]]) {
    assert.equal(getScannerCode(stored), code);
    assert.equal(matchesScannerCode(stored, code), true);
  }
});

test("access requires exactly two matching digits", () => {
  for (const input of ["9274", "4", "", "ab", "75", " 74", "074"]) {
    assert.equal(matchesScannerCode("9274", input), false);
  }
  for (const stored of [null, undefined, "", "abc", "1", "123"]) {
    assert.equal(matchesScannerCode(stored, "74"), false);
  }
});
