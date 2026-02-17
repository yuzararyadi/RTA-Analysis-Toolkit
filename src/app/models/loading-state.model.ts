/**
 * Represents the loading state of async operations
 */
export interface LoadingState {
    isLoading: boolean;
    error?: string;
    lastUpdated?: Date;
}

/**
 * Combined loading states for the application
 */
export interface AppLoadingState {
    wellList: LoadingState;
    wellProperties: LoadingState;
    productionData: LoadingState;
    pressureData: LoadingState;
}

/**
 * Helper to create initial loading state
 */
export function createInitialLoadingState(): LoadingState {
    return {
        isLoading: false,
        error: undefined,
        lastUpdated: undefined

    };
}

/**
 * Helper to create loading state for all app sections
 */
export function createInitialAppLoadingState(): AppLoadingState {
    return {
        wellList: createInitialLoadingState(),
        wellProperties: createInitialLoadingState(),
        productionData: createInitialLoadingState(),
        pressureData: createInitialLoadingState()
    };
}