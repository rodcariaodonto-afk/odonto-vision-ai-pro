/**
 * Cephalometric Planning — Export PDF
 *
 * Gera um PDF da sugestao de planeamento clinico APROVADA, com:
 * - Cabecalho identificando o produto, paciente (se informado), data
 * - 6 secoes estruturadas
 * - Rodape em TODAS as paginas com aviso de validacao profissional
 * - Metadados de auditoria no final (versoes, ID, timestamp)
 *
 * Restricao de seguranca: so deve ser chamado para sugestoes em status
 * "clinician_approved". O componente UI controla esse gate.
 */

import jsPDF from 'jspdf';
import type { CephalometricPlanningSuggestion } from './types';

const DISCLAIMER_FOOTER =
  'Sugestao de apoio a decisao clinica. NAO substitui o julgamento profissional. ' +
  'Validada por dentista habilitado.';

const COLORS = {
  primary: [37, 99, 235] as [number, number, number],     // azul
  text: [31, 41, 55] as [number, number, number],          // cinza-escuro
  muted: [107, 114, 128] as [number, number, number],      // cinza-medio
  amber: [217, 119, 6] as [number, number, number],        // ambar para alertas
  border: [229, 231, 235] as [number, number, number],     // cinza claro
};

interface ExportOptions {
  patientName?: string;
  patientId?: string;
  clinicianName?: string;
  clinicianEmail?: string;
  approvedAt?: string;
}

interface PdfState {
  doc: jsPDF;
  y: number;
  pageHeight: number;
  pageWidth: number;
  margin: number;
  contentWidth: number;
}

// ============================================================================
// HELPERS DE DESENHO
// ============================================================================

function ensureSpace(s: PdfState, needed: number) {
  if (s.y + needed > s.pageHeight - 30) {
    addPageFooter(s);
    s.doc.addPage();
    s.y = s.margin;
  }
}

function addPageFooter(s: PdfState) {
  const { doc, pageWidth, pageHeight } = s;
  const pageNum = doc.getNumberOfPages();

  // Linha separadora
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(s.margin, pageHeight - 25, pageWidth - s.margin, pageHeight - 25);

  // Disclaimer obrigatorio
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  const lines = doc.splitTextToSize(DISCLAIMER_FOOTER, pageWidth - 2 * s.margin);
  doc.text(lines, s.margin, pageHeight - 18);

  // Numero da pagina
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`pag. ${pageNum}`, pageWidth - s.margin, pageHeight - 8, { align: 'right' });
}

function addHeader(s: PdfState, opts: ExportOptions, suggestion: CephalometricPlanningSuggestion) {
  const { doc, pageWidth } = s;

  // Titulo principal
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...COLORS.primary);
  doc.text('Sugestao de Planeamento Clinico', s.margin, s.y);
  s.y += 7;

  // Subtitulo
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.muted);
  doc.text('Analise cefalometrica - apoio a decisao clinica', s.margin, s.y);
  s.y += 8;

  // Linha divisoria
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.6);
  doc.line(s.margin, s.y, pageWidth - s.margin, s.y);
  s.y += 8;

  // Bloco de metadados (paciente / data / clinico)
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.text);

  const meta: Array<[string, string]> = [];
  if (opts.patientName) meta.push(['Paciente:', opts.patientName]);
  if (opts.patientId) meta.push(['ID paciente:', opts.patientId]);
  if (opts.clinicianName) meta.push(['Profissional:', opts.clinicianName]);
  if (opts.approvedAt) {
    const d = new Date(opts.approvedAt);
    meta.push(['Aprovado em:', d.toLocaleString('pt-BR')]);
  }

  for (const [label, value] of meta) {
    doc.setFont('helvetica', 'bold');
    doc.text(label, s.margin, s.y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, s.margin + 35, s.y);
    s.y += 5;
  }
  s.y += 4;
}

function addSectionTitle(s: PdfState, title: string) {
  ensureSpace(s, 12);
  s.doc.setFont('helvetica', 'bold');
  s.doc.setFontSize(11);
  s.doc.setTextColor(...COLORS.primary);
  s.doc.text(title, s.margin, s.y);
  s.y += 6;
}

function addParagraph(s: PdfState, text: string) {
  s.doc.setFont('helvetica', 'normal');
  s.doc.setFontSize(10);
  s.doc.setTextColor(...COLORS.text);
  const lines = s.doc.splitTextToSize(text, s.contentWidth);
  ensureSpace(s, lines.length * 5 + 2);
  s.doc.text(lines, s.margin, s.y);
  s.y += lines.length * 5 + 4;
}

function addList(s: PdfState, items: string[], numbered: boolean = false) {
  s.doc.setFont('helvetica', 'normal');
  s.doc.setFontSize(10);
  s.doc.setTextColor(...COLORS.text);

  items.forEach((item, idx) => {
    const prefix = numbered ? `${idx + 1}. ` : '- ';
    const lines = s.doc.splitTextToSize(prefix + item, s.contentWidth - 4);
    ensureSpace(s, lines.length * 5 + 2);
    s.doc.text(lines, s.margin + 2, s.y);
    s.y += lines.length * 5 + 2;
  });
  s.y += 2;
}

function addAlertList(s: PdfState, items: string[]) {
  // Alertas: caixa ambar com lista
  s.doc.setFont('helvetica', 'normal');
  s.doc.setFontSize(10);
  s.doc.setTextColor(...COLORS.amber);

  items.forEach((item) => {
    const lines = s.doc.splitTextToSize('! ' + item, s.contentWidth - 4);
    ensureSpace(s, lines.length * 5 + 2);
    s.doc.text(lines, s.margin + 2, s.y);
    s.y += lines.length * 5 + 2;
  });
  s.y += 2;
}

function addAuditMetadata(s: PdfState, suggestion: CephalometricPlanningSuggestion) {
  ensureSpace(s, 25);
  s.y += 6;

  // Linha separadora
  s.doc.setDrawColor(...COLORS.border);
  s.doc.setLineWidth(0.3);
  s.doc.line(s.margin, s.y, s.pageWidth - s.margin, s.y);
  s.y += 5;

  s.doc.setFont('helvetica', 'bold');
  s.doc.setFontSize(8);
  s.doc.setTextColor(...COLORS.muted);
  s.doc.text('Metadados de auditoria', s.margin, s.y);
  s.y += 4;

  s.doc.setFont('helvetica', 'normal');
  s.doc.setFontSize(7);

  const audit = [
    `Versao das regras: ${suggestion.rulesVersion}`,
    `Versao do template: ${suggestion.templateVersion}`,
    `Versao do filtro: ${suggestion.safetyFilterVersion}`,
    `Score de suficiencia: ${suggestion.dataSufficiencyScore}/100 (${suggestion.confidenceLevel})`,
    suggestion.id ? `ID da sugestao: ${suggestion.id}` : '',
    `Gerado em: ${new Date(suggestion.generatedAt).toLocaleString('pt-BR')}`,
    suggestion.approvedAt ? `Aprovado em: ${new Date(suggestion.approvedAt).toLocaleString('pt-BR')}` : '',
  ].filter((l) => l);

  audit.forEach((line) => {
    s.doc.text(line, s.margin, s.y);
    s.y += 3.5;
  });
}

// ============================================================================
// FUNCAO PRINCIPAL
// ============================================================================

export function exportPlanningSuggestionToPDF(
  suggestion: CephalometricPlanningSuggestion,
  options: ExportOptions = {},
): jsPDF {
  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
    orientation: 'portrait',
  });

  const state: PdfState = {
    doc,
    y: 20,
    pageHeight: doc.internal.pageSize.getHeight(),
    pageWidth: doc.internal.pageSize.getWidth(),
    margin: 18,
    contentWidth: doc.internal.pageSize.getWidth() - 36,
  };

  // Cabecalho
  addHeader(state, options, suggestion);

  // Resumo
  addSectionTitle(state, 'Resumo');
  addParagraph(state, suggestion.summary);

  // Achados priorizados
  if (suggestion.prioritizedProblems.length > 0) {
    addSectionTitle(state, 'Achados priorizados');
    addList(state, suggestion.prioritizedProblems, true);
  }

  // Objetivos terapeuticos
  if (suggestion.therapeuticObjectives.length > 0) {
    addSectionTitle(state, 'Objetivos terapeuticos a considerar');
    addList(state, suggestion.therapeuticObjectives, false);
  }

  // Alternativas
  if (suggestion.treatmentAlternatives.length > 0) {
    addSectionTitle(state, 'Alternativas a discutir com o paciente');
    addList(state, suggestion.treatmentAlternatives, false);
  }

  // Alertas (estilo diferenciado)
  if (suggestion.alertsAndLimitations.length > 0) {
    addSectionTitle(state, 'Alertas e limitacoes');
    addAlertList(state, suggestion.alertsAndLimitations);
  }

  // Explicacao amigavel
  if (suggestion.patientFriendlyExplanation) {
    addSectionTitle(state, 'Explicacao amigavel ao paciente');
    addParagraph(state, suggestion.patientFriendlyExplanation);
  }

  // Metadados de auditoria
  addAuditMetadata(state, suggestion);

  // Adiciona o rodape na ultima pagina
  addPageFooter(state);

  return doc;
}

/**
 * Helper: gera e baixa o PDF diretamente no navegador.
 */
export function downloadPlanningSuggestionPDF(
  suggestion: CephalometricPlanningSuggestion,
  options: ExportOptions = {},
): void {
  const doc = exportPlanningSuggestionToPDF(suggestion, options);
  const patientPart = options.patientName ? `_${options.patientName.replace(/\s+/g, '_')}` : '';
  const datePart = new Date().toISOString().slice(0, 10);
  const filename = `planejamento_cefalometrico${patientPart}_${datePart}.pdf`;
  doc.save(filename);
}
