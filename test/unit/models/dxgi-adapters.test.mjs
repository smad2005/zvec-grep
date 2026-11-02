import assert from "node:assert/strict";
import test from "node:test";
import {
  parseDxgiAdapters,
  selectLargestAdapter,
} from "../../../dist/engine/models/backends/dxgi-adapters.js";

test("DXGI adapter selection prefers the hardware adapter with the most VRAM", () => {
  const adapters = parseDxgiAdapters(
    "0\t519045120\t0\r\n1\t6285164544\t0\r\n2\t519045120\t0\r\n3\t0\t1\r\nnoise\n",
  );
  assert.deepEqual(
    adapters.map((adapter) => adapter.index),
    [0, 1, 2, 3],
  );
  assert.equal(adapters[3].software, true);
  assert.equal(selectLargestAdapter(adapters), 1);
});

test("DXGI adapter selection ignores software adapters and empty output", () => {
  assert.equal(selectLargestAdapter(parseDxgiAdapters("")), undefined);
  assert.equal(
    selectLargestAdapter([
      { index: 0, dedicatedVideoMemory: 9, software: true },
    ]),
    undefined,
  );
});
