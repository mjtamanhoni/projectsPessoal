export * from './tipos';
export * from './erros';
export * from './titulos';
export * from './config';
export * from './licenca';
export * from './seguranca';
export * from './backup';

export const VERSAO_APP: string =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';
