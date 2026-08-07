import PDFDocument from 'pdfkit';

interface SummaryRecord {
  referenceNo: string;
  activityName: string;
  status: string;
  createdAt: Date;
  department: { code: string; nameEn: string };
}

export interface PdfSummaryMeta {
  scopeLabel: string; // e.g. "All departments" or "IT — Information Technology"
  statusLabel: string; // e.g. "All statuses" or "Approved"
  dateRangeLabel: string; // e.g. "All time" or "2026-01-01 to 2026-06-30"
  generatedBy: string;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#898781',
  SUBMITTED: '#fab219',
  APPROVED: '#0ca30c',
  REJECTED: '#d03b3b',
};

const COLUMNS = [
  { key: 'referenceNo', label: 'Reference No.', width: 100 },
  { key: 'activityName', label: 'Activity Name', width: 220 },
  { key: 'department', label: 'Department', width: 150 },
  { key: 'status', label: 'Status', width: 90 },
  { key: 'createdAt', label: 'Created At', width: 100 },
] as const;

function cellText(record: SummaryRecord, key: (typeof COLUMNS)[number]['key']): string {
  switch (key) {
    case 'referenceNo':
      return record.referenceNo;
    case 'activityName':
      return record.activityName;
    case 'department':
      return `${record.department.code} — ${record.department.nameEn}`;
    case 'status':
      return record.status;
    case 'createdAt':
      return record.createdAt.toISOString().slice(0, 10);
  }
}

export async function buildRopaPdfSummary(records: SummaryRecord[], meta: PdfSummaryMeta): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    doc.fontSize(18).fillColor('#0b0b0b').text('ROPA Summary Report', { align: 'left' });
    doc.moveDown(0.3);
    doc.fontSize(9).fillColor('#52514e');
    doc.text(`Generated at: ${new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC by ${meta.generatedBy}`);
    doc.text(`Scope: ${meta.scopeLabel}`);
    doc.text(`Status filter: ${meta.statusLabel}`);
    doc.text(`Date range: ${meta.dateRangeLabel}`);
    doc.moveDown(0.6);

    const counts: Record<string, number> = { DRAFT: 0, SUBMITTED: 0, APPROVED: 0, REJECTED: 0 };
    for (const r of records) counts[r.status] = (counts[r.status] ?? 0) + 1;

    doc.fontSize(11).fillColor('#0b0b0b').text(`Total records: ${records.length}`);
    doc.fontSize(9).fillColor('#52514e');
    doc.text(
      `Draft: ${counts.DRAFT}   Pending approval: ${counts.SUBMITTED}   Approved: ${counts.APPROVED}   Rejected: ${counts.REJECTED}`
    );
    doc.moveDown(0.8);

    const rowPadding = 4;
    const headerHeight = 20;

    function drawHeader() {
      const y = doc.y;
      doc.rect(doc.page.margins.left, y, pageWidth, headerHeight).fill('#c9a227');
      let x = doc.page.margins.left;
      doc.fontSize(9).fillColor('#ffffff');
      for (const col of COLUMNS) {
        doc.text(col.label, x + rowPadding, y + rowPadding, { width: col.width - rowPadding * 2 });
        x += col.width;
      }
      doc.y = y + headerHeight;
      doc.fillColor('#0b0b0b');
    }

    function ensureSpace(rowHeight: number) {
      const bottom = doc.page.height - doc.page.margins.bottom;
      if (doc.y + rowHeight > bottom) {
        doc.addPage();
        drawHeader();
      }
    }

    drawHeader();

    doc.fontSize(8.5);
    for (const record of records) {
      const cellTexts = COLUMNS.map((col) => cellText(record, col.key));
      const rowHeight =
        Math.max(
          ...COLUMNS.map((col, i) => doc.heightOfString(cellTexts[i], { width: col.width - rowPadding * 2 }))
        ) +
        rowPadding * 2;

      ensureSpace(rowHeight);

      const y = doc.y;
      let x = doc.page.margins.left;
      for (let i = 0; i < COLUMNS.length; i++) {
        const col = COLUMNS[i];
        if (col.key === 'status') {
          doc.fillColor(STATUS_COLORS[record.status] ?? '#0b0b0b');
        } else {
          doc.fillColor('#0b0b0b');
        }
        doc.text(cellTexts[i], x + rowPadding, y + rowPadding, { width: col.width - rowPadding * 2 });
        x += col.width;
      }
      doc.fillColor('#0b0b0b');
      doc.y = y + rowHeight;
      doc
        .moveTo(doc.page.margins.left, doc.y)
        .lineTo(doc.page.margins.left + pageWidth, doc.y)
        .strokeColor('#e1e0d9')
        .lineWidth(0.5)
        .stroke();
    }

    doc.end();
  });
}
