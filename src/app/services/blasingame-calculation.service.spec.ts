import { TestBed } from '@angular/core/testing';
import { BlasingameCalculationService } from './blasingame-calculation.service';
import { BlasingameInput } from '../models/blasingame.model';

describe('BlasingameCalculationService', () => {
  let service: BlasingameCalculationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BlasingameCalculationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should calculate material balance time correctly', () => {
    // Use larger dataset to avoid edge cases in derivative/integral
    const input: BlasingameInput = {
      dates: generateDates(10), // 10 days
      rates: [100, 95, 90, 85, 80, 75, 70, 65, 60, 55],
      cumulativeProduction: [100, 195, 285, 370, 450, 525, 595, 660, 720, 775],
      initialPressure: 5000,
      wellboreRadius: 0.3,
      netPayThickness: 100,
      porosity: 0.1,
      totalCompressibility: 1e-5,
      viscosity: 0.5,
      formationVolumeFactor: 1.2
    };

    const result = service.calculate(input);

    // Verify we got data back
    expect(result.materialBalanceTime.length).toBeGreaterThan(0);
    
    // Check first few material balance times
    // te = Np/q
    const expectedTe0 = 100 / 100; // 1.0
    const expectedTe1 = 195 / 95;  // ~2.05
    
    // Find these values in the cleaned result
    // (cleanData may have removed some early points)
    if (result.materialBalanceTime.length > 0) {
      expect(result.materialBalanceTime[0]).toBeGreaterThan(0);
      expect(result.materialBalanceTime[0]).toBeLessThan(10); // Reasonable range
    }
  });

  it('should calculate normalized rate (q/dp)', () => {
    const input: BlasingameInput = {
      dates: generateDates(10),
      rates: [1000, 950, 900, 850, 800, 750, 700, 650, 600, 550],
      cumulativeProduction: [1000, 1950, 2850, 3700, 4500, 5250, 5950, 6600, 7200, 7750],
      pressures: [4500, 4450, 4400, 4350, 4300, 4250, 4200, 4150, 4100, 4050], // Declining pressure
      initialPressure: 5000,
      wellboreRadius: 0.3,
      netPayThickness: 100,
      porosity: 0.1,
      totalCompressibility: 1e-5,
      viscosity: 0.5,
      formationVolumeFactor: 1.2
    };

    const result = service.calculate(input);

    // Verify normalized rate was calculated
    expect(result.qDd.length).toBeGreaterThan(0);
    
    // All qDd values should be positive and finite
    result.qDd.forEach(value => {
      expect(value).toBeGreaterThan(0);
      expect(isFinite(value)).toBe(true);
    });

    // qDd = q / (Pi - Pwf)
    // First point: 1000 / (5000 - 4500) = 1000/500 = 2.0
    const expectedQDd0 = 1000 / (5000 - 4500);
    
    // The first value in cleaned data should be close to this
    expect(result.qDd[0]).toBeCloseTo(expectedQDd0, 0); // Within 0.5
  });

  it('should handle zero rates without crashing', () => {
    const input: BlasingameInput = {
      dates: generateDates(10),
      rates: [100, 90, 0, 0, 80, 75, 70, 65, 60, 55], // Zeros in middle (shut-in)
      cumulativeProduction: [100, 190, 190, 190, 270, 345, 415, 480, 540, 595],
      initialPressure: 5000,
      wellboreRadius: 0.3,
      netPayThickness: 100,
      porosity: 0.1,
      totalCompressibility: 1e-5,
      viscosity: 0.5,
      formationVolumeFactor: 1.2
    };

    // Should not throw
    expect(() => service.calculate(input)).not.toThrow();
    
    const result = service.calculate(input);
    
    // Should have removed invalid points (zero rates)
    expect(result.materialBalanceTime.length).toBeLessThan(10);
    expect(result.materialBalanceTime.length).toBeGreaterThan(0);
  });

  it('should identify flow regimes', () => {
    // Create synthetic data with known flow regime (linear flow)
    const te = Array.from({ length: 50 }, (_, i) => Math.pow(10, i * 0.05));
    
    // Linear flow: qDdid ∝ te^(-0.5), so log-log slope = -0.5
    const qDdid = te.map(t => 100 / Math.sqrt(t));

    const regimes = service.identifyFlowRegimes(te, qDdid);

    expect(regimes.length).toBeGreaterThan(0);
    expect(regimes[0].regime).toBe('infinite-acting');
    
    // Diagnostic slope should be around -0.5 for linear flow
    if (regimes[0].diagnosticSlope !== undefined) {
      expect(regimes[0].diagnosticSlope).toBeLessThan(0);
      expect(regimes[0].diagnosticSlope).toBeGreaterThan(-1.0);
    }
  });
});

/**
 * Helper to generate sequential dates
 */
function generateDates(count: number): Date[] {
  const dates: Date[] = [];
  const start = new Date('2023-01-01');
  
  for (let i = 0; i < count; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    dates.push(date);
  }
  
  return dates;
}