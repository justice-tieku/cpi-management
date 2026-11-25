import type { jsPDF as JsPDF } from 'jspdf';
import churchLogo from '../assets/cpi-logo.png';

export type ReportCell = string | number;

export interface ReportExport {
  title: string;
  filename: string;
  columns: string[];
  rows: ReportCell[][];
  summary: Array<[string, ReportCell]>;
}

async function loadLogo(): Promise<string> {
  const response = await fetch(churchLogo);
  if (!response.ok) throw new Error('Unable to load the church logo for export.');
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return `data:image/png;base64,${btoa(binary)}`;
}

export async function exportReportExcel(report: ReportExport): Promise<void> {
  const [{ default: ExcelJS }, logo] = await Promise.all([import('exceljs'), loadLogo()]);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Cross Passion International';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('Report');
  sheet.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1 };
  const imageId = workbook.addImage({ base64: logo, extension: 'png' });
  sheet.addImage(imageId, 'A1:B4');
  sheet.mergeCells('C1:H2');
  sheet.getCell('C1').value = 'CROSS PASSION INTERNATIONAL';
  sheet.getCell('C1').font = { bold: true, size: 15, color: { argb: 'FF111111' } };
  sheet.mergeCells('C3:H3');
  sheet.getCell('C3').value = report.title;
  sheet.getCell('C3').font = { bold: true, size: 12, color: { argb: 'FF111111' } };
  sheet.getCell('C4').value = `Generated ${new Date().toLocaleDateString()}`;
  sheet.getCell('C4').font = { italic: true, size: 9, color: { argb: 'FF555555' } };
  sheet.addRow([]);
  report.summary.forEach(([label, value]) => {
    const row = sheet.addRow([label, value]);
    row.getCell(1).font = { bold: true, color: { argb: 'FF111111' } };
    row.getCell(2).font = { color: { argb: 'FF111111' } };
  });
  sheet.addRow([]);
  const header = sheet.addRow(report.columns);
  header.height = 24;
  sheet.views = [{ state: 'frozen', ySplit: header.number }];
  sheet.autoFilter = {
    from: { row: header.number, column: 1 },
    to: { row: header.number, column: report.columns.length }
  };
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF222222' } };
    cell.alignment = { vertical: 'middle', wrapText: true };
  });
  report.rows.forEach((row) => {
    const added = sheet.addRow(row);
    added.eachCell((cell) => {
      cell.font = { color: { argb: 'FF111111' } };
      cell.alignment = { vertical: 'top', wrapText: true };
      cell.border = { bottom: { style: 'hair', color: { argb: 'FFCCCCCC' } } };
    });
  });
  sheet.columns.forEach((column) => {
    const maxLength = column.values?.reduce<number>((max, value) => Math.max(max, String(value ?? '').length), 10) || 10;
    column.width = Math.min(Math.max(maxLength + 2, 12), 42);
  });
  const buffer = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${report.filename}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportReportPdf(report: ReportExport): Promise<void> {
  const [{ jsPDF }, { default: autoTable }, logo] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    loadLogo()
  ]);
  const pdf = new jsPDF({ orientation: 'landscape', format: 'a4' });
  pdf.addImage(logo, 'PNG', 14, 10, 22, 22);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(15);
  pdf.text('CROSS PASSION INTERNATIONAL', 42, 17);
  pdf.setFontSize(12);
  pdf.text(report.title, 42, 25);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(`Generated ${new Date().toLocaleDateString()}`, 42, 31);

  autoTable(pdf, {
    startY: 38,
    head: [['Report summary', '']],
    body: report.summary.map(([label, value]) => [label, String(value)]),
    theme: 'grid',
    styles: { fontSize: 9, textColor: [0, 0, 0], lineColor: [190, 190, 190] },
    headStyles: { fillColor: [35, 35, 35], textColor: [255, 255, 255] },
    margin: { left: 14, right: 14 }
  });
  const summaryEnd = (pdf as JsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 40;
  autoTable(pdf, {
    startY: summaryEnd + 7,
    head: [report.columns],
    body: report.rows.map((row) => row.map(String)),
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, textColor: [0, 0, 0], lineColor: [190, 190, 190], overflow: 'linebreak' },
    headStyles: { fillColor: [35, 35, 35], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { left: 14, right: 14 },
    didDrawPage: () => {
      const pageCount = pdf.getNumberOfPages();
      pdf.setFontSize(8);
      pdf.setTextColor(70, 70, 70);
      pdf.text(`Page ${pageCount}`, pdf.internal.pageSize.getWidth() - 20, pdf.internal.pageSize.getHeight() - 8);
    }
  });
  pdf.save(`${report.filename}.pdf`);
}
