import { Axis } from "plotly.js-dist-min";

/**
 * Axis scale type for plotly charts
 */
export type AxisScale = 'linear' | 'log';

/**
 * Configuration for a single chart axis
 */
export interface AxisConfig {
    title: string;
    scale: AxisScale;
    min?: number;
    max?: number;
    unit?: string;          // displayed in parentheses after title
    gridLines?: boolean;    // default true
    dtick?: number;         // tick spacing (for log axies: 1 = every decade)
}

/**
 * A single data series for plotting
 */
export interface ChartSeries {
    name: string;
    x: number[] | Date[];
    y: number[];
    mode?: 'lines' | 'markers' | 'lines+markers' ;
    color?: string;
    lineWidth?: number;
    markerSize?: number;
    dash?: 'solid' | 'dash' | 'dot' | 'dashdot';
    visible?: boolean;
    yAxisId?: 'y' | 'y2';       // for dual-axis charts
}

/**
 * Full configuration for a Plotly chart
 */
export interface ChartConfig {
    title?: string;
    xAxis: AxisConfig;
    yAxis: AxisConfig;
    y2Axis?: AxisConfig;        // optional second y-axis
    series: ChartSeries[];
    showLegend?: boolean;
    height?: number;            // px, defaults to 450
    backgroundColor?: string;
}

/**
 * Preset chart configurations for RTA plots
 */
export const RTA_CHART_PRESETS = {
    /**
     * Log-log axes - used for Blasingame type curves
     */
    LOG_LOG: {
        xAxis: { title: 'Material Balance Time', scale: 'log' as AxisScale, unit: 'days', gridLines: true },
        yAxis: { title: 'Normalized Rate', scale: 'log' as AxisScale, unit: 'STB/day/psi', gridLines: true}
    },

    /**
     * Semi-log axes - used for pressure buildup
     */
    SEMI_LOG: {
        xAxis: { title: 'Time', scale: 'log' as AxisScale, unit: 'HOURS', gridLines: true },
        yAxis: { title: 'Pressure', scale: 'linear' as AxisScale, unit: 'psi', gridLines: true}
    },

    /**
     * Linear axes - used for rate vs time diagnostic
     */
    RATE_TIME: {
        xAxis: { title: 'Time', scale: 'linear' as AxisScale, unit: 'days', gridLines: true },
        yAxis: { title: 'Rate', scale: 'linear' as AxisScale, unit: 'STB/day', gridLines: true}
    }

};