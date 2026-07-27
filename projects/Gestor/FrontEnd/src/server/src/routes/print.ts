import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

interface PrintRequest {
  texto: string;
  modelo: number;
  porta: string;
  deviceParams: string;
  colunas: number;
  cortarPapel: boolean;
  espacoEntreLinhas: number;
  linhasBuffer: number;
  linhasPular: number;
}

router.post('/cupom', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { texto, modelo, porta, deviceParams, colunas, cortarPapel, espacoEntreLinhas, linhasBuffer, linhasPular } = req.body as PrintRequest;

  if (!texto) {
    res.status(400).json({ error: 'Texto do cupom nao informado' });
    return;
  }

  if (!porta) {
    res.status(400).json({ error: 'Porta da impressora nao configurada. Configure em Configuracoes > Impressao.' });
    return;
  }

  try {
    const { execSync } = require('child_process');
    const fs = require('fs');
    const path = require('path');

    const tempDir = path.resolve(__dirname, '../../data/temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const arquivoTxt = path.join(tempDir, `cupom_${Date.now()}.txt`);
    const linhas = texto.split('\n');

    const conteudo = linhas
      .map((l: string) => {
        if (l.startsWith('</linha_dupla>')) return '='.repeat(colunas || 48);
        if (l.startsWith('</linha_simples>')) return '-'.repeat(colunas || 48);
        if (l.includes('</corte_parcial>')) return '\n\n\n\n';
        if (l.includes('</corte_total>')) return '\n\n\n\n';
        return l;
      })
      .join('\n');

    fs.writeFileSync(arquivoTxt, conteudo, 'utf-8');

    const isWindows = process.platform === 'win32';

    if (isWindows) {
      if (porta.toUpperCase().startsWith('COM') || porta.toUpperCase().startsWith('LPT')) {
        try {
          execSync(`copy "${arquivoTxt}" "${porta}"`, { timeout: 10000 });
        } catch {
          const net = require('net');
          if (porta.toUpperCase().startsWith('TCP:')) {
            const parts = porta.replace('TCP:', '').split(':');
            const host = parts[0];
            const port = parseInt(parts[1] || '9100', 10);
            await new Promise<void>((resolve, reject) => {
              const client = new net.Socket();
              client.connect(port, host, () => {
                client.write(conteudo);
                client.destroy();
                resolve();
              });
              client.on('error', reject);
            });
          } else {
            throw new Error('Porta nao suportada para impressao direta');
          }
        }
      } else if (porta.toUpperCase().startsWith('TCP:')) {
        const net = require('net');
        const parts = porta.replace('TCP:', '').split(':');
        const host = parts[0];
        const port = parseInt(parts[1] || '9100', 10);
        await new Promise<void>((resolve, reject) => {
          const client = new net.Socket();
          client.connect(port, host, () => {
            client.write(conteudo);
            client.destroy();
            resolve();
          });
          client.on('error', reject);
        });
      } else if (porta.startsWith('\\\\')) {
        execSync(`copy "${arquivoTxt}" "${porta}"`, { timeout: 10000 });
      } else {
        execSync(`print /D:"${porta}" "${arquivoTxt}"`, { timeout: 10000 });
      }
    } else {
      if (porta.startsWith('/dev/')) {
        execSync(`cat "${arquivoTxt}" > "${porta}"`, { timeout: 10000 });
      } else if (porta.toUpperCase().startsWith('TCP:')) {
        const net = require('net');
        const parts = porta.replace('TCP:', '').split(':');
        const host = parts[0];
        const port = parseInt(parts[1] || '9100', 10);
        await new Promise<void>((resolve, reject) => {
          const client = new net.Socket();
          client.connect(port, host, () => {
            client.write(conteudo);
            client.destroy();
            resolve();
          });
          client.on('error', reject);
        });
      }
    }

    try { fs.unlinkSync(arquivoTxt); } catch {}

    res.json({ success: true, message: 'Cupom enviado para impressao' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao imprimir';
    console.error('[Print] Erro:', msg);
    res.status(500).json({ error: msg });
  }
});

export default router;
