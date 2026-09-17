import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, input, output } from '@angular/core';

@Component({
  selector: 'app-file-drop-zone',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-drop-zone.component.html',
  styleUrl: './file-drop-zone.component.css',
})
export class FileDropZoneComponent {
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  accept = input<string>('image/*');
  multiple = input<boolean>(true);
  maxSizeMb = input<number>(2);
  hint = input<string>('');

  filesSelected = output<File[]>();

  isDragOver = false;

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragOver = false;

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      this.filesSelected.emit(files);
    }
  }

  onFileSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      this.filesSelected.emit(files);
      input.value = '';
    }
  }
}
