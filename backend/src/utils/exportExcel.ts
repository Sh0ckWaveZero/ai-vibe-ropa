import ExcelJS from 'exceljs';

interface ExportableRecord {
  referenceNo: string;
  status: string;
  activityName: string;
  purpose: string;
  legalBasis: string;
  controllerName: string;
  jointController: string | null;
  dataSubjectCategories: string[];
  dataCategories: string[];
  sensitiveDataCategories: string[];
  collectionSource: string;
  recipients: string[];
  hasCrossBorderTransfer: boolean;
  crossBorderDestination: string | null;
  crossBorderSafeguards: string | null;
  retentionPeriod: string;
  disposalMethod: string;
  securityMeasures: string;
  dpoContact: string | null;
  remarks: string | null;
  createdAt: Date;
  submittedAt: Date | null;
  approvedAt: Date | null;
  rejectionReason: string | null;
  department: { code: string; nameEn: string };
  createdBy: { fullName: string };
  approvedBy: { fullName: string } | null;
}

// Excel/LibreOffice treat a leading =, +, -, @ (or tab/CR) as a formula
// trigger when a cell is opened/edited — since every text field here is
// free-form user input, neutralize that before it ever reaches a cell.
// See CWE-1236 (CSV/Excel formula injection).
function safeCell(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function joinList(values: string[]): string {
  return safeCell(values.join(', '));
}

const COLUMNS: { header: string; key: string; width: number }[] = [
  { header: 'Reference No.', key: 'referenceNo', width: 20 },
  { header: 'Department', key: 'department', width: 20 },
  { header: 'Status', key: 'status', width: 14 },
  { header: 'Activity Name', key: 'activityName', width: 28 },
  { header: 'Purpose', key: 'purpose', width: 30 },
  { header: 'Legal Basis', key: 'legalBasis', width: 24 },
  { header: 'Controller', key: 'controllerName', width: 22 },
  { header: 'Joint Controller', key: 'jointController', width: 22 },
  { header: 'Data Subject Categories', key: 'dataSubjectCategories', width: 28 },
  { header: 'Personal Data Categories', key: 'dataCategories', width: 28 },
  { header: 'Sensitive Data Categories', key: 'sensitiveDataCategories', width: 28 },
  { header: 'Collection Source', key: 'collectionSource', width: 24 },
  { header: 'Recipients / Third Parties', key: 'recipients', width: 28 },
  { header: 'Cross-Border Transfer', key: 'hasCrossBorderTransfer', width: 18 },
  { header: 'Destination Country', key: 'crossBorderDestination', width: 20 },
  { header: 'Transfer Safeguards', key: 'crossBorderSafeguards', width: 24 },
  { header: 'Retention Period', key: 'retentionPeriod', width: 20 },
  { header: 'Disposal Method', key: 'disposalMethod', width: 22 },
  { header: 'Security Measures', key: 'securityMeasures', width: 28 },
  { header: 'DPO Contact', key: 'dpoContact', width: 20 },
  { header: 'Remarks', key: 'remarks', width: 24 },
  { header: 'Created By', key: 'createdBy', width: 20 },
  { header: 'Created At', key: 'createdAt', width: 20 },
  { header: 'Submitted At', key: 'submittedAt', width: 20 },
  { header: 'Approved By', key: 'approvedBy', width: 20 },
  { header: 'Approved At', key: 'approvedAt', width: 20 },
  { header: 'Rejection Reason', key: 'rejectionReason', width: 24 },
];

export async function buildRopaExcelWorkbook(records: ExportableRecord[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ROPA';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('ROPA Records', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  sheet.columns = COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC9A227' } };
  headerRow.alignment = { vertical: 'middle' };

  for (const record of records) {
    sheet.addRow({
      referenceNo: safeCell(record.referenceNo),
      department: safeCell(`${record.department.code} — ${record.department.nameEn}`),
      status: record.status,
      activityName: safeCell(record.activityName),
      purpose: safeCell(record.purpose),
      legalBasis: safeCell(record.legalBasis),
      controllerName: safeCell(record.controllerName),
      jointController: record.jointController ? safeCell(record.jointController) : '',
      dataSubjectCategories: joinList(record.dataSubjectCategories),
      dataCategories: joinList(record.dataCategories),
      sensitiveDataCategories: joinList(record.sensitiveDataCategories),
      collectionSource: safeCell(record.collectionSource),
      recipients: joinList(record.recipients),
      hasCrossBorderTransfer: record.hasCrossBorderTransfer ? 'Yes' : 'No',
      crossBorderDestination: record.crossBorderDestination ? safeCell(record.crossBorderDestination) : '',
      crossBorderSafeguards: record.crossBorderSafeguards ? safeCell(record.crossBorderSafeguards) : '',
      retentionPeriod: safeCell(record.retentionPeriod),
      disposalMethod: safeCell(record.disposalMethod),
      securityMeasures: safeCell(record.securityMeasures),
      dpoContact: record.dpoContact ? safeCell(record.dpoContact) : '',
      remarks: record.remarks ? safeCell(record.remarks) : '',
      createdBy: safeCell(record.createdBy.fullName),
      createdAt: record.createdAt.toISOString().slice(0, 19).replace('T', ' '),
      submittedAt: record.submittedAt ? record.submittedAt.toISOString().slice(0, 19).replace('T', ' ') : '',
      approvedBy: record.approvedBy ? safeCell(record.approvedBy.fullName) : '',
      approvedAt: record.approvedAt ? record.approvedAt.toISOString().slice(0, 19).replace('T', ' ') : '',
      rejectionReason: record.rejectionReason ? safeCell(record.rejectionReason) : '',
    });
  }

  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNS.length } };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
