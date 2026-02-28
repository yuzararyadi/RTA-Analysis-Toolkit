import {
  Component, ChangeDetectionStrategy, signal, computed, inject, ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';

import { FileDropZoneComponent } from './file-drop-zone.component';
import { ImportPreviewTableComponent } from './import-preview-table.component';
import { ColumnMapperComponent } from './column-mapper.component';
import { DataImportService } from '../../services/data-import.service';
import {
  ImportValidationResult, ImportedDataset, WellImportMetadata,
  ExcelColumnMapping, ExcelWorkbookInfo,
} from '../../models/import.model';

type FileType = 'csv' | 'excel' | null;

@Component({
  selector: 'app-data-import-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatDividerModule,
    FileDropZoneComponent,
    ImportPreviewTableComponent,
    ColumnMapperComponent,
  ],
  template: `
    <h2 mat-dialog-title>Import Production Data</h2>

    <mat-dialog-content>
      <mat-stepper [linear]="false" #stepper>

        <!-- ── Step 1: File Upload + Well Metadata ── -->
        <mat-step label="Upload & Well Details">
          <div class="step-content">

            <app-file-drop-zone
              accept=".csv,.xlsx,.xls"
              (fileSelected)="onFileSelected($event)">
            </app-file-drop-zone>

            @if (parsing()) {
              <mat-progress-bar mode="indeterminate" style="margin-top:12px"></mat-progress-bar>
              <p class="parsing-note">Reading file…</p>
            }

            @if (fileType() === 'csv' && parseResult()) {
              <div class="parse-status" [class.has-errors]="!parseResult()!.isValid">
                <mat-icon>{{ parseResult()!.isValid ? 'check_circle' : 'error' }}</mat-icon>
                <span>
                  {{ parseResult()!.isValid
                    ? parseResult()!.rows.length + ' rows detected'
                    : parseResult()!.errors[0]?.message }}
                </span>
              </div>
            }

            @if (fileType() === 'excel' && excelInfo()) {
              <div class="parse-status">
                <mat-icon>table_chart</mat-icon>
                <span>
                  Excel file loaded — {{ excelInfo()!.sheets.length }} sheet(s). Map columns in the next step.
                </span>
              </div>
            }

            <mat-divider style="margin: 20px 0"></mat-divider>
            <p class="section-label">Well Details</p>

            <form [formGroup]="wellForm" class="well-form">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Well Name *</mat-label>
                <input matInput formControlName="wellName" placeholder="e.g. Baker Federal 12-34H" />
                @if (wellForm.get('wellName')?.hasError('required') && wellForm.get('wellName')?.touched) {
                  <mat-error>Well name is required</mat-error>
                }
              </mat-form-field>

              <div class="form-row">
                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>API Number</mat-label>
                  <input matInput formControlName="apiNumber" placeholder="e.g. 42-389-12345" />
                </mat-form-field>

                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Field Name</mat-label>
                  <input matInput formControlName="field" placeholder="e.g. Wolfcamp" />
                </mat-form-field>
              </div>

              <div class="form-row">
                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Fluid Type</mat-label>
                  <mat-select formControlName="fluidType">
                    <mat-option value="oil">Oil</mat-option>
                    <mat-option value="gas">Gas</mat-option>
                    <mat-option value="condensate">Condensate</mat-option>
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Completion Type</mat-label>
                  <mat-select formControlName="completionType">
                    <mat-option value="horizontal">Horizontal</mat-option>
                    <mat-option value="vertical">Vertical</mat-option>
                    <mat-option value="deviated">Deviated</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>
            </form>
          </div>

          <div class="step-actions">
            <button mat-button mat-dialog-close>Cancel</button>
            <button
              mat-flat-button color="primary"
              [disabled]="!step1Complete()"
              (click)="onStep1Next()">
              {{ fileType() === 'excel' ? 'Next: Map Columns' : 'Next: Preview' }}
              <mat-icon iconPositionEnd>arrow_forward</mat-icon>
            </button>
          </div>
        </mat-step>

        <!-- ── Step 2: Column Mapping (Excel only) ── -->
        <mat-step label="Map Columns">
          <div class="step-content">
            @if (fileType() === 'excel' && excelInfo()) {
              @if (excelInfo()!.sheets.length > 1) {
                <mat-form-field appearance="outline" style="width:100%; margin-bottom:12px">
                  <mat-label>Sheet</mat-label>
                  <mat-select [(ngModel)]="selectedSheetIndex" (ngModelChange)="onSheetChange($event)">
                    @for (sheet of excelInfo()!.sheets; track $index) {
                      <mat-option [value]="$index">{{ sheet }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              }

              <app-column-mapper
                [headers]="currentSheetHeaders()"
                [sheetIndex]="selectedSheetIndex"
                (mappingChange)="onMappingChange($event)">
              </app-column-mapper>

            } @else {
              <p class="not-applicable">Column mapping is only required for Excel files.</p>
            }
          </div>

          <div class="step-actions">
            <button mat-button (click)="stepper.selectedIndex = 0">Back</button>
            <button mat-button mat-dialog-close>Cancel</button>
            <button
              mat-flat-button color="primary"
              [disabled]="!step2Complete()"
              (click)="onStep2Next()">
              Next: Preview
              <mat-icon iconPositionEnd>arrow_forward</mat-icon>
            </button>
          </div>
        </mat-step>

        <!-- ── Step 3: Preview + Confirm ── -->
        <mat-step label="Preview & Confirm">
          <div class="step-content">
            @if (parsing()) {
              <mat-progress-bar mode="indeterminate"></mat-progress-bar>
              <p class="parsing-note">Parsing Excel data…</p>
            }
            @if (parseResult()) {
              <app-import-preview-table
                [rows]="parseResult()!.rows"
                [errors]="parseResult()!.errors"
                [warnings]="parseResult()!.warnings">
              </app-import-preview-table>
            }
          </div>

          <div class="step-actions">
            <button mat-button (click)="onBackFromPreview()">Back</button>
            <button mat-button mat-dialog-close>Cancel</button>
            <button
              mat-flat-button color="primary"
              [disabled]="!canConfirm()"
              (click)="onConfirm()">
              <mat-icon>cloud_done</mat-icon>
              Confirm Import
            </button>
          </div>
        </mat-step>

      </mat-stepper>
    </mat-dialog-content>
  `,
  styles: [`
    mat-dialog-content {
      min-width: 600px;
      max-width: 860px;
      padding-bottom: 0;
    }
    .step-content {
      padding: 16px 0 8px;
    }
    .step-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 16px 0 8px;
    }
    .parse-status {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 10px;
      font-size: 14px;
      color: #2e7d32;
    }
    .parse-status mat-icon { color: #2e7d32; }
    .parse-status.has-errors { color: #c62828; }
    .parse-status.has-errors mat-icon { color: #c62828; }
    .parsing-note { font-size: 13px; color: #666; margin: 4px 0 0; }
    .section-label {
      font-size: 13px;
      font-weight: 600;
      color: #555;
      margin: 0 0 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .well-form { display: flex; flex-direction: column; gap: 4px; }
    .form-row { display: flex; gap: 16px; }
    .full-width { width: 100%; }
    .half-width { flex: 1; }
    .not-applicable { color: #888; font-size: 14px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataImportDialogComponent {
  @ViewChild('stepper') stepper!: MatStepper;

  private importService = inject(DataImportService);
  private dialogRef = inject(MatDialogRef<DataImportDialogComponent>);
  private fb = inject(FormBuilder);

  protected parsing = signal(false);
  protected fileType = signal<FileType>(null);
  protected parseResult = signal<ImportValidationResult | null>(null);
  protected selectedFile = signal<File | null>(null);
  protected excelInfo = signal<ExcelWorkbookInfo | null>(null);
  protected excelBuffer = signal<ArrayBuffer | null>(null);
  protected columnMapping = signal<ExcelColumnMapping | null>(null);
  protected selectedSheetIndex = 0;

  protected wellForm = this.fb.group({
    wellName: ['', Validators.required],
    apiNumber: [''],
    field: [''],
    fluidType: [null as 'oil' | 'gas' | 'condensate' | null],
    completionType: [null as 'vertical' | 'horizontal' | 'deviated' | null],
  });

  protected currentSheetHeaders = computed(() => {
    const info = this.excelInfo();
    if (!info) return [];
    return info.headers[this.selectedSheetIndex] ?? [];
  });

  protected step1Complete = computed(() => {
    const type = this.fileType();
    const wellName = !!this.wellForm.get('wellName')?.value?.trim();
    if (!wellName || !type) return false;
    if (type === 'csv') {
      const r = this.parseResult();
      return r !== null && r.errors.length === 0 && r.rows.length >= 2;
    }
    return this.excelInfo() !== null;
  });

  protected step2Complete = computed(() => this.columnMapping() !== null);

  protected canConfirm = computed(() => {
    const result = this.parseResult();
    return result !== null && result.isValid;
  });

  // ── File selection ──────────────────────────────────────────────────

  protected onFileSelected(file: File): void {
    this.selectedFile.set(file);
    this.parseResult.set(null);
    this.excelInfo.set(null);
    this.excelBuffer.set(null);
    this.columnMapping.set(null);

    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'csv') {
      this.fileType.set('csv');
      this.parsing.set(true);
      const reader = new FileReader();
      reader.onload = e => {
        const result = this.importService.parseCSV(e.target!.result as string);
        this.parseResult.set(result);
        this.parsing.set(false);
      };
      reader.readAsText(file);

    } else if (ext === 'xlsx' || ext === 'xls') {
      this.fileType.set('excel');
      this.parsing.set(true);
      const reader = new FileReader();
      reader.onload = e => {
        const buffer = e.target!.result as ArrayBuffer;
        this.excelBuffer.set(buffer);
        const info = this.importService.getExcelInfo(buffer);
        this.excelInfo.set(info);
        this.selectedSheetIndex = 0;
        this.parsing.set(false);
      };
      reader.readAsArrayBuffer(file);
    }
  }

  // ── Step navigation ─────────────────────────────────────────────────

  protected onStep1Next(): void {
    // CSV skips column mapping — jump straight to step 3 (index 2)
    this.stepper.selectedIndex = this.fileType() === 'csv' ? 2 : 1;
  }

  protected onSheetChange(index: number): void {
    this.selectedSheetIndex = index;
    this.columnMapping.set(null);
  }

  protected onMappingChange(mapping: ExcelColumnMapping | null): void {
    this.columnMapping.set(mapping);
  }

  protected onStep2Next(): void {
    const mapping = this.columnMapping();
    const buffer = this.excelBuffer();
    if (!mapping || !buffer) return;

    this.parsing.set(true);
    this.parseResult.set(null);
    const result = this.importService.parseExcel(buffer, mapping);
    this.parseResult.set(result);
    this.parsing.set(false);
    this.stepper.selectedIndex = 2;
  }

  protected onBackFromPreview(): void {
    this.stepper.selectedIndex = this.fileType() === 'csv' ? 0 : 1;
  }

  // ── Confirm ──────────────────────────────────────────────────────────

  protected onConfirm(): void {
    const result = this.parseResult();
    const file = this.selectedFile();
    if (!result || !result.isValid || !file) return;

    const v = this.wellForm.value;
    const metadata: WellImportMetadata = {
      wellName: v.wellName!.trim(),
      apiNumber: v.apiNumber?.trim() || undefined,
      field: v.field?.trim() || undefined,
      fluidType: v.fluidType ?? undefined,
      completionType: v.completionType ?? undefined,
    };

    const dataset: ImportedDataset = this.importService.buildDataset(result.rows, metadata, file.name);
    this.dialogRef.close(dataset);
  }
}
