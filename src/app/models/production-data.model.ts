/**
 * Time-series production data for a well
 * Arrays are parallel - same index represents same time point
 */
export interface ProductionData {
    wellId: string;

    // Time series (all arrays must have same legnth)
    dates: Date[];

    // Rates (daily average)
    oilRates: number[];         // STB/day
    gasRates: number[];         // Mscf/day
    waterRates: number[];       // STB/day

    // Cumulative production
    cumulativeOil: number[];    // STB
    cumulativeGas: number[];    // Mscf
    cumulativeWater: number[]   // STB

    // Pressure data (optional, may be sparse)
    pressure?: number[];        // psi (undefined for days withouth measurement)
}

/**
 * Dedicated pressure test data (more detailed than production pressures)
 */
export interface PressureData {
    wellId: string;
    testDate: Date;

    // Pressure measurements
    staticPressure?: number;    // psi
    flowingPressure?: number;   // psi
    shutInPressure?: number;    // psi

    // Test conditions
    testRate?: number;          // STB/day or Mscf/day
    testDuration?: number;      // hours
}