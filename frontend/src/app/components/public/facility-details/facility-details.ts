import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FacilityDetailsResponse } from '../../../models/facility';
import { FacilityService } from '../../../services/facility';

@Component({
  selector: 'app-facility-details',
  imports: [RouterLink],
  templateUrl: './facility-details.html',
})
export class FacilityDetails implements OnInit {
  private facilityService = inject(FacilityService);
  private route = inject(ActivatedRoute);

  details = new FacilityDetailsResponse();
  message = '';

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.message = 'Objekat nije izabran.';
      return;
    }

    this.facilityService.getDetails(id).subscribe({
      next: (details) => {
        this.details = details;
      },
      error: (error) => {
        this.message = error.error?.message || 'Detalje objekta nije moguce ucitati.';
      },
    });
  }

  getImageUrl(image: string) {
    return this.facilityService.getImageUrl(image);
  }

  getDayName(day: number) {
    const days = ['', 'Ponedeljak', 'Utorak', 'Sreda', 'Cetvrtak', 'Petak', 'Subota', 'Nedelja'];
    return days[day] || '';
  }
}
