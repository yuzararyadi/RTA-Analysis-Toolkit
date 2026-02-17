// import { Component } from '@angular/core';

// @Component({
//   selector: 'app-root',
//   template: `<h1>RTA Toolkit</h1>`
// })
// export class AppComponent { }

import { Component, OnInit } from '@angular/core';
import { PlotlyChartComponent } from './shared/components/plotly-chart/plotly-chart.component';
import { ChartConfig, RTA_CHART_PRESETS  } from './models/chart-config.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [PlotlyChartComponent],
  template: `
    <div style="padding: 20px;">
      <h2>RTA Toolkit — Plotly Log-Log Test</h2>
      <app-plotly-chart [config]="testChartConfig" />
    </div>
  `
})
export class AppComponent implements OnInit {

  testChartConfig!: ChartConfig;

  ngOnInit(): void {
    this.testChartConfig = this.buildTestChart();
  }

  private buildTestChart(): ChartConfig {
    // Generate synthetic log-log data (simulating Blasingame normalized rate)
    const t: number[] = [];
    const qNorm: number[] = [];
    const qNormI: number[] = [];     // rate integral
    const qNormId: number[] = [];    // rate integral derivative

    for (let i = 1; i <= 100; i++) {
      const time = Math.pow(10, i * 0.04); // log-spaced time
      t.push(time);
      qNorm.push(500 / Math.pow(time, 0.5));         // transient: slope -0.5
      qNormI.push(600 / Math.pow(time, 0.5));        // integral above rate
      qNormId.push(300 / Math.pow(time, 0.5));       // derivative below rate
    }

    return {
      title: 'Blasingame Log-Log Test (Synthetic Data)',
      ...RTA_CHART_PRESETS.LOG_LOG,
      xAxis: {
        ...RTA_CHART_PRESETS.LOG_LOG.xAxis,
        title: 'Material Balance Time'
      },
      yAxis: {
        ...RTA_CHART_PRESETS.LOG_LOG.yAxis,
        title: 'Normalized Rate & Derivatives'
      },
      series: [
        {
          name: 'q/Δp (Normalized Rate)',
          x: t,
          y: qNorm,
          color: '#1565C0',
          mode: 'lines+markers',
          markerSize: 3
        },
        {
          name: '(q/Δp)i (Rate Integral)',
          x: t,
          y: qNormI,
          color: '#2E7D32',
          mode: 'lines',
          dash: 'dash'
        },
        {
          name: '(q/Δp)id (Rate Integral Derivative)',
          x: t,
          y: qNormId,
          color: '#C62828',
          mode: 'lines',
          dash: 'dot'
        }
      ],
      showLegend: true,
      height: 500
    };
  }
}