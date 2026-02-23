/**
 * Input data required for Blasingame analysis
 */
export interface BlasingameInput {
  // Time series (parallel arrays)
  dates: Date[];
  rates: number[];              // STB/day or Mscf/day
  cumulativeProduction: number[]; // STB or Mscf
  pressures?: number[];         // psi (optional, will use avg if missing) ← FIXED
  
  // Well/reservoir properties
  initialPressure: number;      // psi
  wellboreRadius: number;       // ft
  netPayThickness: number;      // ft
  porosity: number;             // fraction
  totalCompressibility: number; // psi^-1
  viscosity: number;            // cp
  formationVolumeFactor: number; // rb/stb or dimensionless
}

/**
 * Calculated Blasingame functions (dimensionless)
 */
export interface BlasingameOutput {
  // Dimensionless time (material balance time)
  teDimensionless: number[];    // tD based on drainage area
  
  // Material balance time (actual)
  materialBalanceTime: number[]; // days
  
  // Dimensionless rate functions
  qDd: number[];                 // Normalized rate (q/Δp)
  qDdi: number[];                // Rate integral
  qDdid: number[];               // Rate integral derivative
  
  // Pressure drop used for normalization
  pressureDrops: number[];       // psi
  
  // Original data (for reference)
  times: number[];               // days from start
  rates: number[];               // original rates
}

/**
 * Type curve match parameters (user adjusts these)
 */
export interface BlasingameMatchParams {
  permeabilityThickness: number; // md-ft (kh)
  skinFactor: number;            // dimensionless
  drainageArea: number;          // acres
}

/**
 * Flow regime identification result
 */
export interface FlowRegimeSegment {
  regime: 'infinite-acting' | 'transition' | 'boundary-dominated' | 'depletion'; // ← FIXED
  startIndex: number;
  endIndex: number;
  diagnosticSlope?: number;      // log-log slope for identification
  confidence: 'low' | 'medium' | 'high';
}