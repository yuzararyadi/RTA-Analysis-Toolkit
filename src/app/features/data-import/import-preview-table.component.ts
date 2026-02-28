import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { ParsedImportRow, ImportError, ImportWarning } from '../../models/import.model';

@Component({
  selector: 'app-import-preview-table',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatIconModule, MatChipsModule, DatePipe, DecimalPipe],
  template: `
    <!-- Summary chips -->
    <div class="summary-row">
      <span class="record-count">{{ rows.length }} rows total — previewing first {{ previewRows.length }}</span>

      @if (errors.length > 0) {
        <mat-chip-set>
          <mat-chip color="warn" highlighted>
            <mat-icon matChipAvatar>error</mat-icon>
            {{ errors.length }} error{{ errors.length !== 1 ? 's' : '' }}
          </mat-chip>
        </mat-chip-set>
      }
      @if (warnings.length > 0) {
        <mat-chip-set>
          <mat-chip color="accent" highlighted>
            <mat-icon matChipAvatar>warning</mat-icon>
            {{ warnings.length }} warning{{ warnings.length !== 1 ? 's' : '' }}
          </mat-chip>
        </mat-chip-set>
      }
      @if (errors.length === 0 && warnings.length === 0) {
        <mat-chip-set>
          <mat-chip color="primary" highlighted>
            <mat-icon matChipAvatar>check_circle</mat-icon>
            Valid
          </mat-chip>
        </mat-chip-set>
      }
    </div>

    <!-- Error list -->
    @if (errors.length > 0) {
      <div class="message-list error-list">
        @for (e of errors; track $index) {
          <div class="message-item">
            <mat-icon class="msg-icon error">error_outline</mat-icon>
            <span>Row {{ e.row || 'Header' }} [{{ e.column }}]: {{ e.message }}</span>
          </div>
        }
      </div>
    }

    <!-- Warning list -->
    @if (warnings.length > 0) {
      <div class="message-list warning-list">
        @for (w of warnings; track $index) {
          <div class="message-item">
            <mat-icon class="msg-icon warning">warning_amber</mat-icon>
            <span>Row {{ w.row || 'File' }}: {{ w.message }}</span>
          </div>
        }
      </div>
    }

    <!-- Data table -->
    <div class="table-container">
      <table mat-table [dataSource]="previewRows">

        <ng-container matColumnDef="date">
          <th mat-header-cell *matHeaderCellDef>Date</th>
          <td mat-cell *matCellDef="let row">{{ row.date | date:'yyyy-MM-dd' }}</td>
        </ng-container>

        <ng-container matColumnDef="oilRate">
          <th mat-header-cell *matHeaderCellDef>Oil Rate (STB/d)</th>
          <td mat-cell *matCellDef="let row">
            {{ row.oilRate > 0 ? (row.oilRate | number:'1.0-1') : '—' }}
          </td>
        </ng-container>

        <ng-container matColumnDef="gasRate">
          <th mat-header-cell *matHeaderCellDef>Gas Rate (Mscf/d)</th>
          <td mat-cell *matCellDef="let row">
            {{ row.gasRate > 0 ? (row.gasRate | number:'1.0-1') : '—' }}
          </td>
        </ng-container>

        <ng-container matColumnDef="waterRate">
          <th mat-header-cell *matHeaderCellDef>Water Rate (STB/d)</th>
          <td mat-cell *matCellDef="let row">
            {{ row.waterRate > 0 ? (row.waterRate | number:'1.0-1') : '—' }}
          </td>
        </ng-container>

        <ng-container matColumnDef="pressure">
          <th mat-header-cell *matHeaderCellDef>Pressure (psia)</th>
          <td mat-cell *matCellDef="let row">
            {{ row.pressure !== undefined ? (row.pressure | number:'1.0-1') : '—' }}
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
      </table>
    </div>

    @if (rows.length > maxPreview) {
      <p class="truncation-note">... and {{ rows.length - maxPreview }} more rows not shown</p>
    }
  `,
  styles: [`
    .summary-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }
    .record-count {
      font-size: 13px;
      color: #555;
    }
    .message-list {
      border-radius: 4px;
      padding: 8px 12px;
      margin-bottom: 10px;
    }
    .error-list {
      background: #fff3f3;
      border-left: 4px solid #c62828;
    }
    .warning-list {
      background: #fffde7;
      border-left: 4px solid #f9a825;
    }
    .message-item {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      font-size: 13px;
      padding: 2px 0;
    }
    .msg-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      margin-top: 2px;
    }
    .msg-icon.error { color: #c62828; }
    .msg-icon.warning { color: #f9a825; }
    .table-container {
      overflow-x: auto;
      max-height: 320px;
      overflow-y: auto;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
    }
    table {
      width: 100%;
    }
    th.mat-header-cell {
      font-weight: 600;
      background: #f5f5f5;
      position: sticky;
      top: 0;
      z-index: 1;
    }
    .truncation-note {
      font-size: 12px;
      color: #888;
      text-align: center;
      margin-top: 8px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportPreviewTableComponent {
  @Input() rows: ParsedImportRow[] = [];
  @Input() errors: ImportError[] = [];
  @Input() warnings: ImportWarning[] = [];

  protected readonly maxPreview = 50;
  protected readonly displayedColumns = ['date', 'oilRate', 'gasRate', 'waterRate', 'pressure'];

  get previewRows(): ParsedImportRow[] {
    return this.rows.slice(0, this.maxPreview);
  }
}
