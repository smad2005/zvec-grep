import { runPowerShellScript } from "./dxgi-adapters.js";

export type VulkanDevice = {
  index: number;
  deviceLocalMemory: number;
  cpu: boolean;
  name: string;
};

// GGML_VK_VISIBLE_DEVICES indexes vkEnumeratePhysicalDevices, so enumerate
// that list directly. Properties are read from raw buffers at the offsets of
// VkPhysicalDeviceProperties (deviceType at 16, deviceName at 20) and
// VkPhysicalDeviceMemoryProperties (heap count at 260, heaps from 264).
const SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class ZgVulkan {
  [StructLayout(LayoutKind.Sequential)]
  struct InstanceCreateInfo {
    public int sType; public IntPtr pNext; public uint flags; public IntPtr pApplicationInfo;
    public uint enabledLayerCount; public IntPtr ppEnabledLayerNames;
    public uint enabledExtensionCount; public IntPtr ppEnabledExtensionNames;
  }
  [DllImport("vulkan-1.dll")] static extern int vkCreateInstance(ref InstanceCreateInfo info, IntPtr allocator, out IntPtr instance);
  [DllImport("vulkan-1.dll")] static extern void vkDestroyInstance(IntPtr instance, IntPtr allocator);
  [DllImport("vulkan-1.dll")] static extern int vkEnumeratePhysicalDevices(IntPtr instance, ref uint count, [Out] IntPtr[] devices);
  [DllImport("vulkan-1.dll")] static extern void vkGetPhysicalDeviceProperties(IntPtr device, [Out] byte[] properties);
  [DllImport("vulkan-1.dll")] static extern void vkGetPhysicalDeviceMemoryProperties(IntPtr device, [Out] byte[] properties);
  public static string List() {
    var info = new InstanceCreateInfo(); info.sType = 1;
    IntPtr instance;
    if (vkCreateInstance(ref info, IntPtr.Zero, out instance) != 0) return "";
    try {
      uint count = 0;
      if (vkEnumeratePhysicalDevices(instance, ref count, null) != 0) return "";
      var devices = new IntPtr[count];
      if (vkEnumeratePhysicalDevices(instance, ref count, devices) != 0) return "";
      var sb = new System.Text.StringBuilder();
      for (int i = 0; i < count; i++) {
        var props = new byte[2048]; vkGetPhysicalDeviceProperties(devices[i], props);
        var memory = new byte[2048]; vkGetPhysicalDeviceMemoryProperties(devices[i], memory);
        int type = BitConverter.ToInt32(props, 16);
        int end = Array.IndexOf(props, (byte)0, 20); if (end < 0) end = 276;
        string name = System.Text.Encoding.UTF8.GetString(props, 20, end - 20);
        uint heaps = BitConverter.ToUInt32(memory, 260);
        ulong local = 0;
        for (int h = 0; h < heaps && h < 16; h++) {
          if ((BitConverter.ToUInt32(memory, 272 + 16 * h) & 1) != 0) local += BitConverter.ToUInt64(memory, 264 + 16 * h);
        }
        sb.AppendFormat("{0}\t{1}\t{2}\t{3}\n", i, local, type == 4 ? 1 : 0, name.Replace('\t', ' '));
      }
      return sb.ToString();
    } finally { vkDestroyInstance(instance, IntPtr.Zero); }
  }
}
'@
[ZgVulkan]::List()
`;

export function parseVulkanDevices(output: string): VulkanDevice[] {
  const devices: VulkanDevice[] = [];
  for (const line of output.split(/\r?\n/)) {
    const [index, memory, cpu, ...name] = line.trim().split("\t");
    if (index === undefined || memory === undefined || cpu === undefined) {
      continue;
    }
    const device = {
      index: Number(index),
      deviceLocalMemory: Number(memory),
      cpu: cpu === "1",
      name: name.join("\t"),
    };
    if (
      Number.isInteger(device.index) &&
      Number.isFinite(device.deviceLocalMemory)
    ) {
      devices.push(device);
    }
  }
  return devices;
}

/**
 * The GPU with the most device-local memory, or undefined when there is no
 * choice to make (fewer than two GPUs) so the ggml default stays in effect.
 */
export function selectLargestVulkanDevice(
  devices: readonly VulkanDevice[],
): VulkanDevice | undefined {
  const gpus = devices.filter((device) => !device.cpu);
  if (gpus.length < 2) {
    return undefined;
  }
  return gpus.reduce((best, device) =>
    device.deviceLocalMemory > best.deviceLocalMemory ? device : best,
  );
}

export async function listVulkanDevices(): Promise<VulkanDevice[]> {
  const stdout = await runPowerShellScript(SCRIPT);
  return stdout === undefined ? [] : parseVulkanDevices(stdout);
}
