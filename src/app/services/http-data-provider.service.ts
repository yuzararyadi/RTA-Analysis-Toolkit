import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { IDataProvider } from './data-provider.interface';
import { Well, WellProperties } from '../models/well.model';
import { ProductionData, PressureData } from '../models/production-data.model';
import { RTAResults } from '../models/rta-results.model';

/**
 * HTTP-based data provider for REST API integration
 * Not fully implemented in Phawse 1, but structure is ready
 */
@Injectable({
    providedIn: 'root'
})
export class HttpDataProviderService implements IDataProvider {

    private apiUrl: string = 'http://localhost:3000/api'; // From environment in production

    constructor(private http: HttpClient) {}

    getWellProperties(wellId: string): Observable<WellProperties> {
    return this.http.get<WellProperties>(`${this.apiUrl}/wells/${wellId}/properties`)
      .pipe(
        catchError(this.handleError)
      );
  }

    getWellList(): Observable<Well[]> {
        return this.http.get<Well[]>(`${this.apiUrl}/wells`)
        .pipe(
            catchError(this.handleError)
        );
    }
    getProductionData(wellId: string): Observable<ProductionData> {
    return this.http.get<any>(`${this.apiUrl}/wells/${wellId}/production`)
      .pipe(
        map(data => this.parseProductionData(data)),
        catchError(this.handleError)
      );
  }

  getPressureData(wellId: string): Observable<PressureData[]> {
    return this.http.get<PressureData[]>(`${this.apiUrl}/wells/${wellId}/pressure`)
      .pipe(
        catchError(this.handleError)
      );
  }

  saveAnalysisResults(results: RTAResults): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/analysis`, results)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Parse production data from API response
   * Converts date strings to Date objects
   */
  private parseProductionData(data: any): ProductionData {
    return {
      ...data,
      dates: data.dates.map((d: string) => new Date(d))
    };
  }

  /**
   * Centralized error handler
   */
  private handleError(error: any): Observable<never> {
    console.error('HTTP Data Provider Error:', error);
    const message = error.error?.message || error.message || 'Unknown error occurred';
    return throwError(() => new Error(message));
  }
}