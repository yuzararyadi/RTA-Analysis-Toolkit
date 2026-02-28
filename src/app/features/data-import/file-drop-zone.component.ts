import {
  Component, Input, Output, EventEmitter,
  HostListener, ViewChild, ElementRef, ChangeDetectionStrategy, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-file-drop-zone',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div
      class="drop-zone"
      [class.drag-over]="isDragOver()"
      [class.file-selected]="selectedFile()"
      (click)="fileInput.click()">

      <input
        #fileInput
        type="file"
        [accept]="accept"
        style="display:none"
        (change)="onFileInputChange($event)" />

      @if (!selectedFile()) {
        <mat-icon class="drop-icon">upload_file</mat-icon>
        <p class="drop-primary">Drag & drop your file here</p>
        <p class="drop-secondary">or click to browse</p>
        <p class="drop-hint">Accepted: CSV, Excel (.xlsx, .xls)</p>
      } @else {
        <mat-icon class="drop-icon success">check_circle</mat-icon>
        <p class="drop-primary">{{ selectedFile()!.name }}</p>
        <p class="drop-secondary">{{ formatSize(selectedFile()!.size) }} · Click to replace</p>
      }
    </div>
  `,
  styles: [`
    .drop-zone {
      border: 2px dashed #90a4ae;
      border-radius: 8px;
      padding: 40px 24px;
      text-align: center;
      cursor: pointer;
      transition: border-color 0.2s, background-color 0.2s;
      background: #fafafa;
      user-select: none;
    }
    .drop-zone:hover {
      border-color: #1565C0;
      background: #e3f2fd;
    }
    .drop-zone.drag-over {
      border-color: #1565C0;
      background: #e3f2fd;
    }
    .drop-zone.file-selected {
      border-color: #2e7d32;
      background: #f1f8e9;
    }
    .drop-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #90a4ae;
    }
    .drop-icon.success {
      color: #2e7d32;
    }
    .drop-primary {
      margin: 12px 0 4px;
      font-size: 16px;
      font-weight: 500;
      color: #333;
      word-break: break-all;
    }
    .drop-secondary {
      margin: 0;
      font-size: 13px;
      color: #666;
    }
    .drop-hint {
      margin: 8px 0 0;
      font-size: 12px;
      color: #999;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileDropZoneComponent {
  @Input() accept = '.csv';
  @Output() fileSelected = new EventEmitter<File>();

  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  protected isDragOver = signal(false);
  protected selectedFile = signal<File | null>(null);

  @HostListener('dragover', ['$event'])
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  @HostListener('dragleave', ['$event'])
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  @HostListener('drop', ['$event'])
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);

    const file = event.dataTransfer?.files?.[0];
    if (file) this.emitFile(file);
  }

  protected onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.emitFile(file);
    // Reset so same file can be re-selected
    input.value = '';
  }

  private emitFile(file: File): void {
    this.selectedFile.set(file);
    this.fileSelected.emit(file);
  }

  protected formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
