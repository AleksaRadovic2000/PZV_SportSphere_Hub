import { Component, inject, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Facility, FacilityResource } from '../../../../models/facility';
import { Reservation } from '../../../../models/reservation';
import { ReservationService } from '../../../../services/reservation';
import { UserService } from '../../../../services/user';

@Component({
  selector: 'app-facility-reservation',
  imports: [FormsModule],
  templateUrl: './facility-reservation.html',
})
export class FacilityReservation implements OnInit {
  @Input() facility = new Facility();
  private reservationService = inject(ReservationService);
  private userService = inject(UserService);
  private route = inject(ActivatedRoute);

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
  message = '';
  success = false;

  ngOnInit() {
    this.updateCalendarDays();
    this.updateCalendarHours();
    this.prepareResources();
  }

  get activeResource() {
    return this.resources[this.activeResourceIndex];
  }

  prepareResources() {
    const requestedType = this.route.snapshot.queryParamMap.get('resourceType') || '';
    this.requestedSport = this.route.snapshot.queryParamMap.get('sport') || '';
    if (requestedType === 'outdoor') {
      this.resources = this.facility.resources.filter((resource) => resource.type === 'outdoor');
    } else if (requestedType === 'indoor') {
      this.resources = this.facility.resources.filter((resource) =>
        ['indoor', 'hall'].includes(resource.type)
      );
    } else {
      this.resources = this.facility.resources;
    }

    if (this.requestedSport) {
      this.resources = this.resources.filter((resource) =>
        resource.sportPrices.some((price) => price.sport === this.requestedSport)
      );
    }

    if (this.resources.length === 0) {
      this.resources = this.facility.resources;
    }
    this.activeResourceIndex = 0;
    this.selectDefaultSport();
    this.loadSchedule();
  }

  previousResource() {
    if (this.resources.length < 2) return;

    this.activeResourceIndex =
      (this.activeResourceIndex - 1 + this.resources.length) % this.resources.length;
    this.resourceChanged();
  }

  nextResource() {
    if (this.resources.length < 2) return;

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
    if (!this.activeResource) return;

    const rangeEnd = new Date(this.weekStart);
    rangeEnd.setDate(rangeEnd.getDate() + 7);

    this.reservationService
      .getSchedule(this.activeResource._id, this.weekStart, rangeEnd)
      .subscribe({
        next: (schedule) => (this.schedule = schedule),
        error: (error) => {
          this.message = error.error?.message || 'Raspored nije moguce ucitati.';
          this.success = false;
        },
      });
  }

  selectSlot(day: Date, hour: number) {
    if (this.isOccupied(day, hour) || this.isUnavailable(day, hour)) return;
    this.reservationDate = this.formatInputDate(day);
    this.reservationStart = this.formatHour(hour);
    this.reservationEnd = this.formatHour(hour + 1);
    this.message = '';
  }

  isOccupied(day: Date, hour: number) {
    const slotStart = new Date(day);
    slotStart.setHours(hour, 0, 0, 0);
    const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);

    return this.schedule.some(
      (reservation) =>
        new Date(reservation.startDateTime) < slotEnd &&
        new Date(reservation.endDateTime) > slotStart
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
    if (slotStart <= new Date()) return true;

    const dayNumber = day.getDay() === 0 ? 7 : day.getDay();
    const workingHours = this.facility.workingHours.find((item) => item.day === dayNumber);
    if (!workingHours) return true;

    return (
      hour * 60 < this.timeToMinutes(workingHours.from) ||
      hour * 60 + 60 > this.timeToMinutes(workingHours.to)
    );
  }

  getSlotLabel(day: Date, hour: number) {
    if (this.isUnavailable(day, hour)) {
      const slot = new Date(day);
      slot.setHours(hour, 0, 0, 0);

      if (slot <= new Date()) return 'Proslo';

      const dayNumber = day.getDay() === 0 ? 7 : day.getDay();
      const facilityWorks = this.facility.workingHours.some((item) => item.day === dayNumber);
      return facilityWorks ? 'Van radnog vremena' : 'Ne radi';
    }

    return this.isOccupied(day, hour) ? 'Zauzeto' : 'Slobodno';
  }

  getSlotClass(day: Date, hour: number) {
    if (this.isUnavailable(day, hour))
      return 'w-full bg-background text-muted border-0 rounded p-2 disabled:opacity-50';
    if (this.isOccupied(day, hour))
      return 'w-full bg-danger text-white border-0 rounded p-2 disabled:opacity-50';
    if (this.isSelected(day, hour)) return 'w-full bg-accent border-0 rounded p-2 cursor-pointer';
    return 'w-full bg-surface border rounded p-2 cursor-pointer';
  }

  createReservation() {
    this.message = '';
    this.success = false;
    const user = this.userService.getLoggedUser();

    if (!user || !this.activeResource) {
      this.message = 'Samo prijavljen sportista moze napraviti rezervaciju.';
      return;
    }

    if (
      !this.reservationDate ||
      !this.reservationStart ||
      !this.reservationEnd ||
      !this.selectedSport
    ) {
      this.message = 'Izaberite datum, vreme i sport.';
      return;
    }

    const startDateTime = new Date(`${this.reservationDate}T${this.reservationStart}:00`);
    const endDateTime = new Date(`${this.reservationDate}T${this.reservationEnd}:00`);

    if (!this.reservationStart.endsWith(':00') || !this.reservationEnd.endsWith(':00')) {
      this.message = 'Termin mora poceti i zavrsiti se na pun sat.';
      return;
    }

    if (endDateTime <= startDateTime) {
      this.message = 'Kraj termina mora biti posle pocetka.';
      return;
    }

    const duration = (endDateTime.getTime() - startDateTime.getTime()) / (60 * 60 * 1000);

    if (duration < 1 || !Number.isInteger(duration)) {
      this.message = 'Termin mora trajati najmanje jedan ceo sat.';
      return;
    }

    this.reservationService
      .createReservation(
        user.username,
        this.facility._id,
        this.activeResource._id,
        this.selectedSport,
        startDateTime,
        endDateTime
      )
      .subscribe({
        next: (response) => {
          this.message = response.message;
          this.success = true;
          this.weekStart = this.getMonday(startDateTime);
          this.updateCalendarDays();
          this.loadSchedule();
        },
        error: (error) => (this.message = error.error?.message || 'Rezervacija nije uspela.'),
      });
  }

  getExpectedPrice() {
    if (!this.activeResource || !this.selectedSport || !this.reservationDate) return 0;
    const price = this.activeResource.sportPrices.find((item) => item.sport === this.selectedSport);
    const start = new Date(`${this.reservationDate}T${this.reservationStart || '00:00'}:00`);
    const end = new Date(`${this.reservationDate}T${this.reservationEnd || '00:00'}:00`);
    const duration = (end.getTime() - start.getTime()) / (60 * 60 * 1000);
    return !price || duration <= 0 ? 0 : price.pricePerHour * duration;
  }

  getCalendarDayName(day: Date) {
    const dayNames = ['Ned', 'Pon', 'Uto', 'Sre', 'Cet', 'Pet', 'Sub'];
    const dayOfMonth = String(day.getDate()).padStart(2, '0');
    const month = String(day.getMonth() + 1).padStart(2, '0');
    return `${dayNames[day.getDay()]} ${dayOfMonth}.${month}.`;
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
    const supportsRequested = this.activeResource?.sportPrices.some(
      (price) => price.sport === this.requestedSport
    );
    this.selectedSport = supportsRequested
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
    if (this.facility.workingHours.length === 0) {
      this.calendarHours = [];
      return;
    }

    const openingTimes = this.facility.workingHours.map((item) => this.timeToMinutes(item.from));
    const closingTimes = this.facility.workingHours.map((item) => this.timeToMinutes(item.to));
    const firstHour = Math.floor(Math.min(...openingTimes) / 60);
    const lastHour = Math.ceil(Math.max(...closingTimes) / 60);
    this.calendarHours = [];

    for (let hour = firstHour; hour < lastHour; hour++) {
      const hourIsAvailable = this.facility.workingHours.some(
        (item) =>
          hour * 60 >= this.timeToMinutes(item.from) &&
          hour * 60 + 60 <= this.timeToMinutes(item.to)
      );

      if (hourIsAvailable) {
        this.calendarHours.push(hour);
      }
    }
  }

  private getMonday(date: Date) {
    const result = new Date(date);
    const day = result.getDay();
    result.setDate(result.getDate() + (day === 0 ? -6 : 1 - day));
    result.setHours(0, 0, 0, 0);
    return result;
  }

  private formatInputDate(date: Date) {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }

  private formatHour(hour: number) {
    return `${String(hour).padStart(2, '0')}:00`;
  }

  private timeToMinutes(time: string) {
    const parts = time.split(':');
    return Number(parts[0]) * 60 + Number(parts[1]);
  }
}
