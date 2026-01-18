/**
 * Export Utilities
 * Functions for exporting data to CSV, PDF, etc.
 */


/**
 * Convert array of objects to CSV string
 * @param data - Array of objects
 * @param headers - Optional custom headers
 * @returns CSV string
 */
export function arrayToCSV<T extends Record<string, any>>(
  data: T[],
  headers?: string[]
): string {
  if (data.length === 0) {
    return '';
  }

  // Get headers from first object if not provided
  const csvHeaders = headers || Object.keys(data[0]);
  
  // Create CSV header row
  const headerRow = csvHeaders.map(h => `"${h}"`).join(',');
  
  // Create CSV data rows
  const dataRows = data.map(item =>
    csvHeaders.map(header => {
      const value = item[header];
      // Handle null/undefined
      if (value === null || value === undefined) {
        return '""';
      }
      // Escape quotes and wrap in quotes
      const stringValue = String(value).replace(/"/g, '""');
      return `"${stringValue}"`;
    }).join(',')
  );

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Download CSV file
 * @param csvContent - CSV string content
 * @param filename - Filename (without extension)
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}


/**
 * Generate PDF content (basic HTML to PDF)
 * Note: For production, use a proper PDF library like jsPDF or pdfkit
 * @param title - Document title
 * @param content - HTML content
 * @returns Blob URL for PDF
 */
export async function generatePDF(
  title: string,
  content: string
): Promise<string> {
  // Basic implementation - in production use proper PDF library
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            direction: rtl;
          }
          h1 {
            color: #333;
            border-bottom: 2px solid #4ade80;
            padding-bottom: 10px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: right;
          }
          th {
            background-color: #4ade80;
            color: white;
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        ${content}
      </body>
    </html>
  `;

  const blob = new Blob([htmlContent], { type: 'text/html' });
  return URL.createObjectURL(blob);
}

/**
 * Download PDF (opens in new window for printing)
 * @param pdfUrl - PDF blob URL
 * @param filename - Filename
 */
export function downloadPDF(pdfUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = pdfUrl;
  link.target = '_blank';
  link.download = `${filename}.pdf`;
  link.click();
}
