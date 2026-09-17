import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Sport } from '../../../models/sport';
import { SportService } from '../../../services/sport';

@Component({
  selector: 'app-sport-selector',
  imports: [FormsModule],
  templateUrl: './sport-selector.html',
})
export class SportSelector implements OnInit {
  private sportService = inject(SportService);

  @Input() selectedSports: string[] = [];
  @Output() selectedSportsChange = new EventEmitter<string[]>();

  sports: Sport[] = [];
  message = '';

  ngOnInit() {
    this.sportService.getAllSports().subscribe({
      next: (sports) => {
        this.sports = sports;
      },
      error: () => {
        this.message = 'Lista sportova nije dostupna.';
      },
    });
  }

  updateSelection(sports: string[]) {
    this.selectedSports = sports;
    this.selectedSportsChange.emit(sports);
  }
}
