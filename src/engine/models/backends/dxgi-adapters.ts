import { execFile } from "node:child_process";

export type DxgiAdapter = {
  index: number;
  dedicatedVideoMemory: number;
  software: boolean;
};

// DirectML's device_id is an index into IDXGIFactory::EnumAdapters, so query
// that order directly. Node has no DXGI binding; a short PowerShell helper
// compiles the COM interop once per process.
const SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class ZgDxgi {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct DESC1 {
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)] public string Description;
    public uint VendorId, DeviceId, SubSysId, Revision;
    public UIntPtr DedicatedVideoMemory, DedicatedSystemMemory, SharedSystemMemory;
    public uint LuidLow; public int LuidHigh; public uint Flags;
  }
  [ComImport, Guid("770aae78-f26f-4dba-a829-253c83d1b387"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IFactory1 {
    void SetPrivateData(); void SetPrivateDataInterface(); void GetPrivateData(); void GetParent();
    [PreserveSig] int EnumAdapters(uint i, out IntPtr a); void MakeWindowAssociation(); void GetWindowAssociation();
    void CreateSwapChain(); void CreateSoftwareAdapter();
    [PreserveSig] int EnumAdapters1(uint i, out IAdapter1 a); bool IsCurrent();
  }
  [ComImport, Guid("29038f61-3839-4626-91fd-086879011a05"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAdapter1 {
    void SetPrivateData(); void SetPrivateDataInterface(); void GetPrivateData(); void GetParent();
    void EnumOutputs(); void GetDesc(); void CheckInterfaceSupport();
    [PreserveSig] int GetDesc1(out DESC1 d);
  }
  [DllImport("dxgi.dll")] static extern int CreateDXGIFactory1(ref Guid riid, out IFactory1 f);
  public static string List() {
    Guid g = typeof(IFactory1).GUID; IFactory1 f;
    if (CreateDXGIFactory1(ref g, out f) != 0) return "";
    var sb = new System.Text.StringBuilder();
    for (uint i = 0; ; i++) {
      IAdapter1 a; if (f.EnumAdapters1(i, out a) != 0) break;
      DESC1 d; if (a.GetDesc1(out d) != 0) continue;
      sb.AppendFormat("{0}\t{1}\t{2}\n", i, (ulong)d.DedicatedVideoMemory, (d.Flags & 2) != 0 ? 1 : 0);
    }
    return sb.ToString();
  }
}
'@
[ZgDxgi]::List()
`;

export function parseDxgiAdapters(output: string): DxgiAdapter[] {
  const adapters: DxgiAdapter[] = [];
  for (const line of output.split(/\r?\n/)) {
    const [index, memory, software] = line.trim().split("\t");
    if (index === undefined || memory === undefined || software === undefined) {
      continue;
    }
    const parsed = {
      index: Number(index),
      dedicatedVideoMemory: Number(memory),
      software: software === "1",
    };
    if (
      Number.isInteger(parsed.index) &&
      Number.isFinite(parsed.dedicatedVideoMemory)
    ) {
      adapters.push(parsed);
    }
  }
  return adapters;
}

/** The hardware adapter with the most dedicated video memory; ties keep DXGI order. */
export function selectLargestAdapter(
  adapters: readonly DxgiAdapter[],
): number | undefined {
  let best: DxgiAdapter | undefined;
  for (const adapter of adapters) {
    if (
      !adapter.software &&
      (best === undefined ||
        adapter.dedicatedVideoMemory > best.dedicatedVideoMemory)
    ) {
      best = adapter;
    }
  }
  return best?.index;
}

export function listDxgiAdapters(): Promise<DxgiAdapter[]> {
  return runPowerShellScript(SCRIPT).then((stdout) =>
    stdout === undefined ? [] : parseDxgiAdapters(stdout),
  );
}

/** Runs a script with Windows PowerShell; undefined when it fails. */
export function runPowerShellScript(
  script: string,
): Promise<string | undefined> {
  // Here-strings in -EncodedCommand scripts parse reliably only with CRLF.
  const encoded = Buffer.from(
    script.replace(/\r?\n/g, "\r\n"),
    "utf16le",
  ).toString("base64");
  return new Promise((resolve) => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-EncodedCommand", encoded],
      { timeout: 15_000, windowsHide: true },
      (error, stdout) => {
        resolve(error ? undefined : String(stdout));
      },
    );
  });
}

let largestAdapterPromise: Promise<number | undefined> | undefined;

/** Cached per process; undefined when DXGI cannot be queried. */
export function largestDxgiAdapter(): Promise<number | undefined> {
  largestAdapterPromise ??= listDxgiAdapters().then(selectLargestAdapter);
  return largestAdapterPromise;
}
