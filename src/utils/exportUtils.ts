/**
 * Export Utilities
 * Functions for exporting data to CSV, PDF, etc.
 */

import type { CalendarClient } from '../api/crmClientsApi';
import type { ClientReport } from '../services/crmReportsService';

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
 * Export clients to CSV
 * @param clients - Array of clients
 * @param filename - Filename (default: 'clients')
 */
export function exportClientsToCSV(
  clients: CalendarClient[],
  filename: string = 'clients'
): void {
  const csvData = clients.map(client => ({
    'שם לקוח': client.client_name,
    'אימייל': client.client_email || '',
    'טלפון': client.client_phone || '',
    'סה"כ אירועים': client.total_events_count,
    'אירועים קרובים': client.upcoming_events_count,
    'אירועים הושלמו': client.completed_events_count,
    'תאריך אירוע ראשון': client.first_event_date || '',
    'תאריך אירוע אחרון': client.last_event_date || '',
    'מקושר למתאמן': client.trainee_id ? 'כן' : 'לא',
  }));

  const csv = arrayToCSV(csvData);
  downloadCSV(csv, filename);
}

/**
 * Export reports to CSV
 * @param reports - Array of client reports
 * @param filename - Filename (default: 'client-reports')
 */
export function exportReportsToCSV(
  reports: ClientReport[],
  filename: string = 'client-reports'
): void {
  const csvData = reports.map(report => ({
    'שם לקוח': report.client.client_name,
    'אימייל': report.client.client_email || '',
    'ימים מאז קשר אחרון': report.daysSinceLastContact === Infinity 
      ? 'לא היה קשר' 
      : report.daysSinceLastContact,
    'זקוק למעקב': report.needsFollowUp ? 'כן' : 'לא',
    'מעוכב': report.isOverdue ? 'כן' : 'לא',
    'תדירות אימונים': `${report.workoutFrequency.toFixed(1)}/שבוע`,
  }));

  const csv = arrayToCSV(csvData);
  downloadCSV(csv, filename);
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

/**
 * Export clients to PDF
 * @param clients - Array of clients
 * @param title - Document title
 */
export async function exportClientsToPDF(
  clients: CalendarClient[],
  title: string = 'דוח לקוחות'
): Promise<void> {
  const tableRows = clients.map(client => `
    <tr>
      <td>${client.client_name}</td>
      <td>${client.client_email || ''}</td>
      <td>${client.client_phone || ''}</td>
      <td>${client.total_events_count}</td>
      <td>${client.upcoming_events_count}</td>
      <td>${client.completed_events_count}</td>
    </tr>
  `).join('');

  const tableContent = `
    <table>
      <thead>
        <tr>
          <th>שם לקוח</th>
          <th>אימייל</th>
          <th>טלפון</th>
          <th>סה"כ אירועים</th>
          <th>אירועים קרובים</th>
          <th>אירועים הושלמו</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  `;

  const pdfUrl = await generatePDF(title, tableContent);
  downloadPDF(pdfUrl, 'clients-report');
}
