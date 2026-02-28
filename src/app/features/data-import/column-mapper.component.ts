import {
  Component, Input, Output, EventEmitter,
  OnChanges, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { ExcelColumnMapping } from '../../models/import.model';

interface FieldDef {
  key: keyof Omit<ExcelColumnMapping, 'sheetIndex' | 'headerRowIndex'>;
  label: string;
  required: boolean;
  unit: string;
}

const FIELDS: FieldDef[] = [
  { key: 'dateColIndex',      label: 'Date',       required: true,  unit: '' },
  { key: 'oilRateColIndex',   label: 'Oil Rate',   required: false, unit: 'STB/d' },
  { key: 'gasRateColIndex',   label: 'Gas Rate',   required: false, unit: 'Mscf/d' },
  { key: 'waterRateColIndex', label: 'Water Rate', required: false, unit: 'STB/d' },
  { key: 'pressureColIndex',  label: 'Pressure',   required: false, unit: 'psia' },
];

@Component({
  selector: 'app-column-mapper',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatSelectModule, MatIconModule],
  template: `
    <p class="mapper-hint">
      Map each RTA field to the corresponding column in your spreadsheet.
      At least <strong>Date</strong> and one rate column are required.
    </p>

    <div class="mapper-grid">
      @for (field of fields; track field.key) {
        <mat-form-field appearance="outline" class="mapper-field">
          <mat-label>
            {{ field.label }}
            @if (field.unit) { <span class="unit">({{ field.unit }})</span> }
            @if (field.required) { <span class="required">*</span> }
          </mat-label>
          <mat-select
            [(ngModel)]="selection[field.key]"
            (ngModelChange)="onSelectionChange()">
            <mat-option [value]="undefined">— Not mapped —</mat-option>
            @for (header of headers; track $index) {
              <mat-option [value]="$index">
                <span class="col-index">{{ $index + 1 }}</span> {{ header || '(empty)' }}
              </mat-option>
            }
          </mat-select>
        </mat-form-field>
      }
    </div>

    @if (!isValid) {
      <p class="validation-hint">
        <mat-icon class="hint-icon">info</mat-icon>
        Select a Date column and at least one rate column to continue.
      </p>
    }
  `,
  styles: [`
    .mapper-hint {
      font-size: 13px;
      color: #555;
      margin: 0 0 16px;
    }
    .mapper-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 16px;
    }
    .mapper-field {
      width: 100%;
    }
    .unit {
      font-size: 11px;
      color: #888;
    }
    .required {
      color: #c62828;
      margin-left: 2px;
    }
    .col-index {
      display: inline-block;
      min-width: 20px;
      font-size: 11px;
      color: #999;
      margin-right: 4px;
    }
    .validation-hint {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: #f57c00;
      margin: 8px 0 0;
    }
    .hint-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.Default,
})
export class ColumnMapperComponent implements OnChanges {
  @Input() headers: string[] = [];
  @Input() sheetIndex = 0;
  @Output() mappingChange = new EventEmitter<ExcelColumnMapping | null>();

  protected readonly fields = FIELDS;

  protected selection: Partial<Record<string, number | undefined>> = {
    dateColIndex: undefined,
    oilRateColIndex: undefined,
    gasRateColIndex: undefined,
    waterRateColIndex: undefined,
    pressureColIndex: undefined,
  };

  protected get isValid(): boolean {
    const s = this.selection;
    const hasDate = s['dateColIndex'] !== undefined;
    const hasRate = s['oilRateColIndex'] !== undefined ||
                    s['gasRateColIndex'] !== undefined ||
                    s['waterRateColIndex'] !== undefined;
    return hasDate && hasRate;
  }

  ngOnChanges(): void {
    // Try to auto-detect columns when headers change
    this.autoDetect();
    this.onSelectionChange();
  }

  protected onSelectionChange(): void {
    if (!this.isValid) {
      this.mappingChange.emit(null);
      return;
    }

    const mapping: ExcelColumnMapping = {
      sheetIndex: this.sheetIndex,
      headerRowIndex: 0,
      dateColIndex: this.selection['dateColIndex']!,
      oilRateColIndex: this.selection['oilRateColIndex'],
      gasRateColIndex: this.selection['gasRateColIndex'],
      waterRateColIndex: this.selection['waterRateColIndex'],
      pressureColIndex: this.selection['pressureColIndex'],
    };
    this.mappingChange.emit(mapping);
  }

  private autoDetect(): void {
    // Reset
    for (const f of FIELDS) this.selection[f.key] = undefined;

    const DETECT: Record<string, string> = {
      'date': 'dateColIndex', 'time': 'dateColIndex', 'production_date': 'dateColIndex', 'prod_date': 'dateColIndex',
      'oil_rate_stbd': 'oilRateColIndex', 'oil rate': 'oilRateColIndex', 'oil_rate': 'oilRateColIndex', 'qo': 'oilRateColIndex',
      'gas_rate_mscfd': 'gasRateColIndex', 'gas rate': 'gasRateColIndex', 'gas_rate': 'gasRateColIndex', 'qg': 'gasRateColIndex',
      'water_rate_stbd': 'waterRateColIndex', 'water rate': 'waterRateColIndex', 'water_rate': 'waterRateColIndex', 'qw': 'waterRateColIndex',
      'pressure_psia': 'pressureColIndex', 'pressure': 'pressureColIndex', 'bhfp': 'pressureColIndex', 'pwf': 'pressureColIndex', 'bhp': 'pressureColIndex',
    };

    this.headers.forEach((h, i) => {
      const key = DETECT[h.toLowerCase().trim()];
      if (key && this.selection[key] === undefined) {
        this.selection[key] = i;
      }
    });
  }
}
