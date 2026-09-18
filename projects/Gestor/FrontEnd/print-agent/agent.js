#!/usr/bin/env node
/**
 * Gestor Print Agent v2
 *
 * Roda no PC local (onde a impressora USB esta conectada).
 * Recebe dados ESC/POS do BFF remoto e imprime.
 *
 * Suporta QUALQUER impressora termica USB:
 *   Epson, Star, Bixolon, Citizen, Xprinter, Elgin, NCR, etc.
 *
 * Metodos de impressao (em ordem de prioridade):
 *   1. USB direto via node-escpos (requer WinUSB via Zadig)
 *   2. Spooler Windows (WritePrinter, print /D, copy /b)
 *
 * Uso:
 *   node agent.js <URL_BFF> [INTERVALO_MS]
 *
 * Requisitos:
 *   - Node.js instalado no PC local
 *   - Para USB direto: driver WinUSB instalado via Zadig
 *     (execute setup-winusb.bat uma vez por impressora)
 */

const http = require('http');
const https = require('https');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const BFF_URL = (process.argv[2] || 'http://localhost:3001').replace(/\/+$/, '');
const POLL_INTERVAL = parseInt(process.argv[3] || '3000', 10);
const AGENT_ID = 'agent-' + crypto.randomBytes(4).toString('hex');
const TEMP_DIR = path.join(os.tmpdir(), 'gestor-print-agent');
const AGENT_DIR = __dirname;

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

const isHttps = BFF_URL.startsWith('https');
const httpModule = isHttps ? https : http;

let connected = false;
let printers = [];
let usbReady = false;

// =============================================
// Identificacao de impressoras termicas
// =============================================
const THERMAL_BRANDS = [
  'EPSON', 'STAR', 'BIXOLON', 'CITIZEN', 'XPRINTER', 'ELGIN',
  'GAINSCHA', 'WOOSIM', 'SEWOO', 'SPRT', 'MUNBYN', 'PERI',
  'NCR', 'HONEYWELL', 'ZEBRA', 'TSC', 'DATAMAX', 'SATO',
  'JOLIMARK', 'RONGTA', 'GODEX', 'ARGOX', 'POSTEK',
  'SONY', 'SAMSUNG', 'LG', 'BROTHER', 'CANON', 'HEWLETT',
  'RICOH', 'KONICA', 'MINOLTA', 'KYOCERA', 'LEXMARK',
  'DALI', 'MEYER', 'WOOSIM', 'SEWOO', 'TRANSCOM', 'SIGN',
];

const THERMAL_KEYWORDS = [
  'receipt', 'thermal', 'pos', 'printer', 'ticket', 'coupon',
  'impressora', 'termica', 'cupom', 'tm-t', 'tm-t20', 'tm-t88',
  'tpv', 'fiscal', 'nfce', 'sat',
];

// Impressoras virtuais - NAO devem ser usadas para impressao
const VIRTUAL_PRINTERS = [
  'ONENOTE', 'PDF', 'XPS', 'MICROSOFT PRINT', 'FOXIT', 'CUTE',
  'ADOBE', 'PRINT TO', 'SEND TO', 'FAX', 'PRINT TO PDF',
  'MICROSOFT XPS', 'DOCUPRINT', 'VIRTUAL', 'TORRENT',
  'CLIPBOARD', 'WINDOW', 'NOTE', 'SNIP', 'SCREENSHOT',
];

// Portas virtuais - nao sao impressoras fisicas
const VIRTUAL_PORTS = ['TS', 'NUL', 'PDF', 'XPS', 'FILE:'];

const CONFIG_FILE = path.join(AGENT_DIR, 'printer-config.json');

function isVirtualPrinter(name, port) {
  const upperName = (name || '').toUpperCase();
  const upperPort = (port || '').toUpperCase();
  if (VIRTUAL_PRINTERS.some(v => upperName.includes(v))) return true;
  if (VIRTUAL_PORTS.some(v => upperPort.startsWith(v))) return true;
  return false;
}

function isThermalPrinter(name) {
  const upper = (name || '').toUpperCase();
  if (THERMAL_BRANDS.some(b => upper.includes(b))) return true;
  if (THERMAL_KEYWORDS.some(k => upper.includes(k))) return true;
  return false;
}

function isPhysicalPort(port) {
  const upper = (port || '').toUpperCase();
  return upper.startsWith('USB') || upper.startsWith('COM') || upper.startsWith('LPT') || upper.startsWith('TCP');
}

function loadPrinterConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch {}
  return null;
}

function savePrinterConfig(printerName) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ selectedPrinter: printerName }, null, 2), 'utf-8');
  } catch {}
}

// =============================================
// Utilitarios
// =============================================
function log(msg) {
  const ts = new Date().toLocaleTimeString('pt-BR');
  console.log(`[${ts}] ${msg}`);
}

function httpGet(urlPath) {
  return new Promise((resolve, reject) => {
    const fullUrl = new URL(urlPath, BFF_URL);
    const req = httpModule.get(fullUrl.toString(), { timeout: 30000 }, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve(body); } });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function httpPost(urlPath, data) {
  return new Promise((resolve, reject) => {
    const fullUrl = new URL(urlPath, BFF_URL);
    const body = JSON.stringify(data);
    const options = {
      hostname: fullUrl.hostname,
      port: fullUrl.port,
      path: fullUrl.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 15000,
    };
    const proto = isHttps ? https : http;
    const req = proto.request(options, (res) => {
      let resp = '';
      res.on('data', (chunk) => (resp += chunk));
      res.on('end', () => { try { resolve(JSON.parse(resp)); } catch { resolve(resp); } });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

function listLocalPrinters() {
  try {
    const raw = execSync(
      'powershell -NoProfile -NonInteractive -Command "Get-Printer | Select-Object Name, PortName | ConvertTo-Json -Compress"',
      { encoding: 'utf-8', timeout: 10000, stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

function detectUsbDevices() {
  try {
    const raw = execSync(
      `powershell -NoProfile -NonInteractive -Command "` +
      `Get-PnpDevice -Class USB -Status OK 2>$null | ` +
      `Select-Object FriendlyName, InstanceId | ` +
      `ConvertTo-Json -Compress"`,
      { encoding: 'utf-8', timeout: 10000, stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
  } catch {
    return [];
  }
}

function cleanup(...files) {
  for (const f of files) { try { fs.unlinkSync(f); } catch {} }
}

// =============================================
// Setup: verificar e instalar dependencias npm
// =============================================
function ensureNpmDeps() {
  const nodeModules = path.join(AGENT_DIR, 'node_modules');
  const needsInstall = !fs.existsSync(nodeModules) || (() => {
    try { require.resolve('escpos', { paths: [AGENT_DIR] }); return false; } catch { return true; }
  })();

  if (!needsInstall) return true;

  log('Instalando dependencias npm...');
  try {
    execSync('npm install --production', { cwd: AGENT_DIR, timeout: 120000, stdio: 'pipe' });
    log('Dependencias npm instaladas com sucesso');
    return true;
  } catch (err) {
    log('ERRO ao instalar dependencias npm: ' + (err instanceof Error ? err.message : String(err)));
    log('Execute manualmente: cd ' + AGENT_DIR + ' && npm install --production');
    return false;
  }
}

// =============================================
// Verificar se WinUSB esta disponivel
// =============================================
function checkWinUSB() {
  try {
    const devices = detectUsbDevices();
    return devices.length > 0;
  } catch {
    return false;
  }
}

// =============================================
// Metodo 1: Impressao USB direta via node-escpos
// Funciona com QUALQUER impressora ESC/POS:
//   Epson, Star, Bixolon, Citizen, Xprinter, Elgin, etc.
// =============================================
function printViaEscpos(base64Data) {
  return new Promise((resolve, reject) => {
    const binFile = path.join(TEMP_DIR, `escpos_job_${Date.now()}.bin`);
    fs.writeFileSync(binFile, Buffer.from(base64Data, 'base64'));

    const escposScript = `
const escpos = require('escpos');
escpos.USB = require('escpos-usb');
const fs = require('fs');

const binData = fs.readFileSync('${binFile.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}');

let device;
try {
  device = new escpos.USB();
} catch (e) {
  console.log('USB_NAO_ENCONTRADO: Nenhuma impressora ESC/POS USB detectada.');
  process.exit(1);
}

device.open(function(err) {
  if (err) {
    console.log('USB_ERROR: ' + err.message);
    process.exit(1);
  }
  device.write(binData, function(err) {
    if (err) {
      console.log('WRITE_ERROR: ' + err.message);
      device.close();
      process.exit(1);
    }
    device.close(function() {
      console.log('USB_OK:' + binData.length);
      process.exit(0);
    });
  });
});
`;

    const scriptFile = path.join(TEMP_DIR, `escpos_script_${Date.now()}.js`);
    fs.writeFileSync(scriptFile, escposScript, 'utf-8');

    try {
      const result = execSync(`node "${scriptFile}"`, {
        cwd: AGENT_DIR,
        env: { ...process.env, NODE_PATH: path.join(AGENT_DIR, 'node_modules') },
        encoding: 'utf-8',
        timeout: 15000,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      cleanup(binFile, scriptFile);
      const output = (result || '').trim();
      if (output.includes('USB_OK')) {
        resolve({ ok: true, result: 'USB direto OK: ' + output });
      } else {
        reject(new Error(output || 'Resposta vazia do escpos'));
      }
    } catch (err) {
      cleanup(scriptFile);
      const stderr = err.stderr ? err.stderr.toString() : '';
      const stdout = err.stdout ? err.stdout.toString() : '';
      const msg = stderr || stdout || (err instanceof Error ? err.message : String(err));
      reject(new Error('escpos: ' + msg));
    }

    try { fs.unlinkSync(binFile); } catch {}
  });
}

// =============================================
// Metodo 2 (Fallback): Spooler Windows
// Funciona com impressoras que usam portas padrao:
//   USB001, USB002, COM*, LPT*, TCP:*
// =============================================
function printViaSpooler(printerName, base64Data, portName) {
  const binFile = path.join(TEMP_DIR, `spooler_job_${Date.now()}.bin`);
  const logFile = path.join(TEMP_DIR, `print_log_${Date.now()}.txt`);
  fs.writeFileSync(binFile, Buffer.from(base64Data, 'base64'));
  const log = [];
  const errors = [];

  function logMsg(msg) {
    const ts = new Date().toLocaleTimeString('pt-BR');
    log.push(`[${ts}] ${msg}`);
  }

  logMsg('=== FALLBACK: SPOOLER WINDOWS ===');
  logMsg('Impressora: ' + printerName);
  logMsg('Porta: ' + (portName || 'desconhecida'));
  logMsg('Tamanho: ' + fs.statSync(binFile).size + ' bytes');
  logMsg('Arquivo: ' + binFile);

  // Metodo A: print /D (cmd.exe)
  logMsg('--- Metodo A: print /D ---');
  try {
    const cmdResult = execSync(
      'cmd /c print /D:"' + printerName + '" "' + binFile + '"',
      { timeout: 10000, stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf-8' }
    );
    logMsg('print /D stdout: ' + (cmdResult || '').trim());
    if (!fs.existsSync(binFile)) {
      logMsg('Arquivo consumido pelo spooler - impressao enviada');
      fs.writeFileSync(logFile, log.join('\n'), 'utf-8');
      return { ok: true, result: 'print /D OK (arquivo enviado ao spooler)', logFile };
    }
    logMsg('Arquivo ainda existe - print /D pode nao ter funcionado, tentando proximo metodo');
  } catch (err) {
    logMsg('print /D FALHOU: ' + (err instanceof Error ? err.message : String(err)));
    errors.push('print/D: ' + (err instanceof Error ? err.message : String(err)));
  }

  // Metodo B: WritePrinter via PowerShell/C#
  logMsg('--- Metodo B: WritePrinter ---');
  const ps1File = path.join(TEMP_DIR, `spooler_job_${Date.now()}.ps1`);
  const binEsc = binFile.replace(/\\/g, '\\\\').replace(/'/g, "''");
  const nameEsc = printerName.replace(/'/g, "''");
  const ps1 = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class RawPrinter {
  [DllImport("winspool.drv", CharSet=CharSet.Auto, SetLastError=true)]
  public static extern bool OpenPrinter(string pPrinterName, out IntPtr hPrinter, IntPtr pDefault);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool ClosePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, int level, ref DOCINFOA di);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBuf, int cbBuf, out int pcWritten);
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Ansi)]
  public struct DOCINFOA {
    [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)] public string pDatatype;
  }
  public static string Send(string printer, string file) {
    try {
      IntPtr h;
      if (!OpenPrinter(printer, out h, IntPtr.Zero))
        return "OpenPrinter FALHOU: " + Marshal.GetLastWin32Error();
      try {
        byte[] bytes = System.IO.File.ReadAllBytes(file);
        var di = new DOCINFOA();
        di.pDocName = "ESC/POS";
        di.pOutputFile = null;
        di.pDatatype = "RAW";
        StartDocPrinter(h, 1, ref di);
        StartPagePrinter(h);
        IntPtr p = Marshal.AllocCoTaskMem(bytes.Length);
        try {
          Marshal.Copy(bytes, 0, p, bytes.Length);
          int written;
          bool ok = WritePrinter(h, p, bytes.Length, out written);
          if (!ok) return "WritePrinter FALHOU: " + Marshal.GetLastWin32Error();
          EndPagePrinter(h);
          EndDocPrinter(h);
          return "OK:" + written + " bytes";
        } finally { Marshal.FreeCoTaskMem(p); }
      } finally { ClosePrinter(h); }
    } catch (Exception ex) { return "ERRO: " + ex.Message; }
  }
}
"@
$r = [RawPrinter]::Send('${nameEsc}', '${binEsc}')
Write-Output $r
`;
  fs.writeFileSync(ps1File, ps1, 'utf-8');
  try {
    const result = execSync('powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "' + ps1File + '"', { encoding: 'utf-8', timeout: 15000, stdio: ['pipe', 'pipe', 'pipe'] });
    logMsg('WritePrinter resultado: ' + result.trim());
    if (!result.trim().includes('FALHOU')) {
      cleanup(binFile, ps1File);
      fs.writeFileSync(logFile, log.join('\n'), 'utf-8');
      return { ok: true, result: 'WritePrinter OK', logFile };
    }
    errors.push('WritePrinter: ' + result.trim());
  } catch (err) {
    logMsg('WritePrinter ERRO: ' + (err instanceof Error ? err.message : String(err)));
    errors.push('WritePrinter');
  }
  try { fs.unlinkSync(ps1File); } catch {}

  // Metodo C: PowerShell Out-Printer (envia como texto bruto)
  logMsg('--- Metodo C: Out-Printer ---');
  if (printerName) {
    try {
      const buf = fs.readFileSync(binFile);
      const textContent = buf.toString('utf-8');
      const escaped = textContent.replace(/"/g, '""');
      execSync(
        'powershell -NoProfile -NonInteractive -Command "' + escaped + ' | Out-Printer -Name \\"' + printerName.replace(/"/g, '""') + '\\""',
        { timeout: 15000, stdio: 'pipe' }
      );
      logMsg('Out-Printer executou');
      cleanup(binFile);
      fs.writeFileSync(logFile, log.join('\n'), 'utf-8');
      return { ok: true, result: 'Out-Printer OK', logFile };
    } catch (err) {
      logMsg('Out-Printer FALHOU: ' + (err instanceof Error ? err.message : String(err)));
      errors.push('Out-Printer');
    }
  }

  cleanup(binFile);
  logMsg('=== FIM - Todos os metodos spooler falharam ===');
  logMsg('Metodos testados: ' + errors.length);
  errors.forEach((e, i) => logMsg('  ' + (i + 1) + '. ' + e));
  fs.writeFileSync(logFile, log.join('\n'), 'utf-8');
  return { ok: false, error: 'Todos os metodos spooler falharam. Verifique o log: ' + logFile, logFile };
}

// =============================================
// Funcao principal de impressao
// =============================================
async function printJob(printerName, base64Data, portName) {
  // Rejeitar impressoras virtuais
  if (isVirtualPrinter(printerName, portName)) {
    return { ok: false, error: 'Impressora "' + printerName + '" e virtual (porta ' + (portName || '?') + '). Selecione uma impressora termica no Settings.' };
  }

  // Tentar USB direto primeiro (funciona com qualquer impressora ESC/POS)
  if (usbReady) {
    log('Tentando impressao via USB direto (node-escpos)...');
    try {
      const result = await printViaEscpos(base64Data);
      return { ok: true, result: result.result, logFile: null };
    } catch (err) {
      log('USB direto falhou: ' + err.message);
      log('Tentando fallback via spooler Windows...');
    }
  }

  // Fallback: spooler Windows
  return printViaSpooler(printerName, base64Data, portName);
}

// =============================================
// Registro no BFF
// =============================================
async function register() {
  try {
    const localPrinters = listLocalPrinters();
    printers = localPrinters;

    // Classificar impressoras
    const validPrinters = localPrinters.filter(p => !isVirtualPrinter(p.Name, p.PortName));
    const thermalPrinters = validPrinters.filter(p => isThermalPrinter(p.Name));
    const physicalPrinters = validPrinters.filter(p => isPhysicalPort(p.PortName));

    // Verificar impressoras redirecionadas (RDP)
    const hasRedirected = localPrinters.some(p => (p.PortName || '').toUpperCase().startsWith('TS'));
    if (hasRedirected) {
      log('');
      log('*** ATENCAO: impressoras redirecionadas detectadas (porta TS) ***');
      log('*** O agent parece estar rodando VIA RDP no SERVIDOR.      ***');
      log('*** Execute este script no PC LOCAL (onde a USB esta).      ***');
      log('');
    }

    // Selecionar impressora - prioridade:
    // 1. Config salva pelo usuario
    // 2. Impressora termica por marca (Epson, Star, Bixolon, etc.)
    // 3. Impressora com porta fisica (USB, COM, LPT)
    // 4. Primeira impressora nao-virtual
    const config = loadPrinterConfig();
    let selectedPrinter = null;

    if (config && config.selectedPrinter) {
      const exists = localPrinters.find(p => p.Name === config.selectedPrinter);
      if (exists) {
        selectedPrinter = config.selectedPrinter;
        log('Usando impressora do config: ' + selectedPrinter);
      } else {
        log('Impressora do config nao encontrada: ' + config.selectedPrinter + ' (usando auto-deteccao)');
      }
    }

    if (!selectedPrinter && thermalPrinters.length > 0) {
      selectedPrinter = thermalPrinters[0].Name;
      log('Impressora termica detectada automaticamente: ' + selectedPrinter);
    } else if (!selectedPrinter && physicalPrinters.length > 0) {
      selectedPrinter = physicalPrinters[0].Name;
      log('Impressora fisica detectada: ' + selectedPrinter);
    } else if (!selectedPrinter && validPrinters.length > 0) {
      selectedPrinter = validPrinters[0].Name;
      log('Usando primeira impressora disponivel: ' + selectedPrinter);
    }

    const result = await httpPost('/api/print/agent/register', {
      agentId: AGENT_ID,
      printers: localPrinters.map(p => ({ name: p.Name, port: p.PortName })),
      selectedPrinter,
    });
    connected = true;
    log('Conectado ao BFF: ' + BFF_URL);
    log('Impressoras encontradas: ' + localPrinters.length + ' (' + validPrinters.length + ' fisicas, ' + thermalPrinters.length + ' termicas)');
    localPrinters.forEach(p => {
      const virt = isVirtualPrinter(p.Name, p.PortName) ? ' [VIRTUAL]' : '';
      const termica = isThermalPrinter(p.Name) ? ' [TERMICA]' : '';
      const fisica = isPhysicalPort(p.PortName) ? ' [FISICA]' : '';
      log('  - ' + p.Name + ' [' + p.PortName + ']' + termica + fisica + virt);
    });
    log('Impressora selecionada: ' + (selectedPrinter || 'NENHUMA - configure manualmente no Settings'));
    return result;
  } catch (err) {
    connected = false;
    log('Erro ao conectar: ' + err.message);
    return null;
  }
}

// =============================================
// Controle de reconexao
// =============================================
let pollFailCount = 0;
const MAX_POLL_FAILS_BEFORE_REREGISTER = 3;
const REREGISTER_INTERVAL_MS = 30000;
let lastReregisterAttempt = 0;

async function tryReregister() {
  const now = Date.now();
  if (now - lastReregisterAttempt < REREGISTER_INTERVAL_MS) return;
  lastReregisterAttempt = now;
  log('Tentando re-registrar no BFF...');
  const result = await register();
  if (result && result.ok) {
    log('Re-registrado com sucesso!');
    pollFailCount = 0;
  }
}

// =============================================
// Polling de jobs
// =============================================
async function poll() {
  if (!connected) {
    await tryReregister();
    return;
  }

  try {
    const result = await httpGet('/api/print/agent/poll?agentId=' + AGENT_ID);
    pollFailCount = 0;

    if (result && typeof result === 'object' && result.error) {
      log('BFF retornou erro no poll: ' + result.error);
      connected = false;
      await tryReregister();
      return;
    }

    // BFF pode mandar mudanca de impressora
    if (result && result.setPrinter) {
      const newPrinter = result.setPrinter;
      const exists = printers.find(p => p.Name === newPrinter);
      if (exists) {
        savePrinterConfig(newPrinter);
        log('Impressora alterada para: ' + newPrinter);
      } else {
        log('Impressora "' + newPrinter + '" nao encontrada localmente');
      }
    }

    if (result && result.job) {
      const job = result.job;
      log('Recebido job #' + job.id + ' (' + job.data.length + ' bytes base64)');

      const printerName = job.printer || printers[0]?.Name;
      if (!printerName) {
        log('ERRO: Nenhuma impressora configurada');
        await httpPost('/api/print/agent/result', { jobId: job.id, ok: false, error: 'Nenhuma impressora local' });
        return;
      }

      const printerObj = printers.find(p => p.Name === printerName);
      const portName = printerObj ? printerObj.PortName : null;

      log('Imprimindo em: ' + printerName + ' [porta: ' + (portName || '?') + ']');

      const printResult = await printJob(printerName, job.data, portName);

      if (printResult.ok) {
        log('*** Impressao OK: ' + printResult.result + ' ***');
      } else {
        log('*** ERRO impressao ***');
        log(printResult.error);
      }
      if (printResult.logFile) {
        log('Log completo salvo em: ' + printResult.logFile);
      }

      await httpPost('/api/print/agent/result', {
        jobId: job.id,
        ok: printResult.ok,
        error: printResult.error || undefined,
        result: printResult.result,
      });
    }
  } catch (err) {
    if (err.message !== 'timeout') {
      log('Erro no poll: ' + err.message);
      pollFailCount++;
      if (pollFailCount >= MAX_POLL_FAILS_BEFORE_REREGISTER) {
        log('Poll falhou ' + pollFailCount + ' vezes - reconectando...');
        connected = false;
        await tryReregister();
      }
    }
  }
}

// =============================================
// Main
// =============================================
async function main() {
  console.log('');
  console.log('  ================================================');
  console.log('   Gestor Print Agent v2');
  console.log('   Impressao termica USB - Multi-impressoras');
  console.log('  ================================================');
  console.log('');
  log('BFF: ' + BFF_URL);
  log('Agent ID: ' + AGENT_ID);
  log('Poll interval: ' + POLL_INTERVAL + 'ms');
  console.log('');

  // Verificar dependencias npm
  log('Verificando dependencias...');
  const npmOk = ensureNpmDeps();
  if (npmOk) {
    log('Dependencias OK - USB direto disponivel');
    usbReady = true;
  } else {
    log('AVISO: Dependencias npm nao disponivel. Usando apenas spooler.');
  }

  // Verificar WinUSB
  if (usbReady) {
    const usbDevices = detectUsbDevices();
    if (usbDevices.length > 0) {
      log('Devices USB detectados: ' + usbDevices.length);
      usbDevices.forEach(d => {
        log('  - ' + (d.FriendlyName || d.InstanceId || 'desconhecido'));
      });
    } else {
      log('AVISO: Nenhum device USB detectado.');
      log('Para USB direto, execute setup-winusb.bat para instalar o driver WinUSB.');
    }
  }

  await register();

  setInterval(poll, POLL_INTERVAL);

  // Re-registrar periodicamente para sobreviver a restarts do BFF
  setInterval(async () => {
    if (!connected) return;
    try {
      const config = loadPrinterConfig();
      const currentPrinter = config?.selectedPrinter || printers.find(p => isThermalPrinter(p.Name))?.Name || printers[0]?.Name || null;
      await httpPost('/api/print/agent/register', {
        agentId: AGENT_ID,
        printers: printers.map(p => ({ name: p.Name, port: p.PortName })),
        selectedPrinter: currentPrinter,
      });
    } catch {
      log('Heartbeat falhou - BFF pode ter reiniciado');
      connected = false;
    }
  }, REREGISTER_INTERVAL_MS);

  log('Aguardando jobs de impressao...');
}

main();
