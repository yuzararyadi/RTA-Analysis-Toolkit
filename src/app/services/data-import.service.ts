import { Injectable } from '@angular/core';
import {
  ParsedImportRow,
  ImportValidationResult,
  ImportError,
  ImportWarning,
  ImportedDataset,
  WellImportMetadata,
} from '../models/import.model';
import { Well } from '../models/well.model';
import { ProductionData } from '../models/production-data.model';
import { trapezoidalIntegrate, datesToDays } from '../utils/numerical.utils';

// Maps lowercase-trimmed header names to canonical field keys
const COLUMN_ALIASES: Record<string, string> = {
  // Date
  'date': 'date',
  'time': 'date',
  'production_date': 'date',
  'prod_date': 'date',
  'proddate': 'date',
  // Oil rate
  'oil_rate_stbd': 'oilRate',
  'oil rate (stb/d)': 'oilRate',
  'oil rate': 'oilRate',
  'oil_rate': 'oilRate',
  'qo': 'oilRate',
  'oil (stb/d)': 'oilRate',
  'oil': 'oilRate',
  // Gas rate
  'gas_rate_mscfd': 'gasRate',
  'gas rate (mscf/d)': 'gasRate',
  'gas rate': 'gasRate',
  'gas_rate': 'gasRate',
  'qg': 'gasRate',
  'gas (mscf/d)': 'gasRate',
  'gas': 'gasRate',
  // Water rate
  'water_rate_stbd': 'waterRate',
  'water rate (stb/d)': 'waterRate',
  'water rate': 'waterRate',
  'water_rate': 'waterRate',
  'qw': 'waterRate',
  'water (stb/d)': 'waterRate',
  'water': 'waterRate',
  // Pressure
  'pressure_psia': 'pressure',
  'bhfp': 'pressure',
  'pwf': 'pressure',
  'pressure': 'pressure',
  'pressure (psia)': 'pressure',
  'bhp': 'pressure',
};

@Injectable({ providedIn: 'root' })
export class DataImportService {

  /**
   * Parse a CSV text string into a validated result.
   * Returns rows even if there are blocking errors so the UI can preview them.
   */
  parseCSV(text: string): ImportValidationResult {
    const errors: ImportError[] = [];
    const warnings: ImportWarning[] = [];
    const rows: ParsedImportRow[] = [];

    // Split lines and remove empty ones
    const lines = text
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (lines.length < 2) {
      errors.push({ row: 0, column: 'file', message: 'File must contain a header row and at least one data row.' });
      return { isValid: false, errors, warnings, rows };
    }

    // Parse header
    const headerCells = this.splitCSVLine(lines[0]);
    const columnMap = this.buildColumnMap(headerCells);

    if (columnMap['date'] === undefined) {
      errors.push({ row: 0, column: 'date', message: 'No date column found. Expected a column named "date", "time", or "production_date".' });
    }

    const hasRateColumn =
      columnMap['oilRate'] !== undefined ||
      columnMap['gasRate'] !== undefined ||
      columnMap['waterRate'] !== undefined;

    if (!hasRateColumn) {
      errors.push({ row: 0, column: 'rate', message: 'No rate column found. Expected at least one of: oil_rate_stbd, gas_rate_mscfd, water_rate_stbd.' });
    }

    // If critical columns are missing, return early
    if (columnMap['date'] === undefined || !hasRateColumn) {
      return { isValid: false, errors, warnings, rows };
    }

    // Parse data rows
    let dateParseErrors = 0;
    for (let i = 1; i < lines.length; i++) {
      const rowNum = i + 1; // 1-based, accounting for header
      const cells = this.splitCSVLine(lines[i]);

      const dateStr = this.getCell(cells, columnMap['date']);
      const parsedDate = new Date(dateStr);

      if (isNaN(parsedDate.getTime())) {
        errors.push({ row: rowNum, column: 'date', message: `Cannot parse date: "${dateStr}"` });
        dateParseErrors++;
        continue;
      }

      let oilRate = this.parseRate(cells, columnMap['oilRate']);
      let gasRate = this.parseRate(cells, columnMap['gasRate']);
      let waterRate = this.parseRate(cells, columnMap['waterRate']);
      const pressure = this.parsePressure(cells, columnMap['pressure']);

      // Warn and clamp negative rates
      if (oilRate < 0) { warnings.push({ row: rowNum, message: `Negative oil rate (${oilRate}) clamped to 0.` }); oilRate = 0; }
      if (gasRate < 0) { warnings.push({ row: rowNum, message: `Negative gas rate (${gasRate}) clamped to 0.` }); gasRate = 0; }
      if (waterRate < 0) { warnings.push({ row: rowNum, message: `Negative water rate (${waterRate}) clamped to 0.` }); waterRate = 0; }

      rows.push({ date: parsedDate, oilRate, gasRate, waterRate, pressure });
    }

    if (dateParseErrors > 0 && rows.length === 0) {
      return { isValid: false, errors, warnings, rows };
    }

    if (rows.length < 2) {
      errors.push({ row: 0, column: 'file', message: 'At least 2 valid data rows are required.' });
      return { isValid: false, errors, warnings, rows };
    }

    // Sort by date; warn if out of order
    const originalOrder = rows.map(r => r.date.getTime());
    rows.sort((a, b) => a.date.getTime() - b.date.getTime());
    const isSorted = rows.every((r, i) => i === 0 || r.date.getTime() >= rows[i - 1].date.getTime());
    if (!isSorted || rows.some((r, i) => i > 0 && r.date.getTime() < originalOrder[i])) {
      warnings.push({ row: 0, message: 'Dates were not in chronological order. Rows have been sorted automatically.' });
    }

    // Warn if pressure is mostly missing
    const pressureCount = rows.filter(r => r.pressure !== undefined).length;
    if (columnMap['pressure'] !== undefined && pressureCount < rows.length * 0.5) {
      warnings.push({ row: 0, message: `Pressure column present but ${rows.length - pressureCount} of ${rows.length} rows have no pressure value.` });
    }

    return { isValid: errors.length === 0, errors, warnings, rows };
  }

  /**
   * Build the final ImportedDataset from validated rows and user-supplied well metadata.
   * Computes cumulative production via trapezoidal integration.
   */
  buildDataset(
    rows: ParsedImportRow[],
    metadata: WellImportMetadata,
    fileName: string
  ): ImportedDataset {
    const wellId = `import-${Date.now()}`;

    const well: Well = {
      wellId,
      wellName: metadata.wellName,
      apiNumber: metadata.apiNumber ?? '',
      field: metadata.field ?? '',
      fluidType: metadata.fluidType,
      completionType: metadata.completionType,
    };

    const dates = rows.map(r => r.date);
    const days = datesToDays(dates);

    const oilRates = rows.map(r => r.oilRate);
    const gasRates = rows.map(r => r.gasRate);
    const waterRates = rows.map(r => r.waterRate);

    const cumulativeOil = trapezoidalIntegrate(days, oilRates);
    const cumulativeGas = trapezoidalIntegrate(days, gasRates);
    const cumulativeWater = trapezoidalIntegrate(days, waterRates);

    // Build sparse pressure array (undefined rows become NaN placeholders)
    const hasPressure = rows.some(r => r.pressure !== undefined);
    const pressure: number[] | undefined = hasPressure
      ? rows.map(r => r.pressure ?? NaN)
      : undefined;

    const productionData: ProductionData = {
      wellId,
      dates,
      oilRates,
      gasRates,
      waterRates,
      cumulativeOil,
      cumulativeGas,
      cumulativeWater,
      ...(pressure ? { pressure } : {}),
    };

    return { well, productionData, importedAt: new Date(), sourceFileName: fileName };
  }

  // ===== Private helpers =====

  private buildColumnMap(headers: string[]): Record<string, number> {
    const map: Record<string, number> = {};
    headers.forEach((h, i) => {
      const normalized = h.toLowerCase().trim();
      const canonical = COLUMN_ALIASES[normalized];
      if (canonical && map[canonical] === undefined) {
        map[canonical] = i;
      }
    });
    return map;
  }

  private splitCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  }

  private getCell(cells: string[], index: number | undefined): string {
    if (index === undefined || index >= cells.length) return '';
    return cells[index] ?? '';
  }

  private parseRate(cells: string[], index: number | undefined): number {
    const raw = this.getCell(cells, index);
    if (raw === '' || raw === null) return 0;
    const val = parseFloat(raw);
    return isNaN(val) ? 0 : val;
  }

  private parsePressure(cells: string[], index: number | undefined): number | undefined {
    if (index === undefined) return undefined;
    const raw = this.getCell(cells, index);
    if (raw === '' || raw === null) return undefined;
    const val = parseFloat(raw);
    return isNaN(val) ? undefined : val;
  }
}
