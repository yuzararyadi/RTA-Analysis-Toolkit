/**
 * Numerical utilities for RTA calculations
 */

import { N } from "@angular/cdk/keycodes";

/**
 * Trapezoidal integration
 * Used for rate integral calculation
 */
export function trapezoidalIntegrate(x:number[], y:number[]): number[] {
    const n = x.length;
    const integral: number[] = new Array();
    integral[0] = 0;

    for (let i = 1; i < n ; i++) {
        const dx = x[i] - x[i-1];
        const avgY = (y[i] + y[i-1]) / 2;
        integral[i] = integral[i - 1] + avgY * dx;

    }

    return integral;
}

/**
 * Numerical derivative using central difference
 * For log-log derivative: d(y)/d(ln(x)) = x * dy/dx
 */
export function logarithmicDerivative(x: number[], y: number[]): number[] {
    const n = x.length;
    const derivative: number[] = new Array(n);

    // Forward differences for first point
    derivative[0] = (y[1] - y[0]) / Math.log(x[1] / x[0]);

    // Central difference for interior points
    for ( let i = 1; i < n - 1 ; i++ ) {
        const dLogX = Math.log(x[i+1] / x[i-1]);
        const dY = y[i + 1] - y[i-1];
        derivative[i] = dY / dLogX;
    }

    // Backward difference for last point
    derivative[n - 1] = (y[n - 1] - y[n-2]) / Math.log( x[n - 1]/x[n - 2]);

    return derivative;
}

/**
 * Smooth data using moving average
 * Useful for noisy production data before derivative calculation
 */
export function movingAverage(data: number[], windowSize: number): number[] {
    const n = data.length;
    const smoothed: number[] = new Array(n);
    const halfWindow = Math.floor(windowSize / 2);

    for (let i = 0; i < n ; i++ ) {
        const start = Math.max(0, i - halfWindow);
        const end = Math.min(n - 1, i + halfWindow);
        let sum = 0;
        let count = 0;

        for (let j = start; j <= end; j++) {
            sum += data[j];
            count++;
        }

        smoothed[i] = sum / count;
    }

    return smoothed;
}

/** 
 * Remove invalid values (NaN, Infinity, negative) from parallel arrays
 * Returns filtered arrays maintaining correspondence
 */
export function removeInvalidPoints(
    x: number[],
    y: number[]
): {x: number[]; y: number[] } {

    const validX: number[] = [];
    const validY: number[] = [];

    for (let i = 0; i < x.length; i++ ) {
        if (
            isFinite(x[i]) &&
            isFinite(y[i]) &&
            x[i] > 0 &&
            y[i] > 0
        ) {
            validX.push(x[i]);
            validY.push(y[i]);
        }
    }

    return { x: validX, y: validY };
}

/**
 * Convert time array to days from start
 */
export function datesToDays(dates: Date[]): number[] {
    if (dates.length === 0) return [];

    const startTime = dates[0].getTime();
    return dates.map(date => (date.getTime() - startTime) / (1000 * 60 * 60 * 24));
}