import assert from "node:assert/strict";
import test from "node:test";
import {
  parseVulkanDevices,
  selectLargestVulkanDevice,
} from "../../../dist/engine/models/backends/vulkan-adapters.js";

test("Vulkan device selection prefers the GPU with the most device-local memory", () => {
  const devices = parseVulkanDevices(
    "0\t536870912\t0\tAMD Radeon(TM) Graphics\r\n1\t6285164544\t0\tNVIDIA GeForce RTX 3060 Laptop GPU\r\n2\t9999999999\t1\tllvmpipe\r\n",
  );
  assert.equal(devices.length, 3);
  assert.equal(devices[1].name, "NVIDIA GeForce RTX 3060 Laptop GPU");
  assert.equal(selectLargestVulkanDevice(devices)?.index, 1);
});

test("Vulkan device selection leaves a single GPU to the ggml default", () => {
  assert.equal(
    selectLargestVulkanDevice(parseVulkanDevices("0\t1024\t0\tOnly GPU\n")),
    undefined,
  );
  assert.equal(selectLargestVulkanDevice(parseVulkanDevices("")), undefined);
});
