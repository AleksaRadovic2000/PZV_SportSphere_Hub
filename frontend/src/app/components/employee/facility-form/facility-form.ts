import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Facility, FacilityResource, SportPrice, WorkingHours } from '../../../models/facility';
import { Sport } from '../../../models/sport';
import { FacilityService } from '../../../services/facility';
import { SportService } from '../../../services/sport';
import { UserService } from '../../../services/user';

@Component({
  selector: 'app-facility-form',
  imports: [FormsModule, RouterLink],
  templateUrl: './facility-form.html',
})
export class FacilityForm implements OnInit {
  private facilityService = inject(FacilityService);
  private sportService = inject(SportService);
  private userService = inject(UserService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  facility = new Facility();
  sports: Sport[] = [];
  selectedImages: File[] = [];
  editMode = false;
  message = '';
  success = false;
  loading = false;

  ngOnInit() {
    this.loadSports();
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.editMode = true;
      this.loadFacility(id);
    } else {
      this.addDefaultWorkingHours();
    }
  }

  loadSports() {
    this.sportService.getAllSports().subscribe({
      next: (sports) => {
        this.sports = sports;
      },
      error: () => {
        this.message = 'Lista sportova nije dostupna.';
      },
    });
  }

  loadFacility(id: string) {
    const user = this.userService.getLoggedUser();

    if (!user) {
      return;
    }

    this.facilityService.getManagedDetails(id, user.username).subscribe({
      next: (facility) => {
        this.facility = facility;
      },
      error: (error) => {
        this.message = error.error?.message || 'Objekat nije moguce ucitati.';
      },
    });
  }

  addDefaultWorkingHours() {
    for (let day = 1; day <= 7; day++) {
      const workingHours = new WorkingHours();
      workingHours.day = day;
      this.facility.workingHours.push(workingHours);
    }
  }

  addWorkingHours() {
    if (this.facility.workingHours.length >= 7) {
      this.message = 'Radno vreme moze sadrzati najvise sedam dana.';
      return;
    }

    const usedDays = this.facility.workingHours.map((item) => item.day);
    const firstAvailableDay = [1, 2, 3, 4, 5, 6, 7].find((day) => !usedDays.includes(day));

    if (!firstAvailableDay) {
      this.message = 'Svaki dan je vec dodat.';
      return;
    }

    const workingHours = new WorkingHours();
    workingHours.day = firstAvailableDay;
    this.facility.workingHours.push(workingHours);
    this.message = '';
  }

  removeWorkingHours(index: number) {
    this.facility.workingHours.splice(index, 1);
  }

  isDaySelected(day: number, currentIndex: number) {
    return this.facility.workingHours.some(
      (item, index) => item.day === day && index !== currentIndex,
    );
  }

  addResource() {
    this.facility.resources.push(new FacilityResource());
  }

  removeResource(index: number) {
    this.facility.resources.splice(index, 1);
  }

  addSportPrice(resource: FacilityResource) {
    resource.sportPrices.push(new SportPrice());
  }

  removeSportPrice(resource: FacilityResource, index: number) {
    resource.sportPrices.splice(index, 1);
  }

  selectImages(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedImages = input.files ? Array.from(input.files) : [];

    const invalidImage = this.selectedImages.find(
      (image) => !['image/png', 'image/jpeg'].includes(image.type),
    );

    if (invalidImage) {
      this.selectedImages = [];
      input.value = '';
      this.message = 'Sve slike moraju biti PNG ili JPG fajlovi.';
    }
  }

  save() {
    this.message = '';
    this.success = false;
    const validationMessage = this.validateForm();

    if (validationMessage) {
      this.message = validationMessage;
      return;
    }

    const user = this.userService.getLoggedUser();

    if (!user) {
      return;
    }

    this.loading = true;
    const request = this.editMode
      ? this.facilityService.update(this.facility, user.username, this.selectedImages)
      : this.facilityService.create(this.facility, user.username, this.selectedImages);

    request.subscribe({
      next: (response) => {
        this.message = response.message;
        this.success = true;
        this.loading = false;
        this.router.navigateByUrl('/employee/facilities');
      },
      error: (error) => {
        this.message = error.error?.message || 'Cuvanje objekta nije uspelo.';
        this.loading = false;
      },
    });
  }

  private validateForm() {
    if (
      !this.facility.name.trim() ||
      !this.facility.city.trim() ||
      !this.facility.address.trim() ||
      !this.facility.description.trim()
    ) {
      return 'Popunite osnovne podatke objekta.';
    }

    if (!Number.isInteger(this.facility.allowedNoShows) || this.facility.allowedNoShows < 0) {
      return 'Broj dozvoljenih nedolazaka mora biti ceo broj nula ili veci.';
    }

    if (
      this.facility.location.latitude < -90 ||
      this.facility.location.latitude > 90 ||
      this.facility.location.longitude < -180 ||
      this.facility.location.longitude > 180
    ) {
      return 'Koordinate nisu ispravne.';
    }

    if (this.facility.workingHours.length === 0) {
      return 'Unesite radno vreme.';
    }

    if (this.facility.workingHours.length > 7) {
      return 'Radno vreme moze sadrzati najvise sedam dana.';
    }

    const days = this.facility.workingHours.map((item) => item.day);

    if (new Set(days).size !== days.length) {
      return 'Isti dan moze biti unet samo jednom.';
    }

    if (this.facility.workingHours.some((item) => item.from >= item.to)) {
      return 'Pocetak radnog vremena mora biti pre kraja.';
    }

    if (this.facility.resources.length === 0) {
      return 'Dodajte najmanje jedan teren ili halu.';
    }

    const resourceNames = this.facility.resources.map((resource) =>
      resource.name.trim().toLowerCase(),
    );

    if (resourceNames.some((name) => !name) || new Set(resourceNames).size !== resourceNames.length) {
      return 'Nazivi resursa moraju biti popunjeni i jedinstveni.';
    }

    const hasOutdoorResource = this.facility.resources.some(
      (resource) => resource.type === 'outdoor' && resource.capacity >= 4,
    );

    if (!hasOutdoorResource) {
      return 'Potreban je najmanje jedan otvoreni teren kapaciteta najmanje 4.';
    }

    for (const resource of this.facility.resources) {
      if (resource.capacity < 1 || !Number.isInteger(resource.capacity)) {
        return 'Kapacitet mora biti pozitivan ceo broj.';
      }

      if (resource.equipmentDescription.length > 300) {
        return 'Opis opreme moze imati najvise 300 karaktera.';
      }

      if (resource.sportPrices.length === 0) {
        return 'Svaki resurs mora imati najmanje jedan sport i cenu.';
      }

      const selectedSports = resource.sportPrices.map((price) => price.sport);

      if (
        selectedSports.some((sport) => !sport) ||
        new Set(selectedSports).size !== selectedSports.length
      ) {
        return 'Sportovi jednog resursa moraju biti izabrani i jedinstveni.';
      }

      if (resource.sportPrices.some((price) => price.pricePerHour <= 0)) {
        return 'Cena po satu mora biti pozitivna.';
      }
    }

    return '';
  }
}
