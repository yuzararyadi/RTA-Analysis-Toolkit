import { Injectable } from '@angular/core';
import { ImportedDataset, PersistedImport } from '../models/import.model';
import { Well } from '../models/well.model';
import { ProductionData } from '../models/production-data.model';

const STORAGE_KEY = 'rta_last_import';
const CURRENT_VERSION = 1 as const;

@Injectable({ providedIn: 'root' })
export class ImportPersistenceService {

  save(dataset: ImportedDataset): void {
    const { well, productionData, importedAt, sourceFileName } = dataset;
    const dates = productionData.dates;

    const payload: PersistedImport = {
      version: CURRENT_VERSION,
      importedAt: importedAt.toISOString(),
      sourceFileName,
      wellId: well.wellId,
      wellName: well.wellName,
      apiNumber: well.apiNumber,
      field: well.field,
      fluidType: well.fluidType,
      completionType: well.completionType,
      rowCount: dates.length,
      dateRange: {
        start: dates[0].toISOString(),
        end: dates[dates.length - 1].toISOString(),
      },
      productionData: {
        wellId: productionData.wellId,
        dates: dates.map(d => d.toISOString()),
        oilRates: productionData.oilRates,
        gasRates: productionData.gasRates,
        waterRates: productionData.waterRates,
        cumulativeOil: productionData.cumulativeOil,
        cumulativeGas: productionData.cumulativeGas,
        cumulativeWater: productionData.cumulativeWater,
        pressure: productionData.pressure,
      },
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('ImportPersistenceService: Could not save to localStorage (quota exceeded?)', e);
    }
  }

  load(): ImportedDataset | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    let persisted: PersistedImport;
    try {
      persisted = JSON.parse(raw) as PersistedImport;
    } catch {
      console.warn('ImportPersistenceService: Corrupt data in localStorage, clearing.');
      this.clear();
      return null;
    }

    // Version guard — discard if schema changed
    if (persisted.version !== CURRENT_VERSION) {
      console.warn('ImportPersistenceService: Stored data version mismatch, clearing.');
      this.clear();
      return null;
    }

    const well: Well = {
      wellId: persisted.wellId,
      wellName: persisted.wellName,
      apiNumber: persisted.apiNumber ?? '',
      field: persisted.field ?? '',
      fluidType: persisted.fluidType,
      completionType: persisted.completionType,
    };

    const dates = persisted.productionData.dates.map(s => new Date(s));

    const productionData: ProductionData = {
      wellId: persisted.productionData.wellId,
      dates,
      oilRates: persisted.productionData.oilRates,
      gasRates: persisted.productionData.gasRates,
      waterRates: persisted.productionData.waterRates,
      cumulativeOil: persisted.productionData.cumulativeOil,
      cumulativeGas: persisted.productionData.cumulativeGas,
      cumulativeWater: persisted.productionData.cumulativeWater,
      pressure: persisted.productionData.pressure,
    };

    return {
      well,
      productionData,
      importedAt: new Date(persisted.importedAt),
      sourceFileName: persisted.sourceFileName,
    };
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  has(): boolean {
    return localStorage.getItem(STORAGE_KEY) !== null;
  }
}
