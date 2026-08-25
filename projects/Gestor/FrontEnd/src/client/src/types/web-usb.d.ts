declare interface USBDevice {
  vendorId: number;
  productId: number;
  productName?: string;
  serialNumber?: string;
  configuration?: {
    interfaces: {
      interfaceNumber: number;
      alternate: {
        interfaceClass: number;
        endpoints: {
          endpointNumber: number;
          direction: 'in' | 'out';
          type: string;
        }[];
      };
    }[];
  };
  open(): Promise<void>;
  close(): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  transferOut(endpointNumber: number, data: Uint8Array): Promise<unknown>;
}

interface USB {
  getDevices(): Promise<USBDevice[]>;
  requestDevice(options: { filters?: { vendorId?: number; productId?: number; classCode?: number }[] }): Promise<USBDevice>;
}

interface Navigator {
  usb?: USB;
}