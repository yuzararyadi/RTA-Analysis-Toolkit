import { Component, inject, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { AppStateService } from '../../services/app-state.service';

@Component({
  selector: 'app-data-management-panel',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatDividerModule, DatePipe],
  template: `
    @if (appState.importSummary$ | async; as summary) {
      <mat-card class="panel-card">
        <mat-card-header>
          <mat-icon mat-card-avatar class="well-icon">oil_barrel</mat-icon>
          <mat-card-title>{{ summary.wellName }}</mat-card-title>
          <mat-card-subtitle>{{ summary.sourceFileName }}</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <div class="stats-row">
            <div class="stat">
              <span class="stat-value">{{ summary.rowCount | number }}</span>
              <span class="stat-label">records</span>
            </div>
            <mat-divider vertical></mat-divider>
            <div class="stat">
              <span class="stat-value">{{ summary.dateRange.start | date:'MMM yyyy' }}</span>
              <span class="stat-label">start</span>
            </div>
            <mat-divider vertical></mat-divider>
            <div class="stat">
              <span class="stat-value">{{ summary.dateRange.end | date:'MMM yyyy' }}</span>
              <span class="stat-label">end</span>
            </div>
            <mat-divider vertical></mat-divider>
            <div class="stat">
              <span class="stat-value">{{ summary.importedAt | date:'dd MMM yyyy' }}</span>
              <span class="stat-label">imported</span>
            </div>
          </div>
        </mat-card-content>

        <mat-card-actions align="end">
          <button mat-button (click)="onReplace.emit()">
            <mat-icon>upload_file</mat-icon>
            Replace
          </button>
          <button mat-button color="warn" (click)="onClear.emit()">
            <mat-icon>delete_outline</mat-icon>
            Clear
          </button>
        </mat-card-actions>
      </mat-card>
    }
  `,
  styles: [`
    .panel-card {
      background: #e8f5e9;
      border: 1px solid #a5d6a7;
      margin-top: 12px;
    }
    .well-icon {
      color: #2e7d32;
      background: none;
    }
    .stats-row {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 8px 0 0;
      flex-wrap: wrap;
    }
    .stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 70px;
    }
    .stat-value {
      font-size: 15px;
      font-weight: 600;
      color: #1b5e20;
    }
    .stat-label {
      font-size: 11px;
      color: #555;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    mat-divider[vertical] {
      height: 36px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataManagementPanelComponent {
  protected appState = inject(AppStateService);

  @Output() onClear = new EventEmitter<void>();
  @Output() onReplace = new EventEmitter<void>();
}
