import { Injectable } from '@angular/core';
import {
  BlasingameInput,
  BlasingameOutput,
  FlowRegimeSegment
} from '../models/blasingame.model';
import {
  trapezoidalIntegrate,
  logarithmicDerivative,
  movingAverage,
  removeInvalidPoints,
  datesToDays
} from '../utils/numerical.utils';

/**
 * Blasingame Type Curve Analysis Calculations
 * Implements normalized rate functions and dimensionless time
 */
@Injectable({
  providedIn: 'root'
})
export class BlasingameCalculationService {

  /**
   * Calculate Blasingame functions from production data
   */
  public calculate(input: BlasingameInput): BlasingameOutput {
    // Convert dates to days
    const days = datesToDays(input.dates);

    // Calculate material balance time
    const materialBalanceTime = this.calculateMaterialBalanceTime(
      input.rates,
      input.cumulativeProduction
    );

    // Calculate pressure drops
    const pressureDrops = this.calculatePressureDrops(
      input.pressures,
      input.initialPressure,
      days.length
    );

    // Calculate normalized rate (q/Δp)
    const qDd = this.calculateNormalizedRate(
      input.rates,
      pressureDrops
    );

    // Calculate rate integral
    const qDdi = this.calculateRateIntegral(
      materialBalanceTime,
      qDd
    );

    // Calculate rate integral derivative
    const qDdid = this.calculateRateIntegralDerivative(
      materialBalanceTime,
      qDdi
    );

    // Clean up invalid points (NaN, Inf, negatives)
    const cleaned = this.cleanData({
      materialBalanceTime,
      qDd,
      qDdi,
      qDdid
    });

    return {
      teDimensionless: [], // Will calculate after match parameters are provided
      materialBalanceTime: cleaned.materialBalanceTime,
      qDd: cleaned.qDd,
      qDdi: cleaned.qDdi,
      qDdid: cleaned.qDdid,
      pressureDrops,
      times: days,
      rates: input.rates
    };
  }

  /**
   * Material balance time: te = Np / q
   * This is the equivalent time for constant-rate production
   */
  private calculateMaterialBalanceTime(
    rates: number[],
    cumulative: number[]
  ): number[] {
    const te: number[] = new Array(rates.length);

    for (let i = 0; i < rates.length; i++) {
      if (rates[i] > 0) {
        te[i] = cumulative[i] / rates[i];
      } else {
        te[i] = i > 0 ? te[i - 1] : 0.001; // Avoid division by zero
      }
    }

    return te;
  }

  /**
   * Calculate pressure drops
   * If pressures not available, use average drawdown estimate
   */
  private calculatePressureDrops(
    pressures: number[] | undefined,
    initialPressure: number,
    dataLength: number
  ): number[] {
    if (pressures && pressures.length === dataLength) {
      // Use actual flowing pressures
      return pressures.map(p => {
        const dp = initialPressure - p;
        return dp > 0 ? dp : 100; // Minimum 100 psi drawdown
      });
    } else {
      // Estimate: assume 70% depletion over dataset
      // This is crude but acceptable for diagnostic plots
      const avgDrawdown = initialPressure * 0.35; // 35% average
      return new Array(dataLength).fill(avgDrawdown);
    }
  }

  /**
   * Normalized rate: q/Δp
   * Units: STB/day/psi or Mscf/day/psi
   */
  private calculateNormalizedRate(
    rates: number[],
    pressureDrops: number[]
  ): number[] {
    return rates.map((q, i) => q / pressureDrops[i]);
  }

  /**
   * Rate integral: (1/te) * ∫(q/Δp) dt
   * This smooths the normalized rate and reduces noise
   */
  private calculateRateIntegral(
    materialBalanceTime: number[],
    qDd: number[]
  ): number[] {
    // Integrate q/Δp with respect to material balance time
    const integral = trapezoidalIntegrate(materialBalanceTime, qDd);

    // Divide by material balance time
    const qDdi = integral.map((intVal, i) => {
      const te = materialBalanceTime[i];
      return te > 0 ? intVal / te : 0;
    });

    return qDdi;
  }

  /**
   * Rate integral derivative: d(qDdi)/d(ln(te))
   * Used for flow regime identification
   */
  private calculateRateIntegralDerivative(
    materialBalanceTime: number[],
    qDdi: number[]
  ): number[] {
    // Smooth qDdi first to reduce noise in derivative
    const smoothedQDdi = movingAverage(qDdi, 5);

    // Calculate logarithmic derivative
    return logarithmicDerivative(materialBalanceTime, smoothedQDdi);
  }

  /**
   * Clean data by removing invalid points
   * Maintains parallel array correspondence
   */
  private cleanData(data: {
    materialBalanceTime: number[];
    qDd: number[];
    qDdi: number[];
    qDdid: number[];
  }): {
    materialBalanceTime: number[];
    qDd: number[];
    qDdi: number[];
    qDdid: number[];
  } {
    const valid: number[] = [];

    // Find valid indices (all arrays must be valid at same index)
    for (let i = 0; i < data.materialBalanceTime.length; i++) {
      if (
        isFinite(data.materialBalanceTime[i]) &&
        isFinite(data.qDd[i]) &&
        isFinite(data.qDdi[i]) &&
        isFinite(data.qDdid[i]) &&
        data.materialBalanceTime[i] > 0 &&
        data.qDd[i] > 0 &&
        data.qDdi[i] > 0 &&
        data.qDdid[i] > 0
      ) {
        valid.push(i);
      }
    }

    // Return cleaned arrays
    return {
      materialBalanceTime: valid.map(i => data.materialBalanceTime[i]),
      qDd: valid.map(i => data.qDd[i]),
      qDdi: valid.map(i => data.qDdi[i]),
      qDdid: valid.map(i => data.qDdid[i])
    };
  }

  /**
   * Identify flow regimes from log-log slope
   * Phase 1: Simple slope-based identification
   */
  public identifyFlowRegimes(
    materialBalanceTime: number[],
    qDdid: number[]
  ): FlowRegimeSegment[] {
    const regimes: FlowRegimeSegment[] = [];

    // Calculate log-log slope at each point
    const slopes = this.calculateLogLogSlope(materialBalanceTime, qDdid);

    // Simple regime classification based on derivative slope
    // Infinite-acting (transient): slope ~ -0.5 (linear flow) or 0 (radial)
    // Boundary-dominated: slope ~ -1
    // Depletion: slope steeper than -1

    let currentRegime: 'infinite-acting' | 'transition' | 'boundary-dominated' | 'depletion' = 'infinite-acting';
    let startIndex = 0;

    for (let i = 1; i < slopes.length; i++) {
      const slope = slopes[i];
      let newRegime: 'infinite-acting' | 'transition' | 'boundary-dominated' | 'depletion';

      if (slope > -0.3) {
        newRegime = 'infinite-acting';
      } else if (slope >= -0.7) {
        newRegime = 'transition';
      } else if (slope >= -1.3) {
        newRegime = 'boundary-dominated';
      } else {
        newRegime = 'depletion';
      }

      // If regime changed, save previous segment
      if (newRegime !== currentRegime) {
        regimes.push({
          regime: currentRegime,
          startIndex,
          endIndex: i - 1,
          diagnosticSlope: this.averageSlope(slopes, startIndex, i - 1),
          confidence: 'medium'
        });
        currentRegime = newRegime;
        startIndex = i;
      }
    }

    // Add final segment
    regimes.push({
      regime: currentRegime,
      startIndex,
      endIndex: slopes.length - 1,
      diagnosticSlope: this.averageSlope(slopes, startIndex, slopes.length - 1),
      confidence: 'medium'
    });

    return regimes;
  }

  /**
   * Calculate log-log slope: d(log y) / d(log x)
   */
  private calculateLogLogSlope(x: number[], y: number[]): number[] {
    const logX = x.map(v => Math.log10(v));
    const logY = y.map(v => Math.log10(v));

    const n = logX.length;
    const slopes: number[] = new Array(n);

    slopes[0] = (logY[1] - logY[0]) / (logX[1] - logX[0]);

    for (let i = 1; i < n - 1; i++) {
      slopes[i] = (logY[i + 1] - logY[i - 1]) / (logX[i + 1] - logX[i - 1]);
    }

    slopes[n - 1] = (logY[n - 1] - logY[n - 2]) / (logX[n - 1] - logX[n - 2]);

    return slopes;
  }

  /**
   * Average slope over a range
   */
  private averageSlope(slopes: number[], start: number, end: number): number {
    let sum = 0;
    let count = 0;
    for (let i = start; i <= end; i++) {
      if (isFinite(slopes[i])) {
        sum += slopes[i];
        count++;
      }
    }
    return count > 0 ? sum / count : 0;
  }
}