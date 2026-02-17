import { Injectable } from "@angular/core";
import { Observable, of, throwError } from "rxjs";
import { delay } from "rxjs/operators";
import { IDataProvider } from "./data-provider.interface";
import { Well, WellProperties } from "../models/well.model";
import { ProductionData, PressureData } from "../models/production-data.model";
import { RTAResults } from "../models/rta-results.model";

/**
 * Mock data provider using hardcoded CSV-like data
 * Simulates realistic petroleum engineering datasets
 */
@Injectable({
    providedIn: 'root'
})
export class MockDataProviderService implements IDataProvider {
    private wells: Well[] = [
    {
      wellId: 'W001',
      wellName: 'Baker-Federal 12-34H',
      apiNumber: '42-389-12345',
      field: 'Wolfcamp Field',
      reservoir: 'Wolfcamp A',
      completionType: 'horizontal',
      fluidType: 'oil'
    },
    {
      wellId: 'W002',
      wellName: 'Smith Unit 5-8',
      apiNumber: '42-389-12346',
      field: 'Wolfcamp Field',
      reservoir: 'Wolfcamp B',
      completionType: 'horizontal',
      fluidType: 'oil'
    },
    {
      wellId: 'W003',
      wellName: 'Anderson Gas 21-14',
      apiNumber: '05-045-67890',
      field: 'Piceance Basin',
      reservoir: 'Mesaverde',
      completionType: 'vertical',
      fluidType: 'gas'
    }
  ];

  private wellProperties: Map<string, WellProperties> = new Map([
    ['W001', {
      wellId: 'W001',
      porosity: 0.08,
      netPayThickness: 250,
      initialPressure: 6800,
      temperature: 275,
      oilGravity: 42,
      gasGravity: 0.65,
      formationVolumeFactor: 1.25,
      viscosity: 0.35,
      wellboreRadius: 0.328,
      drainageArea: 160,
      perforationInterval: { top: 8500, bottom: 8750 }
    }],
    ['W002', {
      wellId: 'W002',
      porosity: 0.07,
      netPayThickness: 220,
      initialPressure: 7200,
      temperature: 285,
      oilGravity: 40,
      gasGravity: 0.68,
      formationVolumeFactor: 1.30,
      viscosity: 0.40,
      wellboreRadius: 0.328,
      drainageArea: 140
    }],
    ['W003', {
      wellId: 'W003',
      porosity: 0.12,
      netPayThickness: 180,
      initialPressure: 4500,
      temperature: 220,
      gasGravity: 0.60,
      formationVolumeFactor: 1.0,
      viscosity: 0.018,
      wellboreRadius: 0.292,
      drainageArea: 640
    }]
  ]);

  constructor() {}

  getWellList(): Observable<Well[]> {
      // Simulate network delay
      return of(this.wells).pipe(delay(300));
  }
  getWellProperties(wellId: string): Observable<WellProperties> {
    const properties = this.wellProperties.get(wellId);
    if (!properties) {
        return throwError(() => new Error(`Well properties not found ${wellId}`));
    }
    return of(properties).pipe(delay(200));
  }

  getProductionData(wellId: string): Observable<ProductionData> {
      // Generate realistic production data based on well type
      const well = this.wells.find(w => w.wellId === wellId);
      if (!well) {
        return throwError(() => new Error(`Well not foun: ${wellId}`));
      }

      const productionData = this.generateProductionData(well);
      // Simulate longer load time for produciton data
      return of(productionData).pipe(delay(800));
  }

  getPressureData(wellId: string): Observable<PressureData[]> {
    // Mock pressure test data
    const pressureTests: PressureData [] = [
        {
            wellId : wellId,
            testDate: new Date('2023-06-15'),
            staticPressure: 6500,
            flowingPressure: 4200,
            testRate: 450,
            testDuration: 24

        }
    ];
    return of(pressureTests).pipe(delay(300));
  }

  saveAnalysisResults(results: RTAResults): Observable<void> {
      // Mock save - just log to console'
      console.log('Moch save - Analysis result:', results);
      return of(void 0).pipe(delay(500));
  }

  /**
   * Generate realistic production decline data
   * Uses hyperbolic decline for oil wells, exponential for gas
   */
  private generateProductionData(well: Well): ProductionData {
    const days = 365 * 3; // 3 years of data
    const dates : Date[] = [];
    const oilRates: number[] = [];
    const gasRates: number[] = [];
    const waterRates: number[] = [];
    const cumulativeOil: number [] = [];
    const cumulativeGas: number [] = [];
    const cumulativeWater: number [] = [];

    const startDate = new Date('2021-01-01');

    let cumOil = 0;
    let cumGas = 0;
    let cumWater = 0;

    if (well.fluidType === 'oil') {
        // Typical Permain horizontal oil well decline
        const qi = 800;     // initial rate STB/day
        const b = 1.2;      // hyperbolic exponent
        const Di = 0.70;    // initial decline rate (nominal, 1/year)
        const waterCut = 0.05;   //inital water cut
        const GOR = 800;    // gas-oil ratio (Scf/bbl)

        for (let day = 0; day < days; day++) {
            const t = day / 365;   // time in years
            const q_oil = qi / Math.pow(1 + b * Di * t, 1/b);
            const q_water = q_oil * (waterCut + t * 0.02); //increasing water cut
            const q_gas = q_oil * GOR / 1000; //convert to Mscf/day

            cumOil += q_oil;
            cumGas += q_gas;
            cumWater += q_water;

            const currentDate = new Date(startDate);
            currentDate.setDate(currentDate.getDate() + day);

            dates.push(currentDate);
            oilRates.push(Math.round(q_oil * 10) / 10);
            gasRates.push(Math.round(q_gas * 10) / 10);
            waterRates.push(Math.round(q_water * 10) / 10);
            cumulativeOil.push(Math.round(cumOil));
            cumulativeGas.push(Math.round(cumGas));
            cumulativeWater.push(Math.round(cumWater));
        }
    }
    else {
        // typical gas well decline (exponential)
        const qi = 3500; // initial rate Mscf/day
      const Di = 0.45; // decline rate (nominal, 1/year)

      for (let day = 0; day < days; day++) {
        const t = day / 365;
        const q_gas = qi * Math.exp(-Di * t);
        const q_water = 10 + t * 5; // some water production

        cumGas += q_gas;
        cumWater += q_water;

        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + day);

        dates.push(currentDate);
        oilRates.push(0); // gas well
        gasRates.push(Math.round(q_gas * 10) / 10);
        waterRates.push(Math.round(q_water * 10) / 10);
        cumulativeOil.push(0);
        cumulativeGas.push(Math.round(cumGas));
        cumulativeWater.push(Math.round(cumWater));
      }
    
    }

    return {
        wellId: well.wellId,
        dates,
        oilRates,
        gasRates,
        waterRates,
        cumulativeOil,
        cumulativeGas,
        cumulativeWater
    };
  }
}