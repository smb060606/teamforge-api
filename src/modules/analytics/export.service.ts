import { logger } from '../../config/logger';

interface ExportRow {
  [key: string]: string | number | boolean | null;
}

// BUG #34: Synchronous CSV generation blocks event loop
// O(n^2) string concatenation — each += creates a new string
export function generateCSV(headers: string[], data: ExportRow[]): string {
  // BUG #28: No CSV injection escaping
  // User-provided data (team names, project names, incident descriptions)
  // written directly without escaping formula-triggering characters (=, +, -, @)
  // A team named "=CMD('calc')" would execute when opened in Excel

  let csv = headers.join(',') + '\n';

  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value}"`;
      }
      // No escaping of formula characters: =, +, -, @, \t, \r
      return String(value);
    });

    // BUG #34: O(n^2) string concatenation
    csv += values.join(',') + '\n';
  }

  return csv;
}

// BUG #29: SSRF via unvalidated callbackUrl
// No validation of the URL — internal network addresses not blocked
export async function sendExportCallback(callbackUrl: string, csvData: string): Promise<void> {
  logger.info({ callbackUrl }, 'Sending export callback');

  // No URL validation — could be:
  // http://169.254.169.254/latest/meta-data/ (AWS metadata)
  // http://localhost:6379/ (Redis)
  // http://internal-service:8080/ (internal services)
  const response = await fetch(callbackUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/csv' },
    body: csvData,
  });

  if (!response.ok) {
    throw new Error(`Callback failed with status ${response.status}`);
  }
}
