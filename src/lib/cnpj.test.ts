import assert from "node:assert/strict";
import { test } from "node:test";
import { formatCnpj, isValidCnpj, onlyDigits } from "./cnpj";

test("onlyDigits strips punctuation", () => {
  assert.equal(onlyDigits("11.222.333/0001-81"), "11222333000181");
});

test("formatCnpj masks progressively", () => {
  assert.equal(formatCnpj("11222333000181"), "11.222.333/0001-81");
  assert.equal(formatCnpj("11"), "11");
  assert.equal(formatCnpj("11222"), "11.222");
});

test("isValidCnpj accepts known valid CNPJ (Petrobras)", () => {
  assert.equal(isValidCnpj("33.000.167/0001-01"), true);
  assert.equal(isValidCnpj("33000167000101"), true);
});

test("isValidCnpj rejects invalid check digits and repeats", () => {
  assert.equal(isValidCnpj("11.111.111/1111-11"), false);
  assert.equal(isValidCnpj("00.000.000/0000-00"), false);
  assert.equal(isValidCnpj("123"), false);
  assert.equal(isValidCnpj("33.000.167/0001-99"), false);
});
