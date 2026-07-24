import { useState, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { viewPDF, downloadPDF } from '@/lib/pdf';
import { useModule } from '@/context/ModuleContext';
import { useAppMode } from '@/context/AppModeContext';
import { getModuleIcon } from '@/lib/moduleIcons';
import { helpModules } from '@/lib/helpContent';
import {
  ChevronDown, ChevronRight, BookOpen, HelpCircle, ListOrdered,
  ShieldOff, FileDown,
} from 'lucide-react';

function normalizeKey(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

const MODE_MODULE_MAP: Record<string, string> = {
  gestor: 'Gestor',
  horas: 'Horas Trabalhadas',
  producao: 'Producao',
};

export function Help() {
  const { selectedModule, menuData } = useModule();
  const appMode = useAppMode();

  const allowedNames = new Set(menuData.map((m) => normalizeKey(m.nome)));
  const hasModuleAccess = (name: string) => allowedNames.has(normalizeKey(name));

  const preferredIndex = () => {
    if (appMode) {
      const name = MODE_MODULE_MAP[appMode];
      const idx = helpModules.findIndex((m) => m.name === name);
      if (idx >= 0) return idx;
    }
    if (selectedModule) {
      const idx = helpModules.findIndex((m) => m.name === selectedModule.nome);
      if (idx >= 0) return idx;
    }
    return 0;
  };

  const [tab, setTab] = useState(preferredIndex);
  const [expandedForm, setExpandedForm] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<jsPDF | null>(null);

  const module = helpModules[tab];
  if (!module) return null;

  const mi = getModuleIcon(module.name);
  const hasAccess = hasModuleAccess(module.name);
  const pdfFilename = `ajuda-${module.name.toLowerCase().replace(/\s+/g, '-')}.pdf`;

  const buildPdf = useCallback(() => {
    const d = new jsPDF({ format: 'a4', unit: 'mm' });
    const pageW = 190;
    let y = 20;

    const addTitle = (text: string, size: number) => {
      d.setFontSize(size);
      d.text(text, pageW / 2, y, { align: 'center' });
      y += size * 0.5;
    };

    const addText = (text: string, size = 10, indent = 0) => {
      d.setFontSize(size);
      const lines = d.splitTextToSize(text, pageW - indent * 2);
      for (const line of lines) {
        if (y > 275) { d.addPage(); y = 20; }
        d.text(line, 10 + indent, y);
        y += size * 0.45;
      }
    };

    const bold = (size: number) => { d.setFontSize(size); d.setFont('helvetica', 'bold'); };
    const normal = (size: number) => { d.setFontSize(size); d.setFont('helvetica', 'normal'); };
    const checkPage = () => { if (y > 275) { d.addPage(); y = 20; } };

    addTitle(`Ajuda - ${module.name}`, 18);
    y += 4;
    addText(`Descricao: ${module.description}`, 10);
    y += 2;
    addText(`Objetivo: ${module.objective}`, 10);
    y += 4;

    if (module.workflow) {
      checkPage();
      bold(13);
      d.text('Fluxo de Trabalho', 10, y);
      normal(10);
      y += 6;
      module.workflow.forEach((step, i) => {
        checkPage();
        addText(`${i + 1}. ${step.title}`, 10, 5);
        addText(step.text, 9, 10);
        y += 2;
      });
      y += 3;
    }

    checkPage();
    bold(13);
    d.text('Formularios do Modulo', 10, y);
    normal(10);
    y += 6;

    module.forms.forEach((form) => {
      checkPage();
      bold(11);
      d.text(form.name, 10, y);
      normal(9);
      y += 5;

      addText(`Objetivo: ${form.purpose}`, 9, 5);
      if (form.howTo) addText(`Como usar: ${form.howTo}`, 9, 5);

      if (form.fields) {
        autoTable(d, {
          startY: y + 2,
          margin: { left: 15 },
          tableWidth: pageW - 10,
          styles: { fontSize: 8 },
          head: [['Campo', 'Descricao']],
          body: form.fields.map((f) => [f.label, f.desc]),
        });
        y = (d as typeof d & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
      }

      if (form.tips) {
        addText('Dicas:', 9, 5);
        form.tips.forEach((tip) => addText(`- ${tip}`, 8, 10));
        y += 2;
      }
    });

    return d;
  }, [module]);

  const handleExport = useCallback(() => {
    const doc = buildPdf();
    setPdfDoc(doc);
    setShowConfirm(true);
  }, [buildPdf]);

  const handleView = useCallback(() => {
    if (pdfDoc) viewPDF(pdfDoc);
    setShowConfirm(false);
  }, [pdfDoc]);

  const handleDownload = useCallback(() => {
    if (pdfDoc) downloadPDF(pdfDoc, pdfFilename);
    setShowConfirm(false);
  }, [pdfDoc, pdfFilename]);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${mi.bgGradient} flex items-center justify-center`}>
              <BookOpen size={22} style={{ color: mi.color }} />
            </div>
            <div>
              <h1 className="text-xl font-heading font-bold text-text-primary">Ajuda</h1>
              <p className="text-sm text-text-muted">Guia de uso dos modulos do sistema</p>
            </div>
          </div>
          <Button onClick={handleExport} variant="secondary">
            <FileDown size={16} /> Exportar PDF
          </Button>
        </div>

        <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
          {helpModules.map((m, i) => {
            const active = i === tab;
            const mi2 = getModuleIcon(m.name);
            const MIcon = mi2.icon;
            const permitted = hasModuleAccess(m.name);
            return (
              <button
                key={m.name}
                onClick={() => { setTab(i); setExpandedForm(null); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-accent-primary text-text-inverse'
                    : permitted
                      ? 'bg-bg-muted text-text-secondary hover:bg-border-subtle'
                      : 'bg-bg-muted text-text-muted/50 hover:bg-border-subtle'
                }`}
              >
                <MIcon size={16} />
                {m.name}
                {!permitted && <ShieldOff size={12} className="opacity-50" />}
              </button>
            );
          })}
        </div>

        {!hasAccess && (
          <div className="mb-6 flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
            <ShieldOff size={16} className="shrink-0" />
            Sua empresa nao possui acesso ao modulo <strong>{module.name}</strong>. Consulte o administrador do sistema para liberar o acesso.
          </div>
        )}

        <div className="space-y-6">
          <Card>
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <HelpCircle size={20} className="text-accent-primary shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-base font-semibold text-text-primary">Sobre o Modulo</h2>
                  <p className="text-sm text-text-secondary mt-1">{module.description}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ListOrdered size={20} className="text-accent-primary shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-base font-semibold text-text-primary">Objetivo</h2>
                  <p className="text-sm text-text-secondary mt-1">{module.objective}</p>
                </div>
              </div>
            </div>
          </Card>

          {module.workflow && (
            <Card>
              <div className="p-5">
                <h2 className="text-base font-semibold text-text-primary mb-3 flex items-center gap-2">
                  <ListOrdered size={18} className="text-accent-primary" />
                  Fluxo de Trabalho
                </h2>
                <div className="space-y-3">
                  {module.workflow.map((step, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-7 h-7 rounded-full bg-accent-primary text-text-inverse text-xs font-bold flex items-center justify-center shrink-0">
                          {i + 1}
                        </div>
                        {i < module.workflow!.length - 1 && (
                          <div className="w-px flex-1 bg-border-subtle my-1" />
                        )}
                      </div>
                      <div className="pb-3">
                        <h3 className="text-sm font-medium text-text-primary">{step.title}</h3>
                        <p className="text-xs text-text-secondary mt-0.5">{step.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          <Card>
            <div className="p-5">
              <h2 className="text-base font-semibold text-text-primary mb-3">Formularios do Modulo</h2>
              <div className="space-y-2">
                {module.forms.map((form, i) => {
                  const fi = getModuleIcon(form.name);
                  const FIcon = fi.icon;
                  const open = expandedForm === i;

                  return (
                    <div key={i} className="border border-border-subtle rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedForm(open ? null : i)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-bg-muted/50 transition-colors"
                      >
                        <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${fi.bgGradient} flex items-center justify-center shrink-0`}>
                          <FIcon size={14} style={{ color: fi.color }} />
                        </div>
                        <span className="text-sm font-medium text-text-primary flex-1">{form.name}</span>
                        {open ? (
                          <ChevronDown size={16} className="text-text-muted" />
                        ) : (
                          <ChevronRight size={16} className="text-text-muted" />
                        )}
                      </button>

                      {open && (
                        <div className="px-4 pb-4 space-y-3 border-t border-border-subtle">
                          <div className="pt-3">
                            <p className="text-xs text-text-muted uppercase tracking-wider font-medium mb-1">Objetivo</p>
                            <p className="text-sm text-text-secondary">{form.purpose}</p>
                          </div>

                          {form.howTo && (
                            <div>
                              <p className="text-xs text-text-muted uppercase tracking-wider font-medium mb-1">Como usar</p>
                              <p className="text-sm text-text-secondary">{form.howTo}</p>
                            </div>
                          )}

                          {form.fields && (
                            <div>
                              <p className="text-xs text-text-muted uppercase tracking-wider font-medium mb-1.5">Campos</p>
                              <div className="space-y-1">
                                {form.fields.map((field, j) => (
                                  <div key={j} className="flex items-start gap-2 text-sm">
                                    <span className="text-accent-primary font-medium shrink-0 w-28">{field.label}:</span>
                                    <span className="text-text-secondary">{field.desc}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {form.tips && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                              <p className="text-xs text-amber-700 uppercase tracking-wider font-medium mb-1">Dicas</p>
                              <ul className="space-y-1">
                                {form.tips.map((tip, j) => (
                                  <li key={j} className="text-sm text-amber-800 flex items-start gap-1.5">
                                    <span className="text-amber-500 mt-0.5">*</span>
                                    {tip}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={handleDownload}
        onConfirm={handleView}
        title="Visualizar Ajuda"
        message={`Deseja visualizar a ajuda do modulo "${module.name}" em uma nova aba?`}
        confirmLabel="Visualizar"
      />
    </Layout>
  );
}
