import { Component, EventEmitter, Input, Output } from '@angular/core';
import { validateImage } from '../../../shared/image-utils';

@Component({
  selector: 'app-profile-image-selector',
  templateUrl: './profile-image-selector.html',
})
export class ProfileImageSelector {
  @Input() preview = '';
  @Input() label = 'Profilna slika';
  @Output() imageSelected = new EventEmitter<File | null>();
  @Output() previewSelected = new EventEmitter<string>();

  message = '';

  selectImage(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.message = validateImage(file, 'Profilna slika');

    if (this.message) {
      input.value = '';
      this.imageSelected.emit(null);
      this.previewSelected.emit('');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.previewSelected.emit(String(reader.result || ''));
    };
    reader.readAsDataURL(file);
    this.imageSelected.emit(file);
  }
}
