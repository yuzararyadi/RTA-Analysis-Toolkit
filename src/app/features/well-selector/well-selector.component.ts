import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { AppStateService } from '../../services/app-state.service';
import { Well } from '../../models/well.model';

/**
 * Well selector dropdown component
 * Displays available wells and handles well selection
 */
@Component({
  selector: 'app-well-selector',
  standalone: true,
  imports: [CommonModule, MatSelectModule, MatFormFieldModule],
  template: `
    <mat-form-field appearance="fill" class="well-select">
      <mat-label>Select Well</mat-label>
      <mat-select 
        [value]="selectedWell$ | async" 
        (selectionChange)="onWellSelected($event.value)">
        <mat-select-trigger *ngIf="selectedWell$ | async as well">
          {{ well.wellName }}
        </mat-select-trigger>
        <mat-option *ngFor="let well of (wellList$ | async)" [value]="well">
          {{ well.wellName }} ({{ well.fluidType }})
        </mat-option>
      </mat-select>
    </mat-form-field>
  `,
  styles: [`
    .well-select {
      width: 200px;
      margin-right: 20px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WellSelectorComponent {
  private appState = inject(AppStateService);

  wellList$ = this.appState.wellList$;
  selectedWell$ = this.appState.selectedWell$;

  onWellSelected(well: Well): void {
    this.appState.selectWell(well.wellId);
  }
}
