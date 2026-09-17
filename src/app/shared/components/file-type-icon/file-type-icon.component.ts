import { Component, computed, input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { FOLDER_ASSET, describeFileType } from '../../../core/utils/file-types';

@Component({
  selector: 'app-file-type-icon',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './file-type-icon.component.html',
  styleUrl: './file-type-icon.component.css',
})
export class FileTypeIconComponent {
  fileName = input<string>('');
  mimeType = input<string>('');
  size = input<number>(20);
  /** Render the folder artwork instead of deriving a type from the name. */
  folder = input<boolean>(false);

  info = computed(() => describeFileType(this.fileName(), this.mimeType()));

  /** Artwork from `public/`, or null when only a glyph is available. */
  asset = computed(() => (this.folder() ? FOLDER_ASSET : (this.info().asset ?? null)));

  label = computed(() => (this.folder() ? 'Folder' : this.info().label));
}
