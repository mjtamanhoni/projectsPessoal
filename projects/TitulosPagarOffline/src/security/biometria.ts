import { Capacitor } from '@capacitor/core';
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';

export async function biometriaDisponivel(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const resultado = await BiometricAuth.checkBiometry();
    return Boolean(resultado.isAvailable);
  } catch {
    return false;
  }
}

export async function autenticarBiometria(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    await BiometricAuth.authenticate({
      reason: 'Desbloquear o Títulos a Pagar',
      cancelTitle: 'Cancelar',
      androidTitle: 'Desbloquear',
      androidSubtitle: 'Confirme sua identidade',
      allowDeviceCredential: false,
    });
    return true;
  } catch {
    return false;
  }
}
