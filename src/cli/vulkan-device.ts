import { spawn } from "node:child_process";
import {
  getEmbeddingModelCatalogEntry,
  listVulkanDevices,
  selectLargestVulkanDevice,
} from "../engine/models/index.js";
import type { ParsedArgs } from "./types.js";

const SELECTED_MARKER = "ZVEC_GREP_VULKAN_DEVICE_SELECTED";

/**
 * On Windows, llama.cpp reads GGML_VK_VISIBLE_DEVICES through the C runtime,
 * which never sees variables Node sets after startup. To index on the GPU with
 * the most VRAM, rerun the command in a child process that starts with the
 * variable set. Searches are unaffected. Returns the child's exit code, or
 * undefined when the current process should run the command itself.
 */
export async function runIndexOnLargestVulkanDevice(
  parsed: ParsedArgs,
  args: readonly string[],
): Promise<number | undefined> {
  if (!shouldSelectVulkanDevice(parsed)) {
    return undefined;
  }
  const device = selectLargestVulkanDevice(await listVulkanDevices());
  if (device === undefined) {
    return undefined;
  }
  process.stderr.write(
    `zvec-grep: indexing on Vulkan device ${device.index} (${device.name}); set GGML_VK_VISIBLE_DEVICES to choose another\n`,
  );
  return await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [...process.execArgv, process.argv[1] ?? "", ...args],
      {
        stdio: "inherit",
        env: {
          ...process.env,
          GGML_VK_VISIBLE_DEVICES: String(device.index),
          [SELECTED_MARKER]: "1",
        },
      },
    );
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      resolve(code ?? (signal ? 1 : 0));
    });
  });
}

function shouldSelectVulkanDevice(parsed: ParsedArgs): boolean {
  if (
    process.platform !== "win32" ||
    parsed.command !== "index" ||
    parsed.options.drop === true ||
    process.env.GGML_VK_VISIBLE_DEVICES !== undefined ||
    process.env[SELECTED_MARKER] === "1"
  ) {
    return false;
  }
  const device =
    parsed.options.device ?? process.env.ZVEC_GREP_DEVICE?.trim().toLowerCase();
  if (device !== "vulkan") {
    return false;
  }
  // Only llama.cpp models read GGML_VK_VISIBLE_DEVICES. Without --embedding the
  // index may reuse a llama.cpp model, so still select a device.
  const embedding =
    parsed.options.embedding ?? process.env.ZVEC_GREP_EMBEDDING?.trim();
  return (
    !embedding ||
    getEmbeddingModelCatalogEntry(embedding)?.backend === "llama-cpp"
  );
}
