/**
 * Represents a well with basic identification and properties
 */
export interface Well {
    wellId: string;
    wellName: string;
    apiNumber: string;
    field: string;
    reservoir?: string;
    completionType?: 'vertical' | 'horizontal' | 'deviated';
    fluidType?: 'oil' | 'gas' | 'condensate';
}

/**
 * Static well properties needed for RTA calculations
 */
export interface WellProperties {
    wellId: string;

    // Reservoir properites
    porosity?: number;          // fraction
    netPayThickness?: number;   // ft
    initialPressure?: number;   // psi
    temperature?: number;       // Fahrenheit

    // Fluid properties
    oilGravity?: number;        // API
    gasGravity?: number;        // specific gravity (air = 1)
    formationVolumeFactor?: number; // rb/stb for oil, dimensionless for gas
    viscosity?: number;         // cp

    // Well geometry
    wellboreRadius?: number;    // ft
    drainageArea?: number;      // acres

    // Completion
    perforationInterval?: {
        top: number;            // ft
        bottom: number;         // ft
    };
}
