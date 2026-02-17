import {
    Component,
    Input,
    OnChanges,
    OnDestroy,
    AfterViewInit,
    ElementRef,
    ViewChild,
    SimpleChanges,
    ChangeDetectionStrategy,
    NgZone
} from '@angular/core';
import * as Plotly from 'plotly.js-dist-min';
import { ChartConfig, ChartSeries } from '../../../models/chart-config.model';
import { Serializer } from '@angular/compiler';
import { servicesVersion } from 'typescript';
import { min } from 'rxjs';
import { CommonModule } from '@angular/common';

/**
 * Reusable Plotly.js wrapper component
 * Supports log-log, semi-log, and linear axes
 * Used by all RTA anlysis charts
 */
@Component({
  selector: 'app-plotly-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chart-wrapper">
      <div #plotContainer class="plot-container"></div>
      <div *ngIf="!config || config.series.length === 0" class="no-data-message">
        <span>No data to display</span>
      </div>
    </div>
  `,
  styles: [`
    .chart-wrapper {
      position: relative;
      width: 100%;
    }
    .plot-container {
      width: 100%;
    }
    .no-data-message {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #999;
      font-size: 14px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlotlyChartComponent implements AfterViewInit, OnChanges, OnDestroy {
    @ViewChild('plotContainer', { static: true })
    private plotContainer!: ElementRef<HTMLDivElement>;

    @Input() config!: ChartConfig;

    private isInitialized = false;

    constructor(private ngZone: NgZone) {}

    ngAfterViewInit(): void {
        this.isInitialized = true;
        if (this.config) {
            this.renderChart();
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['config'] && this.isInitialized && this.config) {
            this.renderChart();
        }
    }

    ngOnDestroy(): void {
        // Clean up Plotly instance to prevent memory leaks
        const el = this.plotContainer?.nativeElement;
        if (el) {
            Plotly.purge(el);
        }
    }

    /**
     * Main render method - builds Plotly traces and layout from ChartConfig
     */
    private renderChart(): void {
        const el = this.plotContainer.nativeElement;

        // Build Plotly traces from series
        const traces: Partial<Plotly.PlotData>[] = this.config.series.map(series => 
            this.buildTrace(series)
        );

        // Build layout
        const layout = this.buildLayout();

        // Plotly config (UI Options)
        const plotlyConfig: Partial<Plotly.Config> = {
            responsive: true,
            displayModeBar: true,
            modeBarButtonsToRemove: ['select2d', 'lasso2d'],
            displaylogo: false,
            toImageButtonOptions: {
                format: 'png',
                filename: this.config.title || 'rta-chart',
                height: 600,
                width: 900,
                scale: 2        // retina quality export
            }
        };

        // Run outside Angular zone for performance
        this.ngZone.runOutsideAngular(() => {
            Plotly.react( el, traces, layout, plotlyConfig);
        });
    }

    /**
     * Convert ChartSeries to Plotly trace
     */
    private buildTrace(series: ChartSeries): Partial<Plotly.PlotData> {
        return {
            name: series.name,
            x: series.x as any,
            y: series.y,
            type: 'scatter',
            mode: series.mode ?? 'lines+markers',
            visible: series.visible === false ? false : true,
            yaxis: series.yAxisId ?? 'y',
            line: {
                color: series.color,
                width: series.lineWidth ?? 1.5,
                dash: series.dash ?? 'solid'
            },
            marker: {
                color: series.color,
                size: series.markerSize ?? 4
            }
        };
    }

    /**
     * Build Plotly layout from ChartConfig
     * Critical: log axes must use type: 'log' -- Not a transform
     */
    private buildLayout(): Partial<Plotly.Layout> {
        const height = this.config.height ?? 450;

        const layout: Partial<Plotly.Layout> = {
            title: this.config.title
                ? { text: this.config.title, font: { size: 14}}
                : undefined,
            height,
            showlegend: this.config.showLegend ?? true,
            paper_bgcolor: this.config.backgroundColor ?? '#ffffff',
            plot_bgcolor: '#fafafa',
            margin: {l: 70, r: 30, t: this.config.title ? 50 : 20, b:60 },

            // X Axis
            xaxis: {
                title: { text: this.buildAxisTitle(this.config.xAxis)},
                type: this.config.xAxis.scale === 'log' ? 'log' : 'linear',
                showgrid: this.config.xAxis.gridLines ?? true,
                gridcolor: '#e0e0e0',
                linecolor: '#333',
                mirror: true,
                // For log axes: range is in log10 units e.g. [0, 4] = 10^0 to 10^4
                range: this.buildAxisRange(this.config.xAxis),
                dtick: this.config.xAxis.dtick
            },
            // Primary Y Axis
            yaxis: {
                title: { text: this.buildAxisTitle(this.config.yAxis) },
                type: this.config.yAxis.scale === 'log' ? 'log' : 'linear',
                showgrid: this.config.yAxis.gridLines ?? true,
                gridcolor: '#e0e0e0',
                linecolor: '#333',
                mirror: true,
                range: this.buildAxisRange(this.config.yAxis),
                dtick: this.config.yAxis.dtick
            },

            // Legend styling
            legend: {
                bgcolor: 'rgba(255,255,255,0.8)',
                bordercolor: '#ccc',
                borderwidth: 1
            }

        };
        // Optional second Y axis
        if (this.config.y2Axis) {
            (layout as any).yaxis2 = {
                title: { text: this.buildAxisTitle(this.config.y2Axis) },
                type: this.config.y2Axis.scale === 'log' ? 'log' : 'linear',
                overlaying: 'y',
                side: 'right',
                showgrid: false,
                range: this.buildAxisRange(this.config.y2Axis)
            };
        }

        return layout;
    }

    /**
     * Build axis title string with unit
     */
    private buildAxisTitle(axis: {title: string; unit?: string}): string {
        return axis.unit ? `${axis.title} (${axis.unit})` : axis.title;
    }

    /**
     * Build axis range
     * For log axes: convert to log10 values if min/max are provided
     */
    private buildAxisRange(axis: { scale: string; min?: number; max?: number }): number[] | undefined {
        if (axis.min === undefined || axis.max === undefined) {
            return undefined; // Let Plotly auto-range
        }
        if (axis.scale === 'log') {
            return [Math.log10(axis.min), Math.log10(axis.max)];
        }
        return [axis.min, axis.max];
    }

    /**
     * Public method to export chart as PNG
     * Can be called from parent components
     */
    public exportAsPng(filename?: string): void {
        const el = this.plotContainer.nativeElement;
        Plotly.downloadImage(el, {
            format: 'png',
            filename: filename || this.config.title || 'rta-chart',
            height: 600,
            width: 900
        });
    }

    /**
     * Public method to update a single series without full re-render
     * More efficient for live updates
     */
    public updateSeries(seriesIndex: number, x: number[], y: number[]): void {
        const el = this.plotContainer.nativeElement;
        this.ngZone.runOutsideAngular(() => {
            Plotly.restyle(el, { x: [x], y: [y] }, [seriesIndex]);
        });
    }


}