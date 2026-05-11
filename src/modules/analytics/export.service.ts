import { logger } from '../../config/logger';

interface ExportRow {
  [key: string]: string | number | boolean | null;
}

export function generateCSV(headers: string[], data: ExportRow[]): string {
  let csv = headers.join(',') + '\n';

  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value}"`;
      }
      return String(value);
    });

    csv += values.join(',') + '\n';
  }

  return csv;
}

// Send exported CSV data to a callback URL
export async function sendExportCallback(callbackUrl: string, csvData: string): Promise<void> {
  logger.info({ callbackUrl }, 'Sending export callback');

  const response = await fetch(callbackUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/csv' },
    body: csvData,
  });

  if (!response.ok) {
    throw new Error(`Callback failed with status ${response.status}`);
  }
}
