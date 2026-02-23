import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService } from '../../services/app-state.service';
import { PlotlyChartComponent } from '../../shared/components/plotly-chart/plotly-chart.component';
import { ChartConfig } from '../../models/chart-config.model';
import { signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * Diagnostic Plots Component
 * Displays Rate vs Time and Rate vs Cumulative Production plots
 * These help identify well behavior and flow regimes
 */
@Component({
  selector: 'app-diagnostic-plots',
  standalone: true,
  imports: [CommonModule, PlotlyChartComponent],
  template: `
    <div class="diagnostic-container">
      <div class="plots-grid">
        <div class="plot-card">
          <h3>Rate vs Time</h3>
          @if (rateVsTimeConfig$ | async; as config) {
            <app-plotly-chart [config]="config" />
          } @else {
            <div class="no-data">Load production data to view plots</div>
          }
        </div>

        <div class="plot-card">
          <h3>Rate vs Cumulative Production</h3>
          @if (rateVsCumulativeConfig$ | async; as config) {
            <app-plotly-chart [config]="config" />
          } @else {
            <div class="no-data">Load production data to view plots</div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .diagnostic-container {
      padding: 20px;
    }

    .plots-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    .plot-card {
      background: #f9f9f9;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      padding: 15px;
      min-height: 450px;
    }

    .plot-card h3 {
      margin: 0 0 15px 0;
      font-size: 14px;
      font-weight: 500;
      color: #424242;
    }

    .no-data {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 400px;
      color: #999;
      font-size: 14px;
      text-align: center;
    }

    @media (max-width: 1200px) {
      .plots-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DiagnosticPlotsComponent implements OnInit, OnDestroy {
  private appState = inject(AppStateService);
  private destroy$ = new Subject<void>();

  // Signals for chart configs
  rateVsTimeConfigSignal = signal<ChartConfig | null>(null);
  rateVsCumulativeConfigSignal = signal<ChartConfig | null>(null);

  // Convert signals to observables for async pipe
  rateVsTimeConfig$ = toObservable(this.rateVsTimeConfigSignal);
  rateVsCumulativeConfig$ = toObservable(this.rateVsCumulativeConfigSignal);

  ngOnInit(): void {
    // Subscribe to production data changes and rebuild charts
    this.appState.productionData$
      .pipe(takeUntil(this.destroy$))
      .subscribe(productionData => {
        if (!productionData) {
          this.rateVsTimeConfigSignal.set(null);
          this.rateVsCumulativeConfigSignal.set(null);
          return;
        }

        this.buildCharts(productionData);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildCharts(productionData: any): void {
    this.rateVsTimeConfigSignal.set(this.buildRateVsTimeChart(productionData));
    this.rateVsCumulativeConfigSignal.set(this.buildRateVsCumulativeChart(productionData));
  }

  private buildRateVsTimeChart(productionData: any): ChartConfig {
    // Convert dates to day numbers for x-axis
    const startDate = new Date(productionData.dates[0]);
    const daysFromStart = productionData.dates.map((date: Date) => {
      const d = new Date(date);
      const timeDiff = d.getTime() - startDate.getTime();
      return timeDiff / (1000 * 60 * 60 * 24); // Convert milliseconds to days
    });

    return {
      title: 'Production Rate vs Time',
      xAxis: {
        title: 'Days Since Start',
        scale: 'linear' as const,
        unit: 'days'
      },
      yAxis: {
        title: 'Oil Rate',
        scale: 'linear' as const,
        unit: 'STB/day',
        gridLines: true
      },
      series: [
        {
          name: 'Oil Rate',
          x: daysFromStart,
          y: productionData.oilRates,
          mode: 'lines' as const,
          color: '#FF6B6B',
          lineWidth: 2,
          visible: true
        },
        {
          name: 'Gas Rate',
          x: daysFromStart,
          y: productionData.gasRates,
          mode: 'lines' as const,
          color: '#4ECDC4',
          lineWidth: 2,
          yAxisId: 'y2' as const,
          visible: true
        }
      ],
      y2Axis: {
        title: 'Gas Rate',
        scale: 'linear' as const,
        unit: 'Mscf/day',
        gridLines: false
      },
      showLegend: true,
      height: 400
    };
  }

  private buildRateVsCumulativeChart(productionData: any): ChartConfig {
    return {
      title: 'Production Rate vs Cumulative Production',
      xAxis: {
        title: 'Cumulative Production',
        scale: 'linear' as const,
        unit: 'STB'
      },
      yAxis: {
        title: 'Oil Rate',
        scale: 'linear' as const,
        unit: 'STB/day',
        gridLines: true
      },
      series: [
        {
          name: 'Oil Rate vs Cumulative Oil',
          x: productionData.cumulativeOil,
          y: productionData.oilRates,
          mode: 'lines' as const,
          color: '#FF6B6B',
          lineWidth: 2,
          visible: true
        },
        {
          name: 'Gas Rate vs Cumulative Gas',
          x: productionData.cumulativeGas,
          y: productionData.gasRates,
          mode: 'lines' as const,
          color: '#4ECDC4',
          lineWidth: 2,
          yAxisId: 'y2' as const,
          visible: true
        }
      ],
      y2Axis: {
        title: 'Gas Rate',
        scale: 'linear' as const,
        unit: 'Mscf/day',
        gridLines: false
      },
      showLegend: true,
      height: 400
    };
  }
}
