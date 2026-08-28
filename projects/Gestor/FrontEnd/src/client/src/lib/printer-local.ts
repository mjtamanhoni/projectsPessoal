export interface ImpressoraLocal {
  nome: string;
  porta: string;
  vendorId: string;
  productId: string;
}

export function webusbDisponivel(): boolean {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as unknown as Record<string, unknown>;
  if (!nav.usb) return false;
  if (typeof window !== 'undefined' && window.isSecureContext === false) return false;
  return true;
}

export function diagnosWebUSB(): string {
  if (typeof navigator === 'undefined') return 'navigator indisponivel';
  const nav = navigator as unknown as Record<string, unknown>;
  if (!nav.usb) return 'navigator.usb nao existe - verifique se esta em HTTPS ou localhost';
  if (typeof window !== 'undefined' && window.isSecureContext === false) return 'Contexto inseguro - use HTTPS ou localhost';
  return 'ok';
}

function hex4(n: number): string {
  return n.toString(16).padStart(4, '0').toUpperCase();
}

function toImpressora(device: USBDevice): ImpressoraLocal {
  return {
    nome: device.productName || `Impressora USB ${hex4(device.vendorId)}:${hex4(device.productId)}`,
    porta: `USB:${hex4(device.vendorId)}:${hex4(device.productId)}`,
    vendorId: hex4(device.vendorId),
    productId: hex4(device.productId),
  };
}

function ehImpressora(device: USBDevice): boolean {
  return Boolean(device.configuration?.interfaces.some((i) => i.alternate.interfaceClass === 7));
}

export async function listarImpressorasUSB(): Promise<ImpressoraLocal[]> {
  if (!webusbDisponivel()) return [];
  try {
    const devices = await navigator.usb!.getDevices();
    return devices.filter(ehImpressora).map(toImpressora);
  } catch {
    return [];
  }
}

export async function listarDispositivosUSB(): Promise<ImpressoraLocal[]> {
  if (!webusbDisponivel()) return [];
  try {
    const devices = await navigator.usb!.getDevices();
    return devices.map(toImpressora);
  } catch {
    return [];
  }
}

export async function solicitarImpressoraUSB(): Promise<ImpressoraLocal | null> {
  if (!webusbDisponivel()) return null;
  try {
    const device = await navigator.usb!.requestDevice({ filters: [{ classCode: 7 }] });
    return toImpressora(device);
  } catch {
    return null;
  }
}

export async function imprimirTesteUSB(porta: string): Promise<void> {
  const m = porta.match(/^USB:([0-9A-Fa-f]{4}):([0-9A-Fa-f]{4})$/);
  if (!m) throw new Error('Porta USB invalida para impressao direta');
  if (!webusbDisponivel()) throw new Error('WebUSB nao disponivel neste navegador (use Chrome/Edge com HTTPS)');
  const vendorId = parseInt(m[1], 16);
  const productId = parseInt(m[2], 16);
  const devices = await navigator.usb!.getDevices();
  const device = devices.find((d) => d.vendorId === vendorId && d.productId === productId);
  if (!device) throw new Error('Impressora USB nao encontrada (clique em "Localizar Impressora" antes)');

  await device.open();
  try {
    const iface =
      device.configuration?.interfaces.find((i) => i.alternate.interfaceClass === 7) ??
      device.configuration?.interfaces[0];
    if (!iface) throw new Error('Impressora sem interface de impressao');
    await device.claimInterface(iface.interfaceNumber);
    const endpoint = iface.alternate.endpoints.find((e) => e.direction === 'out');
    if (!endpoint) throw new Error('Impressora sem endpoint de saida');

    const texto =
      '*** TESTE DE IMPRESSÃO TÉRMICA ***\n\nImpressora localizada e configurada com sucesso.\n\nSistema Gestor\n\n\n';
    const bytes = new Uint8Array([0x1b, 0x40, ...new TextEncoder().encode(texto), 0x1d, 0x56, 0x42, 0x00]);
    await device.transferOut(endpoint.endpointNumber, bytes);
  } finally {
    try {
      await device.close();
    } catch {
      // ignore
    }
  }
}