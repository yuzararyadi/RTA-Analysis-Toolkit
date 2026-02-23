import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { AppStateService } from '../../services/app-state.service';
import { BlasingameCalculationService } from '../../services/blasingame-calculation.service';
import { PlotlyChartComponent } from '../../shared/components/plotly-chart/plotly-chart.component';
import { TypeCurveMatcherComponent } from './type-curve-matcher/type-curve-matcher.component';
import { ChartConfig, RTA_CHART_PRESETS } from '../../models/chart-config.model';
import { BlasingameInput, BlasingameOutput } from '../../models/blasingame.model';
import { signal, effect } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { map } from 'rxjs/operators';

/**
 * Blasingame Type Curve Analysis Component
 * Displays normalized rate functions on log-log plot
 */
@Component({
  selector: 'app-blasingame',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatExpansionModule,
    PlotlyChartComponent,
    TypeCurveMatcherComponent
  ],
  template: `
    <div class="blasingame-container">
      <div class="controls">
        <button mat-raised-button color="primary" (click)="onAnalyzeClick()" [disabled]="isLoading$ | async">
          {{ (isLoading$ | async) ? 'Loading...' : 'Analyze' }}
        </button>
        
        <div class="series-toggles">
          <label>
            <input type="checkbox" [checked]="showQNormalized()" (change)="showQNormalized.set(!showQNormalized())" />
            q/Δp (Normalized Rate)
          </label>
          <label>
            <input type="checkbox" [checked]="showQIntegral()" (change)="showQIntegral.set(!showQIntegral())" />
            (q/Δp)i (Rate Integral)
          </label>
          <label>
            <input type="checkbox" [checked]="showQDerivative()" (change)="showQDerivative.set(!showQDerivative())" />
            (q/Δp)id (Rate Integral Derivative)
          </label>
        </div>
      </div>

      <div class="chart-section">
        @if (chartConfig$ | async; as chartConfig) {
          <app-plotly-chart [config]="chartConfig" />
        } @else {
          <div class="placeholder">
            Select a well and click Analyze to view Blasingame type curve analysis
          </div>
        }
      </div>

      @if (errorMessage$ | async; as error) {
        <div class="error-message">{{ error }}</div>
      }

      <!-- Type Curve Matching Section -->
      @if (blasingameOutput(); as output) {
        <mat-expansion-panel class="matcher-panel">
          <mat-expansion-panel-header>
            <mat-panel-title>
              🎯 Type Curve Matching (Manual)
            </mat-panel-title>
            <mat-panel-description>
              Adjust parameters to match theoretical type curves
            </mat-panel-description>
          </mat-expansion-panel-header>
          <app-type-curve-matcher [blasingameOutput]="output" />
        </mat-expansion-panel>
      }
    </div>
  `,
  styles: [`
    .blasingame-container {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .controls {
      display: flex;
      align-items: center;
      gap: 30px;
      padding: 15px;
      background-color: #f5f5f5;
      border-radius: 4px;
    }

    .series-toggles {
      display: flex;
      gap: 20px;
    }

    .series-toggles label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 14px;
    }

    .series-toggles input[type="checkbox"] {
      cursor: pointer;
    }

    .chart-section {
      flex: 1;
      min-height: 500px;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      background: white;
    }

    .placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 500px;
      color: #999;
      font-size: 16px;
    }

    .error-message {
      padding: 15px;
      background-color: #ffebee;
      color: #c62828;
      border-radius: 4px;
      border: 1px solid #ef5350;
    }

    .matcher-panel {
      margin-top: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    mat-panel-title {
      font-weight: 500;
    }

    mat-panel-description {
      font-size: 12px;
      color: #999;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BlasingameComponent implements OnInit, OnDestroy {
  private appState = inject(AppStateService);
  private blasingameCalc = inject(BlasingameCalculationService);
  private destroy$ = new Subject<void>();

  // Series visibility toggles
  showQNormalized = signal(true);
  showQIntegral = signal(true);
  showQDerivative = signal(true);

  // Calculation result storage
  blasingameOutput = signal<BlasingameOutput | null>(null);
  chartConfigSignal = signal<ChartConfig | null>(null);

  // Observables from app state
  selectedWell$ = this.appState.selectedWell$;
  wellProperties$ = this.appState.wellProperties$;
  productionData$ = this.appState.productionData$;
  isLoading$ = this.appState.loadingState$.pipe(
    map(state => state.productionData.isLoading),
    takeUntil(this.destroy$)
  );
  errorMessage$ = this.appState.loadingState$.pipe(
    map(state => state.productionData.error || null),
    takeUntil(this.destroy$)
  );

  // Convert signal to observable for async pipe
  chartConfig$ = toObservable(this.chartConfigSignal);

  // Track visibility changes and update chart
  private visibilityChangeUnsubscribe = effect(() => {
    this.showQNormalized();
    this.showQIntegral();
    this.showQDerivative();
    this.updateChartConfig();
  });

  ngOnInit(): void {
    // Initialize app state on component creation
    this.appState.initialize();

    // Subscribe to production data and well properties changes
    combineLatest([this.productionData$, this.wellProperties$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([productionData, wellProperties]) => {
        this.updateBlasigamCalculation(productionData, wellProperties);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onAnalyzeClick(): void {
    const selectedWell = this.appState.getSelectedWell();
    if (!selectedWell) {
      console.warn('No well selected');
      return;
    }

    // Trigger Phase 2 loading (production data)
    this.appState.loadProductionData();
  }

  private updateBlasigamCalculation(productionData: any, wellProperties: any): void {
    if (!productionData || !wellProperties) {
      return;
    }

    // Prepare Blasingame input
    const blasingameInput: BlasingameInput = {
      dates: productionData.dates,
      rates: productionData.oilRates,
      cumulativeProduction: productionData.cumulativeOil,
      pressures: productionData.pressure,
      initialPressure: wellProperties.initialPressure || 5000,
      wellboreRadius: wellProperties.wellboreRadius || 0.3,
      netPayThickness: wellProperties.netPayThickness || 50,
      porosity: wellProperties.porosity || 0.15,
      totalCompressibility: 1e-5,
      viscosity: wellProperties.viscosity || 0.5,
      formationVolumeFactor: wellProperties.formationVolumeFactor || 1.0
    };

    // Calculate Blasingame functions
    const blasingameOutput = this.blasingameCalc.calculate(blasingameInput);
    this.blasingameOutput.set(blasingameOutput);
    this.updateChartConfig();
  }

  private updateChartConfig(): void {
    const blasingameOutput = this.blasingameOutput();

    if (!blasingameOutput) {
      this.chartConfigSignal.set(null);
      return;
    }

    // Build chart series based on visibility toggles
    const series = [];

    if (this.showQNormalized()) {
      series.push({
        name: 'q/Δp (Normalized Rate)',
        x: blasingameOutput.materialBalanceTime,
        y: blasingameOutput.qDd,
        mode: 'lines+markers' as const,
        color: '#1565C0',
        markerSize: 3,
        lineWidth: 2
      });
    }

    if (this.showQIntegral()) {
      series.push({
        name: '(q/Δp)i (Rate Integral)',
        x: blasingameOutput.materialBalanceTime,
        y: blasingameOutput.qDdi,
        mode: 'lines' as const,
        color: '#2E7D32',
        dash: 'dash' as const,
        lineWidth: 2
      });
    }

    if (this.showQDerivative()) {
      series.push({
        name: '(q/Δp)id (Rate Integral Derivative)',
        x: blasingameOutput.materialBalanceTime,
        y: blasingameOutput.qDdid,
        mode: 'lines' as const,
        color: '#C62828',
        dash: 'dot' as const,
        lineWidth: 2
      });
    }

    const config: ChartConfig = {
      title: 'Blasingame Type Curve Analysis',
      ...RTA_CHART_PRESETS.LOG_LOG,
      series,
      showLegend: true,
      height: 500
    };

    this.chartConfigSignal.set(config);
  }
}
