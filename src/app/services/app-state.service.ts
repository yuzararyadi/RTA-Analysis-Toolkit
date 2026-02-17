import { Injectable } from "@angular/core";
import { Inject } from "@angular/core";
import { DATA_PROVIDER } from "./data-provider.factory";
import { BehaviorSubject, Observable, throwError } from "rxjs";
import { tap, catchError, finalize } from 'rxjs/operators';
import { IDataProvider } from "./data-provider.interface";
import { MockDataProviderService } from "./mock-data-provider.service";
import { Well, WellProperties } from "../models/well.model";
import { ProductionData, PressureData } from "../models/production-data.model";
import {
    AppLoadingState,
    createInitialAppLoadingState,
    LoadingState
} from "../models/loading-state.model";

/**
 * Centralized application state management
 * Handles well selection, data loading, and state synchronization
 */
@Injectable({
    providedIn: 'root'
})
export class AppStateService {
    // ===== Data Provider =====
    private dataProvider: IDataProvider;

    // ===== State Subjects (private) =====
    private wellListSubject = new BehaviorSubject<Well[]>([]);
    private selectedWellSubject = new BehaviorSubject<Well | null>(null);
    private wellPropertiesSubject = new BehaviorSubject<WellProperties | null>(null);
    private productionDataSubject = new BehaviorSubject<ProductionData | null>(null);
    private pressureDataSubject = new BehaviorSubject<PressureData[]>([]);
    private loadingStateSubject = new BehaviorSubject<AppLoadingState>(
        createInitialAppLoadingState()
    );

    // ===== Public Observables =====
    public wellList$: Observable<Well[]> = this.wellListSubject.asObservable();
    public selectedWell$: Observable<Well | null> = this.selectedWellSubject.asObservable();
    public wellProperties$: Observable<WellProperties | null> = this.wellPropertiesSubject.asObservable();
    public productionData$: Observable<ProductionData | null> = this.productionDataSubject.asObservable();
    public pressureData$: Observable<PressureData[]> = this.pressureDataSubject.asObservable();
    public loadingState$: Observable<AppLoadingState> = this.loadingStateSubject.asObservable();

    constructor (
        @Inject(DATA_PROVIDER) dataProvider: IDataProvider
    ){
        this.dataProvider = dataProvider;
    }

    // ===== Phase 1 Initialization =====

    /**
     * Initialize app  - load well list
     * call this when app starts
     */
    public initialize(): void {
        this.loadWellList();
    }

    /**
     * Load the list of available wells
     */
    private loadWellList(): void {
        this.setLoadingState('wellList',true);

        this.dataProvider.getWellList()
        .pipe(
            tap(wells => {
                this.wellListSubject.next(wells);
                this.setLoadingState('wellList',false);
            }),
            catchError(error => {
                this.setLoadingState('wellList', false, error.message);
                return throwError(() => error);
            })
        )
        .subscribe();
    }

    // ===== Well Selection =====

    /**
     * Select a well and load its properties (Phase 1 load)
     * Production data is loader separately on demand (Phase 2)
     */
    public selectWell(wellId: string): void {
        const well = this.wellListSubject.value.find(w => w.wellId === wellId);

        if(!well){
            console.error(`Well not found: ${wellId}`);
            return;
        }
        
        // Update selected well
        this.selectedWellSubject.next(well);

        // Clear previous well's data
        this.wellPropertiesSubject.next(null);
        this.productionDataSubject.next(null);
        this.pressureDataSubject.next([]);

        // Load well preperties (Phase 1 - quick)
        this.loadWellProperties(wellId);
    }

    /**
     * Get currently selected well (synchronous)
     */
    public getSelectedWell(): Well | null {
        return this.selectedWellSubject.value;
    }

    // ===== Phase 1 Data Loading (Quick - Properties)

    /**
     * Load static well proeprties
     */
    private loadWellProperties(wellId: string): void {
        this.setLoadingState('wellProperties', true);

        this.dataProvider.getWellProperties(wellId)
        .pipe(
            tap(properties => {
                this.wellPropertiesSubject.next(properties);
                this.setLoadingState('wellProperties', false);
            }),
            catchError(error => {
                this.setLoadingState('wellProperties', false, error.message);
                return throwError(() => error);
            })
        )
        .subscribe();
    }

    // ===== Phase 2 Data Loading (On - Demand - Time Series) ======

    /**
     * Load production data time-series data for selected well
     * Call this when user navigates to analysis view
     */
    public loadProductionData(): void {
        const well = this.selectedWellSubject.value;

        if (!well) {
            console.warn('No well selected - cannot load production data');
            return;
        }

        // Check if already loaded
        const currentData = this.productionDataSubject.value;
        if (currentData && currentData.wellId === well.wellId) {
            console.log('Production data already loaded for this well');
            return;
        }

        this.setLoadingState('productionData', true);

        this.dataProvider.getProductionData(well.wellId)
        .pipe(
            tap(data => {
                this.productionDataSubject.next(data);
                this.setLoadingState('productionData', false);

            }),
            catchError(error => {
                this.setLoadingState('productionData', false, error.message);
                return throwError(() => error);
            })
        )
        .subscribe();
    }

    /**
     * Load pressure test data for selected well
     */
    public loadPressureData(): void {
        const well = this.selectedWellSubject.value;

        if (!well) {
            console.warn('No well selected - cannot load pressure data');
            return;
        }

        this.setLoadingState('pressureData', true);

        this.dataProvider.getPressureData(well.wellId)
        .pipe(
            tap(data => {
                this.pressureDataSubject.next(data);
                this.setLoadingState('pressureData', false);
            }),
            catchError(error => {
                this.setLoadingState('pressureData', false, error.message);
                return throwError(() => error);
            })
        )
        .subscribe();
    }


    // ===== Loading State Management ======

    /**
     * Update loading state for a specific section
     */
    private setLoadingState(
        section: keyof AppLoadingState,
        isLoading: boolean,
        error?: string
    ): void {
        const currentState = this.loadingStateSubject.value;
        const updatedState: AppLoadingState = {
            ...currentState,
            [section]: {
                isLoading,
                error,
                lastUpdated: !isLoading ? new Date() : currentState[section].lastUpdated
            }
        };
        this.loadingStateSubject.next(updatedState);
    }

    /**
     * Check if any seciton is currently loading
     */
    public isAnyLoading(): boolean {
        const state = this.loadingStateSubject.value;
        return state.wellList.isLoading ||
        state.wellProperties.isLoading ||
        state.productionData.isLoading ||
        state.pressureData.isLoading;
    }

    // Data Access (Synchronous) =====

    /**
     * Get current production data (synchronous)
     * Returns null if not loaded yet
     */
    public getProductionData(): ProductionData | null {
        return this.productionDataSubject.value;
    }

    /**
     * Get current well properties (synchronous)
     */
    public getWellProperties(): WellProperties | null {
        return this.wellPropertiesSubject.value;
    }

    /**
     * Get well list (synchronous)
     */
    public getWellList(): Well[] {
        return this.wellListSubject.value;
    }

    // ===== Reset =====

    /**
     * Clear all data (useful for logout or switching contexts)
     */
    public reset(): void {
        this.wellListSubject.next([]);
        this.selectedWellSubject.next(null);
        this.wellPropertiesSubject.next(null);
        this.productionDataSubject.next(null);
        this.pressureDataSubject.next([]);
        this.loadingStateSubject.next(createInitialAppLoadingState());
    }

}