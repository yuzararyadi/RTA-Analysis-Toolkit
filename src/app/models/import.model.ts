import { Well } from './well.model';
import { ProductionData } from './production-data.model';

/** A validated, typed row ready for mapping to ProductionData */
export interface ParsedImportRow {
  date: Date;
  oilRate: number;    // STB/day (0 if absent)
  gasRate: number;    // Mscf/day (0 if absent)
  waterRate: number;  // STB/day (0 if absent)
  pressure?: number;  // psia (undefined if absent)
}

/** Validation error that blocks confirming the import */
export interface ImportError {
  row: number;    // 1-based row index (0 = header/file-level)
  column: string;
  message: string;
}

/** Validation warning that allows confirming but informs the user */
export interface ImportWarning {
  row: number;
  message: string;
}

/** Result returned by the parser before the user confirms */
export interface ImportValidationResult {
  isValid: boolean;
  errors: ImportError[];
  warnings: ImportWarning[];
  rows: ParsedImportRow[];
}

/** Well metadata entered by the user in the import dialog */
export interface WellImportMetadata {
  wellName: string;
  apiNumber?: string;
  field?: string;
  fluidType?: 'oil' | 'gas' | 'condensate';
  completionType?: 'vertical' | 'horizontal' | 'deviated';
}

/** Final dataset handed to AppStateService after user confirms */
export interface ImportedDataset {
  well: Well;
  productionData: ProductionData;
  importedAt: Date;
  sourceFileName: string;
}

/** Summary shown in the data management panel */
export interface ImportSummary {
  wellName: string;
  sourceFileName: string;
  importedAt: Date;
  rowCount: number;
  dateRange: { start: Date; end: Date };
}

/** Column mapping chosen by the user when importing an Excel file */
export interface ExcelColumnMapping {
  sheetIndex: number;         // which sheet (0-based)
  headerRowIndex: number;     // which row contains headers (0-based, usually 0)
  dateColIndex: number;       // required
  oilRateColIndex?: number;
  gasRateColIndex?: number;
  waterRateColIndex?: number;
  pressureColIndex?: number;
}

/** Info extracted from an Excel workbook before column mapping */
export interface ExcelWorkbookInfo {
  sheets: string[];           // sheet names
  headers: string[][];        // headers[sheetIndex] = string[]
}

/** Schema stored in localStorage — version field guards against schema changes */
export interface PersistedImport {
  version: 1;
  importedAt: string;       // ISO string
  sourceFileName: string;
  wellId: string;
  wellName: string;
  apiNumber?: string;
  field?: string;
  fluidType?: 'oil' | 'gas' | 'condensate';
  completionType?: 'vertical' | 'horizontal' | 'deviated';
  rowCount: number;
  dateRange: { start: string; end: string };
  productionData: {
    wellId: string;
    dates: string[];           // ISO strings
    oilRates: number[];
    gasRates: number[];
    waterRates: number[];
    cumulativeOil: number[];
    cumulativeGas: number[];
    cumulativeWater: number[];
    pressure?: number[];
  };
}
