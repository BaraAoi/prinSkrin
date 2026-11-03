'use strict';

const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

let scriptPath = null;
let cache = { at: 0, list: [] };
let running = null;

/**
 * Перечисление видимых окон Windows.
 * Скрипт кладётся во временную папку, чтобы работать и из app.asar.
 */
const PS1 = String.raw`
$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class PrinSkrinWinEnum
{
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc cb, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern IntPtr GetShellWindow();
    [DllImport("user32.dll")] public static extern IntPtr GetDesktopWindow();
    [DllImport("user32.dll")] public static extern int GetWindowTextLength(IntPtr hWnd);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int max);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
    [DllImport("user32.dll")] public static extern int GetWindowLong(IntPtr hWnd, int index);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
    [DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr hWnd, int attr, out RECT rect, int size);
    [DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttributeInt(IntPtr hWnd, int attr, out int value, int size);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }

    const int GWL_EXSTYLE = -20;
    const int WS_EX_TOOLWINDOW = 0x00000080;
    const int DWMWA_EXTENDED_FRAME_BOUNDS = 9;
    const int DWMWA_CLOAKED = 14;

    public static string Collect()
    {
        var sb = new StringBuilder();
        IntPtr shell = GetShellWindow();
        IntPtr desktop = GetDesktopWindow();

        EnumWindows(delegate (IntPtr hWnd, IntPtr lParam)
        {
            try
            {
                if (hWnd == shell || hWnd == desktop) return true;
                if (!IsWindowVisible(hWnd)) return true;
                if (IsIconic(hWnd)) return true;
                if ((GetWindowLong(hWnd, GWL_EXSTYLE) & WS_EX_TOOLWINDOW) != 0) return true;
                if (GetWindowTextLength(hWnd) == 0) return true;

                int cloaked = 0;
                if (DwmGetWindowAttributeInt(hWnd, DWMWA_CLOAKED, out cloaked, 4) == 0 && cloaked != 0) return true;

                RECT rect;
                if (DwmGetWindowAttribute(hWnd, DWMWA_EXTENDED_FRAME_BOUNDS, out rect, Marshal.SizeOf(typeof(RECT))) != 0)
                {
                    if (!GetWindowRect(hWnd, out rect)) return true;
                }

                int width = rect.Right - rect.Left;
                int height = rect.Bottom - rect.Top;
                if (width < 40 || height < 40) return true;

                var title = new StringBuilder(GetWindowTextLength(hWnd) + 2);
                GetWindowText(hWnd, title, title.Capacity);

                uint pid;
                GetWindowThreadProcessId(hWnd, out pid);

                string clean = title.ToString().Replace("|", " ").Replace("\r", " ").Replace("\n", " ").Trim();
                if (clean.Length == 0) return true;

                sb.Append(hWnd.ToInt64()).Append('|')
                  .Append(rect.Left).Append('|')
                  .Append(rect.Top).Append('|')
                  .Append(width).Append('|')
                  .Append(height).Append('|')
                  .Append(pid).Append('|')
                  .Append(clean).Append('\n');
            }
            catch { }
            return true;
        }, IntPtr.Zero);

        return sb.ToString();
    }
}
"@

$raw = [PrinSkrinWinEnum]::Collect()
$result = @()
foreach ($line in $raw.Split([char]10)) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    $parts = $line.Split([char[]]@('|'), 7)
    if ($parts.Count -lt 7) { continue }
    $result += [pscustomobject]@{
        hwnd   = $parts[0]
        x      = [int]$parts[1]
        y      = [int]$parts[2]
        width  = [int]$parts[3]
        height = [int]$parts[4]
        pid    = [int]$parts[5]
        title  = $parts[6].Trim()
    }
}
if ($result.Count -eq 0) { '[]' } else { ConvertTo-Json -InputObject @($result) -Compress }
`;

function ensureScript() {
  if (scriptPath) return scriptPath;
  const target = path.join(os.tmpdir(), 'prinskrin-window-list.ps1');
  try {
    fs.writeFileSync(target, '\uFEFF' + PS1, 'utf8');
    scriptPath = target;
  } catch (error) {
    console.error('[prinSkrin] не удалось записать PS-скрипт:', error.message);
  }
  return scriptPath;
}

function parse(stdout) {
  const text = String(stdout || '').replace(/^\uFEFF/, '').trim();
  if (!text) return [];
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return [];
  }
  const list = Array.isArray(data) ? data : [data];
  return list
    .filter((item) => item && Number.isFinite(Number(item.x)) && Number.isFinite(Number(item.width)))
    .filter((item) => Number(item.width) >= 40 && Number(item.height) >= 40)
    .map((item) => ({
      hwnd: String(item.hwnd),
      x: Number(item.x),
      y: Number(item.y),
      width: Number(item.width),
      height: Number(item.height),
      pid: Number(item.pid),
      title: String(item.title || '').trim(),
    }))
    .filter((item) => item.pid !== process.pid);
}

function listWindows({ maxAge = 600 } = {}) {
  if (process.platform !== 'win32') return Promise.resolve([]);
  if (running) return running;
  if (Date.now() - cache.at < maxAge) return Promise.resolve(cache.list);

  const script = ensureScript();
  if (!script) return Promise.resolve([]);

  running = new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-NoLogo', '-ExecutionPolicy', 'Bypass', '-File', script],
      { windowsHide: true, timeout: 6000, maxBuffer: 8 * 1024 * 1024, encoding: 'utf8' },
      (error, stdout) => {
        running = null;
        if (error) {
          console.error('[prinSkrin] window list:', error.message);
          cache = { at: Date.now(), list: [] };
          return resolve([]);
        }
        const list = parse(stdout);
        cache = { at: Date.now(), list };
        resolve(list);
      },
    );
  });

  return running;
}

module.exports = { listWindows };
