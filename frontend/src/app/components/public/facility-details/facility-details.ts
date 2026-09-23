import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FacilityDetailsResponse, FacilityResource } from '../../../models/facility';
import { AthleteReservation, Reservation } from '../../../models/reservation';
import { FacilityReview } from '../../../models/review';
import { FacilityService } from '../../../services/facility';
import { ReservationService } from '../../../services/reservation';
import { ReviewService } from '../../../services/review';
import { UserService } from '../../../services/user';

@Component({
  selector: 'app-facility-details',
  imports: [FormsModule, RouterLink],
  templateUrl: './facility-details.html',
})
export class FacilityDetails implements OnInit {
  private facilityService = inject(FacilityService);
  private reservationService = inject(ReservationService);
  private reviewService = inject(ReviewService);
  private userService = inject(UserService);
  private sanitizer = inject(DomSanitizer);
  private route = inject(ActivatedRoute);

  details = new FacilityDetailsResponse();
  resources: FacilityResource[] = [];
  activeResourceIndex = 0;
  schedule: Reservation[] = [];
  weekStart = this.getMonday(new Date());
  calendarDays: Date[] = [];
  calendarHours: number[] = [];
  reservationDate = '';
  reservationStart = '';
  reservationEnd = '';
  selectedSport = '';
  requestedSport = '';
  mapUrl: SafeResourceUrl | null = null;
  message = '';
  reservationMessage = '';
  reservationSuccess = false;
  reviews: FacilityReview[] = [];
  reviewReservations: AthleteReservation[] = [];
  reviewReservationId = '';
  reviewReaction = 'like';
  reviewComment = '';
  reviewMessage = '';
  reviewSuccess = false;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.message = 'Objekat nije izabran.';
      return;
    }

    this.updateCalendarDays();
    this.facilityService.getDetails(id).subscribe({
      next: (details) => {
        this.details = details;

        if (this.loggedAthlete) {
          this.updateCalendarHours();
          this.prepareResources();
          this.initializeMap();
          this.loadReviews();
          this.loadReviewReservations();
        }
      },
      error: (error) => {
        this.message = error.error?.message || 'Detalje objekta nije moguce ucitati.';
      },
    });
  }

  get activeResource() {
    return this.resources[this.activeResourceIndex];
  }

  get loggedAthlete() {
    const user = this.userService.getLoggedUser();
    return user?.role === 'athlete' ? user : null;
  }

  get backRoute() {
    return this.loggedAthlete ? '/athlete/facilities' : '/';
  }

  loadReviews() {
    const facilityId = this.details.facility._id;

    if (!this.loggedAthlete || !facilityId) {
      return;
    }

    this.reviewService.getRecentReviews(facilityId).subscribe({
      next: (reviews) => {
        this.reviews = reviews;
      },
      error: () => {
        this.reviewMessage = 'Komentare nije moguce ucitati.';
        this.reviewSuccess = false;
      },
    });
  }

  loadReviewReservations() {
    const user = this.loggedAthlete;

    if (!user) {
      return;
    }

    this.reservationService.getAthleteReservations(user.username).subscribe({
      next: (reservations) => {
        this.reviewService
          .getReviewedReservationIds(user.username, this.details.facility._id)
          .subscribe({
            next: (reviewedReservationIds) => {
              this.reviewReservations = reservations.filter(
                (reservation) =>
                  reservation.facilityId === this.details.facility._id &&
                  reservation.status === 'attended' &&
                  !reviewedReservationIds.includes(reservation._id),
              );
              this.reviewReservationId = this.reviewReservations[0]?._id || '';
            },
            error: () => {
              this.reviewMessage = 'Ocenjene rezervacije nije moguce ucitati.';
              this.reviewSuccess = false;
            },
          });
      },
      error: () => {
        this.reviewMessage = 'Rezervacije za ocenjivanje nije moguce ucitati.';
        this.reviewSuccess = false;
      },
    });
  }

  createReview() {
    const user = this.loggedAthlete;
    this.reviewMessage = '';
    this.reviewSuccess = false;

    if (!user || !this.reviewReservationId) {
      this.reviewMessage = 'Izaberite odigranu rezervaciju.';
      return;
    }

    if (this.reviewComment.length > 500) {
      this.reviewMessage = 'Komentar moze imati najvise 500 karaktera.';
      return;
    }

    this.reviewService
      .createReview(
        this.reviewReservationId,
        user.username,
        this.reviewReaction,
        this.reviewComment,
      )
      .subscribe({
        next: (response) => {
          if (this.reviewReaction === 'like') {
            this.details.likes++;
          } else {
            this.details.dislikes++;
          }

          this.reviewReservations = this.reviewReservations.filter(
            (reservation) => reservation._id !== this.reviewReservationId,
          );
          this.reviewReservationId = this.reviewReservations[0]?._id || '';
          this.reviewComment = '';
          this.reviewMessage = response.message;
          this.reviewSuccess = true;
          this.loadReviews();
        },
        error: (error) => {
          this.reviewMessage = error.error?.message || 'Ocenjivanje objekta nije uspelo.';
        },
      });
  }

  formatReviewDate(value: string) {
    return new Date(value).toLocaleString('sr-Latn-RS');
  }

  isOwnReview(review: FacilityReview) {
    return review.athleteUsername === this.loggedAthlete?.username;
  }

  prepareResources() {
    const requestedType = this.route.snapshot.queryParamMap.get('resourceType') || '';
    this.requestedSport = this.route.snapshot.queryParamMap.get('sport') || '';

    if (requestedType === 'outdoor') {
      this.resources = this.details.facility.resources.filter(
        (resource) => resource.type === 'outdoor',
      );
    } else if (requestedType === 'indoor') {
      this.resources = this.details.facility.resources.filter(
        (resource) => resource.type === 'indoor' || resource.type === 'hall',
      );
    } else {
      this.resources = this.details.facility.resources;
    }

    if (this.requestedSport) {
      this.resources = this.resources.filter((resource) =>
        resource.sportPrices.some((price) => price.sport === this.requestedSport),
      );
    }

    if (this.resources.length === 0) {
      this.resources = this.details.facility.resources;
    }

    this.activeResourceIndex = 0;
    this.selectDefaultSport();
    this.loadSchedule();
  }

  previousResource() {
    if (this.resources.length < 2) {
      return;
    }

    this.activeResourceIndex =
      (this.activeResourceIndex - 1 + this.resources.length) % this.resources.length;
    this.resourceChanged();
  }

  nextResource() {
    if (this.resources.length < 2) {
      return;
    }

    this.activeResourceIndex = (this.activeResourceIndex + 1) % this.resources.length;
    this.resourceChanged();
  }

  previousWeek() {
    this.weekStart = new Date(this.weekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    this.updateCalendarDays();
    this.loadSchedule();
  }

  nextWeek() {
    this.weekStart = new Date(this.weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    this.updateCalendarDays();
    this.loadSchedule();
  }

  loadSchedule() {
    if (!this.activeResource) {
      return;
    }

    const rangeEnd = new Date(this.weekStart);
    rangeEnd.setDate(rangeEnd.getDate() + 7);

    this.reservationService
      .getSchedule(this.activeResource._id, this.weekStart, rangeEnd)
      .subscribe({
        next: (schedule) => {
          this.schedule = schedule;
        },
        error: (error) => {
          this.reservationMessage = error.error?.message || 'Raspored nije moguce ucitati.';
          this.reservationSuccess = false;
        },
      });
  }

  selectSlot(day: Date, hour: number) {
    if (this.isOccupied(day, hour) || this.isUnavailable(day, hour)) {
      return;
    }

    this.reservationDate = this.formatInputDate(day);
    this.reservationStart = this.formatHour(hour);
    this.reservationEnd = this.formatHour(hour + 1);
    this.reservationMessage = '';
  }

  isOccupied(day: Date, hour: number) {
    const slotStart = new Date(day);
    slotStart.setHours(hour, 0, 0, 0);
    const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);

    return this.schedule.some(
      (reservation) =>
        new Date(reservation.startDateTime) < slotEnd &&
        new Date(reservation.endDateTime) > slotStart,
    );
  }

  isSelected(day: Date, hour: number) {
    return (
      this.reservationDate === this.formatInputDate(day) &&
      this.reservationStart === this.formatHour(hour)
    );
  }

  isUnavailable(day: Date, hour: number) {
    const slotStart = new Date(day);
    slotStart.setHours(hour, 0, 0, 0);

    if (slotStart <= new Date()) {
      return true;
    }

    const javascriptDay = day.getDay();
    const dayNumber = javascriptDay === 0 ? 7 : javascriptDay;
    const workingHours = this.details.facility.workingHours.find(
      (item) => item.day === dayNumber,
    );

    if (!workingHours) {
      return true;
    }

    const workingStart = this.timeToMinutes(workingHours.from);
    const workingEnd = this.timeToMinutes(workingHours.to);
    const slotStartMinutes = hour * 60;
    const slotEndMinutes = slotStartMinutes + 60;
    return slotStartMinutes < workingStart || slotEndMinutes > workingEnd;
  }

  getUnavailableReason(day: Date, hour: number) {
    const slotStart = new Date(day);
    slotStart.setHours(hour, 0, 0, 0);

    if (slotStart <= new Date()) {
      return 'Proslo';
    }

    const javascriptDay = day.getDay();
    const dayNumber = javascriptDay === 0 ? 7 : javascriptDay;
    const workingHours = this.details.facility.workingHours.find(
      (item) => item.day === dayNumber,
    );

    if (!workingHours) {
      return 'Ne radi';
    }

    return 'Van radnog vremena';
  }

  getSlotLabel(day: Date, hour: number) {
    if (this.isUnavailable(day, hour)) {
      return this.getUnavailableReason(day, hour);
    }

    if (this.isOccupied(day, hour)) {
      return 'Zauzeto';
    }

    return 'Slobodno';
  }

  getSlotClass(day: Date, hour: number) {
    if (this.isUnavailable(day, hour)) {
      return 'w-full bg-background text-muted border-0 rounded p-2 disabled:opacity-50';
    }

    if (this.isOccupied(day, hour)) {
      return 'w-full bg-danger text-white border-0 rounded p-2 disabled:opacity-50';
    }

    if (this.isSelected(day, hour)) {
      return 'w-full bg-accent border-0 rounded p-2 cursor-pointer';
    }

    return 'w-full bg-surface border rounded p-2 cursor-pointer';
  }

  createReservation() {
    this.reservationMessage = '';
    this.reservationSuccess = false;
    const user = this.loggedAthlete;

    if (!user || !this.activeResource) {
      this.reservationMessage = 'Samo prijavljen sportista moze napraviti rezervaciju.';
      return;
    }

    if (
      !this.reservationDate ||
      !this.reservationStart ||
      !this.reservationEnd ||
      !this.selectedSport
    ) {
      this.reservationMessage = 'Izaberite datum, vreme i sport.';
      return;
    }

    const startDateTime = new Date(`${this.reservationDate}T${this.reservationStart}:00`);
    const endDateTime = new Date(`${this.reservationDate}T${this.reservationEnd}:00`);

    if (!this.reservationStart.endsWith(':00') || !this.reservationEnd.endsWith(':00')) {
      this.reservationMessage = 'Termin mora poceti i zavrsiti se na pun sat.';
      return;
    }

    if (endDateTime <= startDateTime) {
      this.reservationMessage = 'Kraj termina mora biti posle pocetka.';
      return;
    }

    const duration = (endDateTime.getTime() - startDateTime.getTime()) / (60 * 60 * 1000);

    if (duration < 1 || !Number.isInteger(duration)) {
      this.reservationMessage = 'Termin mora trajati najmanje jedan ceo sat.';
      return;
    }

    this.reservationService
      .createReservation(
        user.username,
        this.details.facility._id,
        this.activeResource._id,
        this.selectedSport,
        startDateTime,
        endDateTime,
      )
      .subscribe({
        next: (response) => {
          this.reservationMessage = response.message;
          this.reservationSuccess = true;
          this.weekStart = this.getMonday(startDateTime);
          this.updateCalendarDays();
          this.loadSchedule();
        },
        error: (error) => {
          this.reservationMessage = error.error?.message || 'Rezervacija nije uspela.';
        },
      });
  }

  getExpectedPrice() {
    if (!this.activeResource || !this.selectedSport || !this.reservationDate) {
      return 0;
    }

    const price = this.activeResource.sportPrices.find(
      (item) => item.sport === this.selectedSport,
    );
    const start = new Date(`${this.reservationDate}T${this.reservationStart || '00:00'}:00`);
    const end = new Date(`${this.reservationDate}T${this.reservationEnd || '00:00'}:00`);
    const duration = (end.getTime() - start.getTime()) / (60 * 60 * 1000);

    if (!price || duration <= 0) {
      return 0;
    }

    return price.pricePerHour * duration;
  }

  getImageUrl(image: string) {
    return this.facilityService.getImageUrl(image);
  }

  getDayName(day: number) {
    const days = ['', 'Ponedeljak', 'Utorak', 'Sreda', 'Cetvrtak', 'Petak', 'Subota', 'Nedelja'];
    return days[day] || '';
  }

  getCalendarDayName(day: Date) {
    const names = ['Ned', 'Pon', 'Uto', 'Sre', 'Cet', 'Pet', 'Sub'];
    return `${names[day.getDay()]} ${String(day.getDate()).padStart(2, '0')}.${String(day.getMonth() + 1).padStart(2, '0')}.`;
  }

  private resourceChanged() {
    this.schedule = [];
    this.reservationDate = '';
    this.reservationStart = '';
    this.reservationEnd = '';
    this.selectDefaultSport();
    this.loadSchedule();
  }

  private selectDefaultSport() {
    const supportsRequestedSport = this.activeResource?.sportPrices.some(
      (price) => price.sport === this.requestedSport,
    );
    this.selectedSport = supportsRequestedSport
      ? this.requestedSport
      : this.activeResource?.sportPrices[0]?.sport || '';
  }

  private updateCalendarDays() {
    this.calendarDays = [];

    for (let index = 0; index < 7; index++) {
      const day = new Date(this.weekStart);
      day.setDate(day.getDate() + index);
      this.calendarDays.push(day);
    }
  }

  private updateCalendarHours() {
    if (this.details.facility.workingHours.length === 0) {
      this.calendarHours = [];
      return;
    }

    const openingMinutes = this.details.facility.workingHours.map((item) =>
      this.timeToMinutes(item.from),
    );
    const closingMinutes = this.details.facility.workingHours.map((item) =>
      this.timeToMinutes(item.to),
    );
    const firstHour = Math.floor(Math.min(...openingMinutes) / 60);
    const lastHour = Math.ceil(Math.max(...closingMinutes) / 60);

    this.calendarHours = [];

    for (let hour = firstHour; hour < lastHour; hour++) {
      const slotStart = hour * 60;
      const slotEnd = slotStart + 60;
      const isWithinAnyWorkingDay = this.details.facility.workingHours.some((item) => {
        const workingStart = this.timeToMinutes(item.from);
        const workingEnd = this.timeToMinutes(item.to);
        return slotStart >= workingStart && slotEnd <= workingEnd;
      });

      if (isWithinAnyWorkingDay) {
        this.calendarHours.push(hour);
      }
    }
  }

  private getMonday(date: Date) {
    const result = new Date(date);
    const day = result.getDay();
    const difference = day === 0 ? -6 : 1 - day;
    result.setDate(result.getDate() + difference);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  private formatInputDate(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatHour(hour: number) {
    return `${String(hour).padStart(2, '0')}:00`;
  }

  private timeToMinutes(time: string) {
    const parts = time.split(':');
    return Number(parts[0]) * 60 + Number(parts[1]);
  }

  private initializeMap() {
    const latitude = this.details.facility.location.latitude;
    const longitude = this.details.facility.location.longitude;
    const distance = 0.01;
    const url =
      `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - distance},` +
      `${latitude - distance},${longitude + distance},${latitude + distance}` +
      `&layer=mapnik&marker=${latitude},${longitude}`;
    this.mapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
