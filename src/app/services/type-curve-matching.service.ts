import { Injectable } from '@angular/core';
import { BlasingameOutput } from '../models/blasingame.model';

/**
 * Service for generating theoretical Blasingame type curves
 * and calculating match quality metrics
 */
@Injectable({
  providedIn: 'root'
})
export class TypeCurveMatchingService {
  /**
   * Generate theoretical type curves based on match parameters
   * Uses Blasingame dimensionless analysis
   */
  public generateTheoreticalCurves(
    blasingameData: BlasingameOutput,
    matchParams: {
      kh: number;           // Permeability-thickness (md-ft)
      skinFactor: number;   // Skin factor (dimensionless)
      drainageArea: number; // Drainage area (acres)
    }
  ): TheoreticalCurves {
    // Calculate dimensionless parameters
    const dimensionalTime = this.calculateDimensionalTime(
      blasingameData.materialBalanceTime,
      matchParams.kh,
      matchParams.drainageArea
    );

    // Generate theoretical normalized rate using Blasingame solution
    // For transient flow: qDd = f(tD, s) where s is skin factor
    const theoreticalQNorm = this.calculateTheoreticalNormalizedRate(
      dimensionalTime,
      matchParams.skinFactor,
      blasingameData.materialBalanceTime.length
    );

    // Calculate theoretical integrals
    const theoreticalQIntegral = this.calculateTheoreticalIntegral(
      dimensionalTime,
      theoreticalQNorm
    );

    const theoreticalQDerivative = this.calculateTheoreticalDerivative(
      dimensionalTime,
      theoreticalQIntegral
    );

    return {
      teDimensionless: dimensionalTime,
      qDd: theoreticalQNorm,
      qDdi: theoreticalQIntegral,
      qDdid: theoreticalQDerivative
    };
  }

  /**
   * Calculate dimensionless time (tD)
   * tD = 0.0002637 * k * t / (φ * μ * ct * rw^2)
   * Simplified using standard constants
   */
  private calculateDimensionalTime(
    materalBalanceTime: number[],
    kh: number,
    drainageArea: number
  ): number[] {
    // Conversion factor (typical for field units)
    const conversionFactor = 0.0002637;
    // Average permeability from kh
    const k = kh / 50; // Assume 50 ft thickness
    
    return materalBalanceTime.map(t => conversionFactor * kh * t / drainageArea);
  }

  /**
   * Theoretical normalized rate using Blasingame solution
   * Approx: qDd = 1 / (tD + exp(s)) for transient with skin
   */
  private calculateTheoreticalNormalizedRate(
    tD: number[],
    skinFactor: number,
    dataPoints: number
  ): number[] {
    const skinEffect = Math.exp(Math.min(skinFactor, 5)); // Cap skin for numerical stability

    return tD.map((time, index) => {
      if (time <= 0) return 0;
      // Blasingame approximation with skin effect
      // During transient: qDd decreases with time
      const baseResponse = 1 / (Math.sqrt(time) + skinEffect * 0.1);
      return Math.max(baseResponse, 0.01); // Floor to prevent negatives
    });
  }

  /**
   * Calculate integral of normalized rate
   */
  private calculateTheoreticalIntegral(tD: number[], qDd: number[]): number[] {
    const integral = new Array(qDd.length).fill(0);
    
    for (let i = 1; i < qDd.length; i++) {
      const dt = tD[i] - tD[i - 1];
      const avgRate = (qDd[i] + qDd[i - 1]) / 2;
      integral[i] = integral[i - 1] + avgRate * dt;
    }
    
    return integral;
  }

  /**
   * Calculate derivative (slope) of integrated rate
   * Using central difference method
   */
  private calculateTheoreticalDerivative(tD: number[], qIntegral: number[]): number[] {
    const derivative = new Array(qIntegral.length).fill(0);
    
    for (let i = 1; i < qIntegral.length - 1; i++) {
      const dt = tD[i + 1] - tD[i - 1];
      if (dt > 0) {
        derivative[i] = (qIntegral[i + 1] - qIntegral[i - 1]) / dt;
      }
    }
    
    // Handle endpoints
    if (qIntegral.length > 1) {
      derivative[0] = derivative[1];
      derivative[qIntegral.length - 1] = derivative[qIntegral.length - 2];
    }
    
    return derivative;
  }

  /**
   * Calculate match quality metrics (R-squared, RMSE)
   */
  public calculateMatchQuality(
    calculated: number[],
    theoretical: number[]
  ): MatchQuality {
    if (calculated.length === 0 || theoretical.length === 0) {
      return { rSquared: 0, rmse: 0, mae: 0 };
    }

    // Filter out NaN and Inf values
    const validPairs = calculated
      .map((c, i) => ({ c, t: theoretical[i] }))
      .filter(pair => isFinite(pair.c) && isFinite(pair.t) && pair.c > 0 && pair.t > 0);

    if (validPairs.length === 0) {
      return { rSquared: 0, rmse: 0, mae: 0 };
    }

    // Calculate mean of calculated values
    const meanCalculated = validPairs.reduce((sum, p) => sum + p.c, 0) / validPairs.length;

    // Sum of squares
    let ssRes = 0; // Residual sum of squares
    let ssTot = 0; // Total sum of squares
    let sumAbsError = 0;

    validPairs.forEach(pair => {
      const residual = pair.c - pair.t;
      const y = pair.c - meanCalculated;
      ssRes += residual * residual;
      ssTot += y * y;
      sumAbsError += Math.abs(residual);
    });

    const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;
    const rmse = Math.sqrt(ssRes / validPairs.length);
    const mae = sumAbsError / validPairs.length;

    return {
      rSquared: Math.max(0, Math.min(1, rSquared)), // Clamp to [0, 1]
      rmse,
      mae
    };
  }
}

/**
 * Theoretical type curves output
 */
export interface TheoreticalCurves {
  teDimensionless: number[];
  qDd: number[];
  qDdi: number[];
  qDdid: number[];
}

/**
 * Match quality metrics
 */
export interface MatchQuality {
  rSquared: number;  // R² value (0-1, higher is better)
  rmse: number;      // Root mean square error
  mae: number;       // Mean absolute error
}
