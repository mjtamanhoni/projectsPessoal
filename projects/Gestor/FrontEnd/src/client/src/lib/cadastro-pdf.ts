import autoTable from 'jspdf-autotable';
import { buildPDFWithHeader, viewPDF } from './pdf';

export interface PrintColumn {
  header: string;
  accessor: (row: Record<string, unknown>) => string | number;
}

export interface SubRow {
  columns: PrintColumn[];
  data: Record<string, unknown>[];
  label?: string;
}

export function imprimirCadastro(
  title: string,
  data: unknown[],
  columns: PrintColumn[],
  expandData?: (row: Record<string, unknown>) => SubRow | null,
) {
  const doc = buildPDFWithHeader(
    {
      title,
      emissionDate: new Date().toLocaleDateString('pt-BR'),
      filters: [`${data.length} registro(s)`],
    },
    (d, drawPageHeader) => {
      if (drawPageHeader) drawPageHeader(d);

      if (!expandData) {
        autoTable(d, {
          head: [columns.map((c) => c.header)],
          body: data.map((row) =>
            columns.map((c) => {
              const val = c.accessor(row as Record<string, unknown>);
              return val != null && val !== '' ? String(val) : '-';
            }),
          ),
          startY: 42,
          margin: { bottom: 15 },
          theme: 'striped',
          headStyles: { fillColor: [34, 197, 94] },
          styles: { fontSize: 8 },
          willDrawPage: (dp: any) => {
            if (dp.pageNumber > 1 && drawPageHeader) {
              drawPageHeader(d);
              if (dp.cursor) dp.cursor.y = 42;
            }
          },
        });
        return;
      }

      const headRow = [columns.map((c) => c.header)];
      const body: (string | number)[][] = [];
      const subRowIndices: number[] = [];

      data.forEach((row) => {
        const r = row as Record<string, unknown>;
        body.push(
          columns.map((c) => {
            const val = c.accessor(r);
            return val != null && val !== '' ? String(val) : '-';
          }),
        );

        const sub = expandData(r);
        if (sub && sub.data.length > 0) {
          subRowIndices.push(body.length - 1);
          sub.data.forEach((subRow) => {
            body.push([
              '  ' + sub.columns.map((c) => {
                const val = c.accessor(subRow);
                return val != null && val !== '' ? String(val) : '-';
              }).join('  |  '),
            ]);
          });
        }
      });

      autoTable(d, {
        head: headRow,
        body,
        startY: 42,
        margin: { bottom: 15 },
        theme: 'striped',
        headStyles: { fillColor: [34, 197, 94] },
        styles: { fontSize: 8 },
        didParseCell: (hookData) => {
          const idx = hookData.row.index;
          if (subRowIndices.includes(idx)) {
            hookData.cell.styles.fontStyle = 'bold';
            hookData.cell.styles.fillColor = [240, 240, 240];
          }
          if (hookData.row.raw && Array.isArray(hookData.row.raw)) {
            const firstCell = String(hookData.row.raw[0] ?? '');
            if (firstCell.startsWith('  ')) {
              hookData.cell.styles.fontStyle = 'italic';
              hookData.cell.styles.textColor = [100, 100, 100];
              hookData.cell.styles.fontSize = 7;
            }
          }
        },
        willDrawPage: (dp: any) => {
          if (dp.pageNumber > 1 && drawPageHeader) {
            drawPageHeader(d);
            if (dp.cursor) dp.cursor.y = 42;
          }
        },
      });
    },
  );

  viewPDF(doc);
}
