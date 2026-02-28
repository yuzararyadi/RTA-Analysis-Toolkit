import { Component, Input, ChangeDetectionStrategy, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSliderModule } from '@angular/material/slider';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { BlasingameOutput } from '../../../models/blasingame.model';
import { PlotlyChartComponent } from '../../../shared/components/plotly-chart/plotly-chart.component';
import { ChartConfig, RTA_CHART_PRESETS } from '../../../models/chart-config.model';
import { TypeCurveMatchingService } from '../../../services/type-curve-matching.service';
import { signal, effect } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';

/**
 * Type Curve Matcher Component
 * Allows visual matching of calculated Blasingame curves to theoretical curves
 * Users adjust parameters (kh, skin, drainage area) to achieve best fit
 */
@Component({
  selector: 'app-type-curve-matcher',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatSliderModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    PlotlyChartComponent
  ],
  template: `
    <div class="matcher-container">
      <div class="controls-panel">
        <h3>Type Curve Matching</h3>
        <p class="instruction">Adjust parameters to match theoretical type curves with calculated data</p>

        <div class="parameter-section">
          <div class="slider-group">
            <label>
              Permeability × Thickness (kh)
              <span class="value">{{ khValue() }} md-ft</span>
            </label>
            <input
              type="range"
              class="full-slider"
              min="10"
              max="1000"
              step="10"
              [(ngModel)]="khValueNum"
              (change)="onKhChange()"
            />
          </div>

          <div class="slider-group">
            <label>
              Skin Factor
              <span class="value">{{ skinValue() | number: '1.2-2' }}</span>
            </label>
            <input
              type="range"
              class="full-slider"
              min="-5"
              max="10"
              step="0.5"
              [(ngModel)]="skinValueNum"
              (change)="onSkinChange()"
            />
          </div>

          <div class="slider-group">
            <label>
              Drainage Area
              <span class="value">{{ areaValue() }} acres</span>
            </label>
            <input
              type="range"
              class="full-slider"
              min="10"
              max="1000"
              step="10"
              [(ngModel)]="areaValueNum"
              (change)="onAreaChange()"
            />
          </div>
        </div>

        <div class="visibility-section">
          <h4>Show Series</h4>
          <label>
            <input type="checkbox" [checked]="showCalculated()" (change)="showCalculated.set(!showCalculated())" />
            Calculated (solid)
          </label>
          <label>
            <input type="checkbox" [checked]="showTheoretical()" (change)="showTheoretical.set(!showTheoretical())" />
            Theoretical (dashed)
          </label>
        </div>

        <mat-card class="results-card">
          <mat-card-content>
            <h4>Match Quality</h4>
            <div class="metric">
              <span>R² Value:</span>
              @if (matchQuality$ | async; as quality) {
                <strong [ngClass]="getRSquaredClass()">{{ quality.rSquared.toFixed(4) }}</strong>
              } @else {
                <strong>—</strong>
              }
            </div>
            <div class="metric">
              <span>RMSE:</span>
              @if (matchQuality$ | async; as quality) {
                <strong>{{ quality.rmse.toFixed(6) }}</strong>
              } @else {
                <strong>—</strong>
              }
            </div>
            <div class="metric-description">
              <span>{{ getMatchDescription() }}</span>
            </div>
            <button mat-raised-button color="accent" (click)="exportResults()" [disabled]="!(matchQuality$ | async)">
              <mat-icon>download</mat-icon>
              Export CSV
            </button>
          </mat-card-content>
        </mat-card>
      </div>

      <div class="chart-panel">
        @if (chartConfig$ | async; as config) {
          <app-plotly-chart [config]="config" />
        } @else {
          <div class="no-data">Select a well and click Analyze to begin type curve matching</div>
        }
      </div>
    </div>
  `,
  styles: [`
    .matcher-container {
      display: grid;
      grid-template-columns: 300px 1fr;
      gap: 20px;
      height: 100%;
    }

    .controls-panel {
      background: #f5f5f5;
      border-radius: 4px;
      padding: 15px;
      overflow-y: auto;
      max-height: 600px;
    }

    .controls-panel h3 {
      margin: 0 0 10px 0;
      font-size: 16px;
      font-weight: 500;
    }

    .instruction {
      font-size: 12px;
      color: #666;
      margin: 0 0 15px 0;
      line-height: 1.4;
    }

    .parameter-section {
      margin-bottom: 20px;
    }

    .slider-group {
      margin-bottom: 15px;
    }

    .slider-group label {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      font-weight: 500;
      margin-bottom: 8px;
    }

    .value {
      color: #1565C0;
      font-weight: bold;
    }

    .full-slider {
      width: 100%;
    }

    .visibility-section {
      margin: 20px 0;
      padding: 15px;
      background: white;
      border-radius: 4px;
    }

    .visibility-section h4 {
      margin: 0 0 10px 0;
      font-size: 12px;
      font-weight: 500;
    }

    .visibility-section label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      margin-bottom: 8px;
      cursor: pointer;
    }

    .results-card {
      margin-top: 15px;
    }

    .results-card mat-card-content {
      padding: 12px;
    }

    .results-card h4 {
      margin: 0 0 10px 0;
      font-size: 13px;
      font-weight: 500;
    }

    .metric {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      margin-bottom: 8px;
      padding: 4px 0;
    }

    .metric strong {
      color: #1565C0;
      font-weight: bold;
    }

    .metric-description {
      font-size: 11px;
      color: #666;
      margin: 10px 0;
      padding: 8px;
      background: #e3f2fd;
      border-radius: 3px;
      line-height: 1.3;
    }

    button {
      width: 100%;
      margin-top: 10px;
      font-size: 12px;
    }

    .chart-panel {
      min-height: 500px;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      background: white;
    }

    .no-data {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 500px;
      color: #999;
      font-size: 14px;
      text-align: center;
    }

    @media (max-width: 1200px) {
      .matcher-container {
        grid-template-columns: 1fr;
      }

      .controls-panel {
        max-height: none;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TypeCurveMatcherComponent implements OnInit, OnDestroy {
  @Input() blasingameOutput: BlasingameOutput | null = null;

  private typeCurveService = inject(TypeCurveMatchingService);

  // Parameter signals
  khValue = signal(100);
  skinValue = signal(0);
  areaValue = signal(100);

  // HTML input bindings for sliders
  khValueNum: any = 100;
  skinValueNum: any = 0;
  areaValueNum: any = 100;

  // Series visibility
  showCalculated = signal(true);
  showTheoretical = signal(true);

  // Signals for results
  matchQuality$ = toObservable(signal({ rSquared: 0, rmse: 0, mae: 0 }));
  chartConfig$ = toObservable(signal<ChartConfig | null>(null));

  private matchQualitySignal = signal({ rSquared: 0, rmse: 0, mae: 0 });
  private chartConfigSignal = signal<ChartConfig | null>(null);


  // Angular v21+ requires effect() to be called in the injection context (field initializer)
  private _autoUpdateEffect = effect(() => {
    this.khValue();
    this.skinValue();
    this.areaValue();
    this.showCalculated();
    this.showTheoretical();
    this.updateMatching();
  });

  ngOnInit(): void {}

  ngOnDestroy(): void {}

  onKhChange(): void {
    this.khValue.set(Number(this.khValueNum));
  }

  onSkinChange(): void {
    this.skinValue.set(Number(this.skinValueNum));
  }

  onAreaChange(): void {
    this.areaValue.set(Number(this.areaValueNum));
  }

  private updateMatching(): void {
    if (!this.blasingameOutput) {
      return;
    }

    // Generate theoretical curves
    const theoretical = this.typeCurveService.generateTheoreticalCurves(
      this.blasingameOutput,
      {
        kh: this.khValue(),
        skinFactor: this.skinValue(),
        drainageArea: this.areaValue()
      }
    );

    // Calculate match quality
    const matchQuality = this.typeCurveService.calculateMatchQuality(
      this.blasingameOutput.qDd,
      theoretical.qDd
    );
    this.matchQualitySignal.set(matchQuality);
    this.matchQuality$ = toObservable(this.matchQualitySignal);

    // Build combined chart
    this.chartConfigSignal.set(this.buildCombinedChart(theoretical));
    this.chartConfig$ = toObservable(this.chartConfigSignal);
  }

  private buildCombinedChart(theoretical: any): ChartConfig {
    const series = [];

    // Add calculated series (if visible)
    if (this.showCalculated()) {
      series.push(
        {
          name: '[Calculated] q/Δp',
          x: this.blasingameOutput!.materialBalanceTime,
          y: this.blasingameOutput!.qDd,
          mode: 'lines' as const,
          color: '#1565C0',
          lineWidth: 2
        },
        {
          name: '[Calculated] (q/Δp)i',
          x: this.blasingameOutput!.materialBalanceTime,
          y: this.blasingameOutput!.qDdi,
          mode: 'lines' as const,
          color: '#2E7D32',
          dash: 'solid' as const,
          lineWidth: 2
        },
        {
          name: '[Calculated] (q/Δp)id',
          x: this.blasingameOutput!.materialBalanceTime,
          y: this.blasingameOutput!.qDdid,
          mode: 'lines' as const,
          color: '#C62828',
          lineWidth: 2
        }
      );
    }

    // Add theoretical series (if visible)
    if (this.showTheoretical()) {
      series.push(
        {
          name: '[Type Curve] q/Δp',
          x: this.blasingameOutput!.materialBalanceTime,
          y: theoretical.qDd,
          mode: 'lines' as const,
          color: '#1565C0',
          dash: 'dash' as const,
          lineWidth: 2,
          opacity: 0.7
        },
        {
          name: '[Type Curve] (q/Δp)i',
          x: this.blasingameOutput!.materialBalanceTime,
          y: theoretical.qDdi,
          mode: 'lines' as const,
          color: '#2E7D32',
          dash: 'dash' as const,
          lineWidth: 2,
          opacity: 0.7
        },
        {
          name: '[Type Curve] (q/Δp)id',
          x: this.blasingameOutput!.materialBalanceTime,
          y: theoretical.qDdid,
          mode: 'lines' as const,
          color: '#C62828',
          dash: 'dash' as const,
          lineWidth: 2,
          opacity: 0.7
        }
      );
    }

    return {
      title: 'Blasingame Type Curve Matching',
      ...RTA_CHART_PRESETS.LOG_LOG,
      series,
      showLegend: true,
      height: 500
    };
  }

  getRSquaredClass(): string {
    const r2 = this.matchQualitySignal().rSquared;
    if (r2 > 0.95) return 'excellent';
    if (r2 > 0.85) return 'good';
    if (r2 > 0.70) return 'fair';
    return 'poor';
  }

  getMatchDescription(): string {
    const r2 = this.matchQualitySignal().rSquared;
    if (r2 > 0.95) return 'Excellent match! Type curves align well with calculated data.';
    if (r2 > 0.85) return 'Good match. Consider fine-tuning parameters for better fit.';
    if (r2 > 0.70) return 'Fair match. Adjust parameters to improve alignment.';
    return 'Poor match. Adjust kh, skin, or drainage area significantly.';
  }

  exportResults(): void {
    const csv = this.generateCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `blasingame-match-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  private generateCSV(): string {
    const quality = this.matchQualitySignal();
    const headers = [
      'Blasingame Type Curve Matching Results',
      `Generated: ${new Date().toISOString()}`,
      '',
      'Matched Parameters',
      'kh (md-ft),Skin Factor,Drainage Area (acres)',
      `${this.khValue()},${this.skinValue()},${this.areaValue()}`,
      '',
      'Match Quality Metrics',
      'R² Value,RMSE,MAE',
      `${quality.rSquared.toFixed(6)},${quality.rmse.toFixed(6)},${quality.mae.toFixed(6)}`
    ];

    return headers.join('\n');
  }
}
