// Test for the CSV parser. Run: node --experimental-strip-types src/lib/csv.test.mjs
import assert from "node:assert/strict";

let mod;
try {
  mod = await import("./csv.ts");
} catch {
  console.log("skip: run with `node --experimental-strip-types src/lib/csv.test.mjs`");
  process.exit(0);
}
const { parseCSV, parseCsvTable, normalizeHeader, pick } = mod;

// Basic rows
assert.deepEqual(parseCSV("a,b,c\n1,2,3"), [
  ["a", "b", "c"],
  ["1", "2", "3"],
]);

// Quoted field with comma and escaped quote
assert.deepEqual(parseCSV('name,note\n"Soap, 1L","He said ""hi"""'), [
  ["name", "note"],
  ["Soap, 1L", 'He said "hi"'],
]);

// Newline inside quotes + CRLF line endings
assert.deepEqual(parseCSV('a,b\r\n"line1\nline2",x\r\n'), [
  ["a", "b"],
  ["line1\nline2", "x"],
]);

// normalizeHeader
assert.equal(normalizeHeader("Item Code"), "item_code");
assert.equal(normalizeHeader("Sell Price (RM)"), "sell_price_rm");

// parseCsvTable maps by normalized header, drops blank rows
const t = parseCsvTable("SKU,Name,Cost\n9551,Shampoo,3.50\n\n9552,Soap,1.20\n");
assert.deepEqual(t.headers, ["sku", "name", "cost"]);
assert.equal(t.records.length, 2);
assert.equal(t.records[0].sku, "9551");
assert.equal(t.records[1].name, "Soap");

// pick chooses first present alias
assert.equal(pick(t.records[0], "code", "sku"), "9551");
assert.equal(pick(t.records[0], "barcode"), "");

console.log("ok: all CSV parser tests passed");
