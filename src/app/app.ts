import { Component, ChangeDetectionStrategy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { WellSelectorComponent } from './features/well-selector/well-selector.component';
import { BlasingameComponent } from './features/blasingame/blasingame.component';
import { DiagnosticPlotsComponent } from './features/diagnostic-plots/diagnostic-plots.component';
import { DataImportDialogComponent } from './features/data-import/data-import-dialog.component';
import { DataManagementPanelComponent } from './features/data-import/data-management-panel.component';
import { AppStateService } from './services/app-state.service';
import { ImportPersistenceService } from './services/import-persistence.service';
import { ImportedDataset } from './models/import.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    WellSelectorComponent,
    BlasingameComponent,
    DiagnosticPlotsComponent,
    DataManagementPanelComponent,
  ],
  template: `
    <div class="app-container">
      <header class="app-header">
        <h1>RTA Analysis Toolkit</h1>
        <p class="subtitle">Rate Transient Analysis for Petroleum Engineers</p>
      </header>

      <div class="app-content">
        <div class="well-selector-section">
          <div class="selector-toolbar">
            <app-well-selector class="selector-control"></app-well-selector>
            <button mat-flat-button color="primary" (click)="openImportDialog()">
              <mat-icon>upload_file</mat-icon>
              Import Data
            </button>
          </div>

          <app-data-management-panel
            (onClear)="onClearData()"
            (onReplace)="openImportDialog()">
          </app-data-management-panel>
        </div>

        <div class="analysis-section">
          <mat-tab-group class="analysis-tabs" dynamicHeight>
            <mat-tab label="Blasingame Type Curves">
              <ng-template mat-tab-label>
                <span class="tab-icon">📊</span>
                Blasingame Type Curves
              </ng-template>
              <div class="tab-content">
                <app-blasingame></app-blasingame>
              </div>
            </mat-tab>

            <mat-tab label="Diagnostic Plots">
              <ng-template mat-tab-label>
                <span class="tab-icon">📈</span>
                Diagnostic Plots
              </ng-template>
              <div class="tab-content">
                <app-diagnostic-plots></app-diagnostic-plots>
              </div>
            </mat-tab>
          </mat-tab-group>
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
      max-width: 1600px;
      margin: 0 auto;
    }

    .well-selector-section {
      margin-bottom: 20px;
    }

    .selector-toolbar {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .selector-control {
      flex: 1;
      min-width: 200px;
    }

    .analysis-section {
      background: white;
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    .analysis-tabs ::ng-deep {
      .mdc-tab {
        min-width: 200px;
      }

      .mdc-tab__content {
        display: flex;
        align-items: center;
        gap: 8px;
      }
    }

    .tab-icon {
      font-size: 16px;
    }

    .tab-content {
      padding: 20px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {
  private dialog = inject(MatDialog);
  private appState = inject(AppStateService);
  private persistence = inject(ImportPersistenceService);

  ngOnInit(): void {
    if (this.persistence.has()) {
      const saved = this.persistence.load();
      if (saved) {
        this.appState.loadImportedData(saved);
        return;
      }
    }
    // No persisted import — load mock data
    this.appState.initialize();
  }

  openImportDialog(): void {
    const ref = this.dialog.open(DataImportDialogComponent, {
      width: '860px',
      maxHeight: '90vh',
      disableClose: false,
    });

    ref.afterClosed().subscribe((dataset: ImportedDataset | undefined) => {
      if (dataset) {
        this.appState.loadImportedData(dataset);
        this.persistence.save(dataset);
      }
    });
  }

  onClearData(): void {
    this.persistence.clear();
    this.appState.reset();
    this.appState.initialize();
  }
}
