import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WellSelectorComponent } from './features/well-selector/well-selector.component';
import { BlasingameComponent } from './features/blasingame/blasingame.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, WellSelectorComponent, BlasingameComponent],
  template: `
    <div class="app-container">
      <header class="app-header">
        <h1>RTA Analysis Toolkit</h1>
        <p class="subtitle">Rate Transient Analysis for Petroleum Engineers</p>
      </header>

      <div class="app-content">
        <div class="well-selector-section">
          <app-well-selector></app-well-selector>
        </div>

        <div class="analysis-section">
          <app-blasingame></app-blasingame>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .app-container {
      font-family: 'Roboto', sans-serif;
      background-color: #fafafa;
      min-height: 100vh;
    }

    .app-header {
      background-color: #1565C0;
      color: white;
      padding: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .app-header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 500;
    }

    .subtitle {
      margin: 8px 0 0 0;
      font-size: 14px;
      opacity: 0.9;
    }

    .app-content {
      padding: 20px;
    }

    .well-selector-section {
      margin-bottom: 20px;
    }

    .analysis-section {
      background: white;
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
}