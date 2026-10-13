import * as XLSX from 'xlsx';
import { ParsedSheetData, SheetRow } from '../types';

export async function parseSpreadsheetBlob(blob: Blob): Promise<ParsedSheetData> {
  const arrayBuffer = await blob.arrayBuffer();
  // cellDates: true parses dates cleanly, raw: false preserves display formatting
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('No worksheets found in the file.');
  }

  const sheets = workbook.SheetNames.map((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    // Convert worksheet to 2D array of rows
    const matrix: unknown[][] = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1, 
      defval: '',
      blankrows: false 
    });

    if (matrix.length === 0) {
      return {
        name: sheetName,
        headers: [],
        rows: [],
      };
    }

    // Determine max columns across all rows
    let maxCols = 0;
    matrix.forEach((row) => {
      if (Array.isArray(row) && row.length > maxCols) {
        maxCols = row.length;
      }
    });

    if (maxCols === 0) {
      return {
        name: sheetName,
        headers: [],
        rows: [],
      };
    }

    // First row is headers
    const rawHeaders = Array.isArray(matrix[0]) ? matrix[0] : [];
    const headers: string[] = [];
    const usedHeadersCount: Record<string, number> = {};

    for (let c = 0; c < maxCols; c++) {
      const val = rawHeaders[c];
      let baseHeader = val !== undefined && val !== null && String(val).trim() !== ''
        ? String(val).trim()
        : `Column ${c + 1}`;
      
      // Ensure unique header keys even if duplicate column names exist
      if (usedHeadersCount[baseHeader] !== undefined) {
        usedHeadersCount[baseHeader] += 1;
        baseHeader = `${baseHeader} (${usedHeadersCount[baseHeader]})`;
      } else {
        usedHeadersCount[baseHeader] = 0;
      }

      headers.push(baseHeader);
    }

    // Data rows
    const rows: SheetRow[] = [];
    for (let r = 1; r < matrix.length; r++) {
      const rowArr = Array.isArray(matrix[r]) ? matrix[r] : [];
      // Check if row has any non-empty cell
      const hasValue = rowArr.some(
        (cell) => cell !== undefined && cell !== null && String(cell).trim() !== ''
      );
      if (!hasValue) continue;

      const rowObj: SheetRow = {};
      for (let c = 0; c < maxCols; c++) {
        const headerKey = headers[c];
        const cellValue = rowArr[c];
        rowObj[headerKey] = cellValue !== undefined && cellValue !== null ? String(cellValue) : '';
      }
      rows.push(rowObj);
    }

    return {
      name: sheetName,
      headers,
      rows,
    };
  });

  return {
    sheets,
    activeSheetIndex: 0,
  };
}
