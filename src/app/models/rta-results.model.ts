/**
 * Results from RTA analysis that can be saved/exported
 */
export interface RTAResults {
    wellId: string;
    analysisType: 'blasingame' | 'agarwal-gardner' | 'npi';
    analysisDate: Date;

    // Calculated parameters
    permeabilityThickness?: number;     // md-ft (kh)
    skinFactor?: number;                // dimensionless
    drainageArea?: number;              // acres

    // Flow regime identification
    flowRegimes?: FlowRegime[];

    // Quality metrics
    matchQuality?: number;              // 0-1 score
    notes?: string;

}

export interface FlowRegime {
    regime: 'transient' | 'boundary-dominated' | 'linear' | 'bilinear' | 'radial' ;
    startTime: number;      // days
    endTime: number;        // days
    confidence: 'low' | 'medium' | 'high' ;
}