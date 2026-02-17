import { InjectionToken } from "@angular/core";
import { IDataProvider } from "./data-provider.interface";

/**
 * Injection token for the active data provider
 * Allows Angular DI to provide the correct implementaion
 */
export const DATA_PROVIDER = new InjectionToken<IDataProvider>('DataProvider');

/**
 * Configuration for data provider selection
 */
export interface DataProviderConfig {
    mode: 'mock' | 'http' | 'ofm';
    apiUrl?: string;
}

/**
 * Factory function to create the appropriate data provider
 * Will be used in app.config.ts
 */
export function createDataProvider(
    config: DataProviderConfig,
    mockProvider: any,
    httpProvider: any
): IDataProvider {
    switch (config.mode) {
        case 'mock':
            return mockProvider;
        case 'http':
            return httpProvider;
        case 'ofm':
            throw new Error('OFM bridge not yet implemented');
        default:
            return mockProvider;
    }
}