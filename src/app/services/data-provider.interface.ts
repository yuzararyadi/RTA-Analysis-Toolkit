import { Observable } from 'rxjs';
import { Well, WellProperties } from '../models/well.model';
import { ProductionData, PressureData } from '../models/production-data.model';
import { RTAResults } from '../models/rta-results.model';

/**
 * Abstraction for all data sources (mock, HTTP, OFM bridge)
 * All methods return Observables for async operations and consistency
 */
export interface IDataProvider {
    /**
     * Phase 1 Load: Get list of available wells
     */
    getWellList(): Observable<Well[]>;

    /**
     * Phase 1 Load: Get static well properties
     */
    getWellProperties(wellId: string): Observable<WellProperties>;

    /**
     * Phase 2 Load: Get production time series (can be large)
     */
    getProductionData(wellId: string): Observable<ProductionData>;

    /**
     * Phase 2 Load: Get pressure test data (optional)
     */
    getPressureData(wellId: string): Observable<PressureData[]>;

    /**
     * Save anlysis results (implementation-dependent)
     */
    saveAnalysisResults(results: RTAResults): Observable<void>;

}

/**
 * Configuration for data provider initialization
 */
export interface DataProviderConfig {
    mode: 'mock' | 'http' | 'ofm' ;
    apiUrl?: string;
    mockDataPath?: string;
}