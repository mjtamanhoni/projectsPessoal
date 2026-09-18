import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { buildPDFWithHeader, viewPDF, downloadPDF } from './pdf';
import type { Encomenda, EncomendaItem } from '@/types';

const COLORS: Record<string, [number, number, number]> = {
  primary: [34, 197, 94],
  primaryDark: [22, 163, 74],
  danger: [239, 68, 68],
  gray: [100, 116, 139],
  lightGray: [241, 245, 249],
  white: [255, 255, 255],
  black: [15, 23, 42],
};

function formatCurrencyPDF(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateBR(dateStr: string): string {
  const d = new Date(`${dateStr.slice(0, 10)}T12:00:00`);
  return d.toLocaleDateString('pt-BR');
}

function getProductName(item: EncomendaItem): string {
  return item.produto_nome || item.produto_venda_nome || 'Produto';
}

interface DadosRelatorio {
  encomendas: Encomenda[];
  itensPorEncomenda: Record<number, EncomendaItem[]>;
  dataFiltro: string;
}

// ─── RELATÓRIO SINTÉTICO ───────────────────────────────────────────

export function gerarRelatorioSintetico(dados: DadosRelatorio): jsPDF {
  const { encomendas, dataFiltro } = dados;

  const realizadas = encomendas.filter((e) => (e.status ?? 0) !== 5);
  const canceladas = encomendas.filter((e) => (e.status ?? 0) === 5);

  const qtdRealizadas = realizadas.length;
  const valorRealizadas = realizadas.reduce((s, e) => s + Number(e.valor_total || 0), 0);
  const qtdCanceladas = canceladas.length;
  const valorCanceladas = canceladas.reduce((s, e) => s + Number(e.valor_total || 0), 0);
  const qtdTotal = encomendas.length;
  const valorTotal = encomendas.reduce((s, e) => s + Number(e.valor_total || 0), 0);

  const doc = buildPDFWithHeader(
    {
      title: 'Relatório Sintético de Encomendas',
      emissionDate: new Date().toLocaleDateString('pt-BR'),
      filters: [`Data: ${formatDateBR(dataFiltro)}`],
    },
    (d, drawPageHeader) => {
      if (drawPageHeader) drawPageHeader(d);

      const pageWidth = d.internal.pageSize.getWidth();
      const margin = 14;
      const cardWidth = (pageWidth - margin * 2 - 12) / 2;
      const cardHeight = 42;
      let y = 44;

      // ── Card Vendas Realizadas ──
      d.setFillColor(...COLORS.primary);
      d.roundedRect(margin, y, cardWidth, cardHeight, 4, 4, 'F');

      d.setFontSize(11);
      d.setFont('helvetica', 'bold');
      d.setTextColor(...COLORS.white);
      d.text('Vendas Realizadas', margin + 10, y + 12);

      d.setFontSize(28);
      d.setFont('helvetica', 'bold');
      d.text(String(qtdRealizadas), margin + 10, y + 28);

      d.setFontSize(10);
      d.setFont('helvetica', 'normal');
      d.text('pedidos', margin + 10 + d.getStringUnitWidth(String(qtdRealizadas)) * 28 / d.internal.scaleFactor + 4, y + 28);

      d.setFontSize(13);
      d.setFont('helvetica', 'bold');
      d.text(formatCurrencyPDF(valorRealizadas), margin + 10, y + 38);

      // ── Card Canceladas ──
      const card2X = margin + cardWidth + 12;
      d.setFillColor(...COLORS.danger);
      d.roundedRect(card2X, y, cardWidth, cardHeight, 4, 4, 'F');

      d.setFontSize(11);
      d.setFont('helvetica', 'bold');
      d.setTextColor(...COLORS.white);
      d.text('Canceladas', card2X + 10, y + 12);

      d.setFontSize(28);
      d.setFont('helvetica', 'bold');
      d.text(String(qtdCanceladas), card2X + 10, y + 28);

      d.setFontSize(10);
      d.setFont('helvetica', 'normal');
      d.text('pedidos', card2X + 10 + d.getStringUnitWidth(String(qtdCanceladas)) * 28 / d.internal.scaleFactor + 4, y + 28);

      d.setFontSize(13);
      d.setFont('helvetica', 'bold');
      d.text(formatCurrencyPDF(valorCanceladas), card2X + 10, y + 38);

      y += cardHeight + 14;

      // ── Tabela Resumo ──
      autoTable(d, {
        startY: y,
        head: [['Descrição', 'Qtd', 'Valor Total']],
        body: [
          ['Encomendas Realizadas', String(qtdRealizadas), formatCurrencyPDF(valorRealizadas)],
          ['Encomendas Canceladas', String(qtdCanceladas), formatCurrencyPDF(valorCanceladas)],
        ],
        foot: [['Total', String(qtdTotal), formatCurrencyPDF(valorTotal)]],
        margin: { left: margin, right: margin, bottom: 15 },
        theme: 'grid',
        headStyles: {
          fillColor: [...COLORS.primary],
          textColor: COLORS.white,
          fontStyle: 'bold',
          fontSize: 10,
          halign: 'center',
        },
        bodyStyles: { fontSize: 10, textColor: COLORS.black },
        footStyles: {
          fillColor: COLORS.lightGray,
          textColor: COLORS.black,
          fontStyle: 'bold',
          fontSize: 10,
        },
        columnStyles: {
          0: { cellWidth: 'auto', halign: 'left' },
          1: { cellWidth: 30, halign: 'center' },
          2: { cellWidth: 50, halign: 'right' },
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });

      // ── Lista detalhada ──
      y = (d as any).lastAutoTable?.finalY + 14 || y + 40;
      if (y > d.internal.pageSize.getHeight() - 60) {
        d.addPage();
        if (drawPageHeader) drawPageHeader(d);
        y = 44;
      }

      d.setFontSize(12);
      d.setFont('helvetica', 'bold');
      d.setTextColor(...COLORS.black);
      d.text('Detalhamento por Encomenda', margin, y);
      y += 6;

      const bodyRows: (string | number)[][] = [];
      const rowColors: [number, number, number][] = [];
      const rowFontStyles: ('normal' | 'bold')[] = [];

      for (const e of encomendas) {
        const isCancelado = (e.status ?? 0) === 5;
        if (isCancelado) {
          bodyRows.push([
            `#${e.codigo ?? e.id}`,
            e.cliente_nome || '-',
            ETAPAS_LABELS[e.status ?? 0] ?? '-',
            `-${formatCurrencyPDF(Number(e.valor_total || 0))}`,
          ]);
          rowColors.push([...COLORS.danger]);
          rowFontStyles.push('bold');
        } else {
          bodyRows.push([
            `#${e.codigo ?? e.id}`,
            e.cliente_nome || '-',
            ETAPAS_LABELS[e.status ?? 0] ?? '-',
            formatCurrencyPDF(Number(e.valor_total || 0)),
          ]);
          rowColors.push([...COLORS.black]);
          rowFontStyles.push('normal');
        }
      }

      autoTable(d, {
        startY: y,
        head: [['Pedido', 'Cliente', 'Status', 'Valor']],
        body: bodyRows,
        margin: { left: margin, right: margin, bottom: 15 },
        theme: 'striped',
        headStyles: {
          fillColor: [...COLORS.primary],
          textColor: COLORS.white,
          fontStyle: 'bold',
          fontSize: 9,
        },
        bodyStyles: { fontSize: 8, textColor: COLORS.black },
        columnStyles: {
          0: { cellWidth: 22, halign: 'center' },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 32, halign: 'center' },
          3: { cellWidth: 35, halign: 'right' },
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        didParseCell: (data) => {
          if (data.section === 'body' && data.row.index < rowColors.length) {
            data.cell.styles.textColor = rowColors[data.row.index];
            data.cell.styles.fontStyle = rowFontStyles[data.row.index];
          }
        },
        willDrawPage: (data: any) => {
          if (data.pageNumber > 1 && drawPageHeader) {
            drawPageHeader(d);
            if (data.cursor) data.cursor.y = 44;
          }
        },
      });
    }
  );

  return doc;
}

// ─── RELATÓRIO ANALÍTICO POR PRODUTOS ─────────────────────────────

interface ProdutoResumo {
  nome: string;
  qtd: number;
  preco: number;
  total: number;
  cancelado: boolean;
}

export function gerarRelatorioAnaliticoProdutos(dados: DadosRelatorio): jsPDF {
  const { encomendas, itensPorEncomenda, dataFiltro } = dados;

  const produtoMap = new Map<string, ProdutoResumo>();
  const produtoCancelMap = new Map<string, ProdutoResumo>();

  for (const enc of encomendas) {
    const isCancelado = (enc.status ?? 0) === 5;
    const mapRef = isCancelado ? produtoCancelMap : produtoMap;
    const itens = itensPorEncomenda[enc.id!] ?? [];
    for (const item of itens) {
      const nome = getProductName(item);
      const existing = mapRef.get(nome);
      if (existing) {
        existing.qtd += Number(item.quantidade);
        existing.total += Number(item.valor_total);
      } else {
        mapRef.set(nome, {
          nome,
          qtd: Number(item.quantidade),
          preco: Number(item.valor_unitario),
          total: Number(item.valor_total),
          cancelado: isCancelado,
        });
      }
    }
  }

  const produtosEfetivados = Array.from(produtoMap.values()).sort((a, b) => b.total - a.total);
  const produtosCancelados = Array.from(produtoCancelMap.values()).sort((a, b) => b.total - a.total);

  const totalQtdEfetivado = produtosEfetivados.reduce((s, p) => s + p.qtd, 0);
  const totalValorEfetivado = produtosEfetivados.reduce((s, p) => s + p.total, 0);
  const totalQtdCancelado = produtosCancelados.reduce((s, p) => s + p.qtd, 0);
  const totalValorCancelado = produtosCancelados.reduce((s, p) => s + p.total, 0);

  const doc = buildPDFWithHeader(
    {
      title: 'Relatório Analítico por Produtos',
      emissionDate: new Date().toLocaleDateString('pt-BR'),
      filters: [`Data: ${formatDateBR(dataFiltro)}`],
    },
    (d, drawPageHeader) => {
      if (drawPageHeader) drawPageHeader(d);

      const margin = 14;
      let y = 44;

      // ── Produtos Efetivados ──
      d.setFontSize(10);
      d.setFont('helvetica', 'bold');
      d.setTextColor(...COLORS.primaryDark);
      d.text('Produtos Efetivados', margin, y);
      y += 4;

      autoTable(d, {
        startY: y,
        head: [['Produto', 'Qtd', 'Preço Un.', 'Total']],
        body: produtosEfetivados.map((p) => [
          p.nome,
          String(p.qtd),
          formatCurrencyPDF(p.preco),
          formatCurrencyPDF(p.total),
        ]),
        foot: [['Subtotal', String(totalQtdEfetivado), '', formatCurrencyPDF(totalValorEfetivado)]],
        margin: { left: margin, right: margin, bottom: 15 },
        theme: 'grid',
        headStyles: {
          fillColor: [...COLORS.primary],
          textColor: COLORS.white,
          fontStyle: 'bold',
          fontSize: 10,
          halign: 'center',
        },
        bodyStyles: { fontSize: 9, textColor: COLORS.black },
        footStyles: {
          fillColor: COLORS.lightGray,
          textColor: COLORS.black,
          fontStyle: 'bold',
          fontSize: 10,
        },
        columnStyles: {
          0: { cellWidth: 'auto', halign: 'left' },
          1: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 35, halign: 'right' },
          3: { cellWidth: 40, halign: 'right' },
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        willDrawPage: (data: any) => {
          if (data.pageNumber > 1 && drawPageHeader) {
            drawPageHeader(d);
            if (data.cursor) data.cursor.y = 44;
          }
        },
      });

      y = (d as any).lastAutoTable?.finalY + 14 || y + 40;

      // ── Produtos Cancelados ──
      if (produtosCancelados.length > 0) {
        if (y + 60 > d.internal.pageSize.getHeight() - 30) {
          d.addPage();
          if (drawPageHeader) drawPageHeader(d);
          y = 44;
        }

        d.setFontSize(10);
        d.setFont('helvetica', 'bold');
        d.setTextColor(...COLORS.danger);
        d.text('Produtos Cancelados', margin, y);
        y += 4;

        const bodyCancelRows = produtosCancelados.map((p) => [
          p.nome,
          String(p.qtd),
          formatCurrencyPDF(p.preco),
          `-${formatCurrencyPDF(p.total)}`,
        ]);

        const cancelRowColors: [number, number, number][] = produtosCancelados.map(() => [...COLORS.danger]);

        autoTable(d, {
          startY: y,
          head: [['Produto', 'Qtd', 'Preço Un.', 'Total']],
          body: bodyCancelRows,
          foot: [['Subtotal', String(totalQtdCancelado), '', `-${formatCurrencyPDF(totalValorCancelado)}`]],
          margin: { left: margin, right: margin, bottom: 15 },
          theme: 'grid',
          headStyles: {
            fillColor: [...COLORS.danger],
            textColor: COLORS.white,
            fontStyle: 'bold',
            fontSize: 10,
            halign: 'center',
          },
          bodyStyles: { fontSize: 9, textColor: COLORS.danger, fontStyle: 'bold' },
          footStyles: {
            fillColor: COLORS.lightGray,
            textColor: COLORS.danger,
            fontStyle: 'bold',
            fontSize: 10,
          },
          columnStyles: {
            0: { cellWidth: 'auto', halign: 'left' },
            1: { cellWidth: 25, halign: 'center' },
            2: { cellWidth: 35, halign: 'right' },
            3: { cellWidth: 40, halign: 'right' },
          },
          alternateRowStyles: { fillColor: [254, 242, 242] },
          didParseCell: (data) => {
            if (data.section === 'body' && data.row.index < cancelRowColors.length) {
              data.cell.styles.textColor = cancelRowColors[data.row.index];
              data.cell.styles.fontStyle = 'bold';
            }
          },
          willDrawPage: (data: any) => {
            if (data.pageNumber > 1 && drawPageHeader) {
              drawPageHeader(d);
              if (data.cursor) data.cursor.y = 44;
            }
          },
        });

        y = (d as any).lastAutoTable?.finalY + 14 || y + 40;
      }

      // ── Total Geral ──
      if (y + 30 > d.internal.pageSize.getHeight() - 30) {
        d.addPage();
        if (drawPageHeader) drawPageHeader(d);
        y = 44;
      }

      y += 4;
      d.setFillColor(...COLORS.primaryDark);
      d.roundedRect(margin, y, d.internal.pageSize.getWidth() - margin * 2, 22, 3, 3, 'F');
      d.setTextColor(...COLORS.white);

      const totalLabel = `Total na data: ${formatDateBR(dataFiltro)}`;
      d.setFontSize(11);
      d.setFont('helvetica', 'bold');
      d.text(totalLabel, margin + 6, y + 6);

      const valorLabel = formatCurrencyPDF(totalValorEfetivado + totalValorCancelado);
      const rightX = d.internal.pageSize.getWidth() - margin - 6;
      d.setFontSize(13);
      d.text(valorLabel, rightX, y + 6, { align: 'right' });

      d.setFontSize(9);
      d.setFont('helvetica', 'normal');
      d.text(`Qtd: ${totalQtdEfetivado + totalQtdCancelado}`, margin + 6, y + 13);

      // Totais efetivado / cancelado
      if (totalValorCancelado > 0) {
        d.setFontSize(8);
        d.setFont('helvetica', 'bold');
        d.setTextColor(...COLORS.white);
        d.text(`Efetivado: ${formatCurrencyPDF(totalValorEfetivado)}`, margin + 6, y + 19);
        d.text(`Cancelado: -${formatCurrencyPDF(totalValorCancelado)}`, rightX, y + 19, { align: 'right' });
      }
    }
  );

  return doc;
}

// ─── RELATÓRIO ANALÍTICO POR CLIENTE ──────────────────────────────

interface ItemCliente {
  nome: string;
  qtd: number;
  preco: number;
  total: number;
  cancelado: boolean;
}

interface ClienteEncomenda {
  clienteNome: string;
  itens: ItemCliente[];
  totalQtd: number;
  totalValor: number;
  totalEfetivado: number;
  totalCancelado: number;
}

export function gerarRelatorioAnaliticoCliente(dados: DadosRelatorio): jsPDF {
  const { encomendas, itensPorEncomenda, dataFiltro } = dados;

  const clienteMap = new Map<string, ClienteEncomenda>();

  for (const enc of encomendas) {
    const nomeCliente = enc.cliente_nome || 'Cliente';
    let cliente = clienteMap.get(nomeCliente);
    if (!cliente) {
      cliente = { clienteNome: nomeCliente, itens: [], totalQtd: 0, totalValor: 0, totalEfetivado: 0, totalCancelado: 0 };
      clienteMap.set(nomeCliente, cliente);
    }

    const isCancelado = (enc.status ?? 0) === 5;
    const itens = itensPorEncomenda[enc.id!] ?? [];
    for (const item of itens) {
      const nomeProd = getProductName(item);
      const existing = cliente.itens.find((i) => i.nome === nomeProd && i.cancelado === isCancelado);
      if (existing) {
        existing.qtd += Number(item.quantidade);
        existing.total += Number(item.valor_total);
      } else {
        cliente.itens.push({
          nome: nomeProd,
          qtd: Number(item.quantidade),
          preco: Number(item.valor_unitario),
          total: Number(item.valor_total),
          cancelado: isCancelado,
        });
      }
      cliente.totalQtd += Number(item.quantidade);
      cliente.totalValor += Number(item.valor_total);
      if (isCancelado) {
        cliente.totalCancelado += Number(item.valor_total);
      } else {
        cliente.totalEfetivado += Number(item.valor_total);
      }
    }
  }

  const clientes = Array.from(clienteMap.values()).sort((a, b) => a.clienteNome.localeCompare(b.clienteNome));
  const grandTotalQtd = clientes.reduce((s, c) => s + c.totalQtd, 0);
  const grandTotalEfetivado = clientes.reduce((s, c) => s + c.totalEfetivado, 0);
  const grandTotalCancelado = clientes.reduce((s, c) => s + c.totalCancelado, 0);

  const doc = buildPDFWithHeader(
    {
      title: 'Relatório Analítico por Cliente',
      emissionDate: new Date().toLocaleDateString('pt-BR'),
      filters: [`Data: ${formatDateBR(dataFiltro)}`],
    },
    (d, drawPageHeader) => {
      if (drawPageHeader) drawPageHeader(d);

      const margin = 14;
      let y = 44;
      const pageHeight = d.internal.pageSize.getHeight();

      clientes.forEach((cliente, clienteIdx) => {
        const bodyRows: (string | number)[][] = [];
        const rowColors: [number, number, number][] = [];
        const rowFontStyles: ('normal' | 'bold')[] = [];

        for (const i of cliente.itens) {
          if (i.cancelado) {
            bodyRows.push([`${i.nome} (Cancelado)`, String(i.qtd), formatCurrencyPDF(i.preco), `-${formatCurrencyPDF(i.total)}`]);
            rowColors.push([...COLORS.danger]);
            rowFontStyles.push('bold');
          } else {
            bodyRows.push([i.nome, String(i.qtd), formatCurrencyPDF(i.preco), formatCurrencyPDF(i.total)]);
            rowColors.push([...COLORS.black]);
            rowFontStyles.push('normal');
          }
        }

        const spaceNeeded = 30 + (bodyRows.length + 2) * 8;
        if (y + spaceNeeded > pageHeight - 30) {
          d.addPage();
          if (drawPageHeader) drawPageHeader(d);
          y = 44;
        }

        // ── Cabeçalho do cliente ──
        d.setFillColor(...COLORS.primary);
        d.roundedRect(margin, y, d.internal.pageSize.getWidth() - margin * 2, 9, 2, 2, 'F');
        d.setFontSize(10);
        d.setFont('helvetica', 'bold');
        d.setTextColor(...COLORS.white);
        d.text(`${cliente.clienteNome}`, margin + 4, y + 6.5);
        y += 12;

        autoTable(d, {
          startY: y,
          head: [['Produto', 'Qtd', 'Preço Un.', 'Total']],
          body: bodyRows,
          margin: { left: margin, right: margin, bottom: 15 },
          theme: 'grid',
          headStyles: {
            fillColor: [...COLORS.primaryDark],
            textColor: COLORS.white,
            fontStyle: 'bold',
            fontSize: 9,
            halign: 'center',
          },
          bodyStyles: { fontSize: 8, textColor: COLORS.black },
          columnStyles: {
            0: { cellWidth: 'auto', halign: 'left' },
            1: { cellWidth: 22, halign: 'center' },
            2: { cellWidth: 32, halign: 'right' },
            3: { cellWidth: 36, halign: 'right' },
          },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          didParseCell: (data) => {
            if (data.section === 'body' && data.row.index < rowColors.length) {
              data.cell.styles.textColor = rowColors[data.row.index];
              data.cell.styles.fontStyle = rowFontStyles[data.row.index];
            }
          },
          willDrawPage: (data: any) => {
            if (data.pageNumber > 1 && drawPageHeader) {
              drawPageHeader(d);
              if (data.cursor) data.cursor.y = 44;
            }
          },
        });

        y = (d as any).lastAutoTable?.finalY || y + 40;

        // ── Totais do cliente (Efetivado / Cancelado) ──
        const temCancelado = cliente.totalCancelado > 0;
        if (temCancelado) {
          y += 2;
          d.setFontSize(8);
          d.setFont('helvetica', 'bold');
          d.setTextColor(...COLORS.primaryDark);
          d.text(`Efetivado: ${formatCurrencyPDF(cliente.totalEfetivado)}`, margin + 4, y + 5);
          d.setTextColor(...COLORS.danger);
          d.text(`Cancelado: -${formatCurrencyPDF(cliente.totalCancelado)}`, margin + 90, y + 5);
          y += 10;
        } else {
          y += 6;
          d.setFontSize(8);
          d.setFont('helvetica', 'bold');
          d.setTextColor(...COLORS.primaryDark);
          d.text(`Total: ${formatCurrencyPDF(cliente.totalEfetivado)}`, margin + 4, y);
          y += 6;
        }

        // ── Separador entre clientes ──
        if (clienteIdx < clientes.length - 1) {
          d.setDrawColor(200, 200, 200);
          d.setLineWidth(0.3);
          d.line(margin, y - 2, d.internal.pageSize.getWidth() - margin, y - 2);
          y += 4;
        }
      });

      // ── Total Geral ──
      if (y + 30 > pageHeight - 30) {
        d.addPage();
        if (drawPageHeader) drawPageHeader(d);
        y = 44;
      }

      y += 4;
      d.setFillColor(...COLORS.primaryDark);
      d.roundedRect(margin, y, d.internal.pageSize.getWidth() - margin * 2, 22, 3, 3, 'F');
      d.setTextColor(...COLORS.white);

      const totalLabel = `Total na data: ${formatDateBR(dataFiltro)}`;
      d.setFontSize(11);
      d.setFont('helvetica', 'bold');
      d.text(totalLabel, margin + 6, y + 6);

      const valorLabel = formatCurrencyPDF(grandTotalEfetivado + grandTotalCancelado);
      const rightX = d.internal.pageSize.getWidth() - margin - 6;
      d.setFontSize(13);
      d.text(valorLabel, rightX, y + 6, { align: 'right' });

      d.setFontSize(9);
      d.setFont('helvetica', 'normal');
      d.text(`Qtd: ${grandTotalQtd}`, margin + 6, y + 13);

      // Totais efetivado / cancelado
      if (grandTotalCancelado > 0) {
        d.setFontSize(8);
        d.setFont('helvetica', 'bold');
        d.setTextColor(...COLORS.white);
        d.text(`Efetivado: ${formatCurrencyPDF(grandTotalEfetivado)}`, margin + 6, y + 19);
        d.text(`Cancelado: -${formatCurrencyPDF(grandTotalCancelado)}`, rightX, y + 19, { align: 'right' });
      }
    }
  );

  return doc;
}

const ETAPAS_LABELS: Record<number, string> = {
  0: 'Aguardando',
  1: 'Em Produção',
  2: 'Finalizado',
  3: 'Saiu p/ Entrega',
  4: 'Entregue',
  5: 'Cancelada',
};

export { viewPDF, downloadPDF };
