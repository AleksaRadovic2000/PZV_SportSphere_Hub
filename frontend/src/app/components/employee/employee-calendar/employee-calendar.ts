import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Facility, FacilityResource } from '../../../models/facility';
import { Reservation } from '../../../models/reservation';
import { FacilityService } from '../../../services/facility';
import { ReservationService } from '../../../services/reservation';
import { TrainingService } from '../../../services/training';
import { UserService } from '../../../services/user';

import { getSerbianLabel } from '../../../shared/serbian-label';

@Component({
  selector: 'app-employee-calendar',
  imports: [FormsModule],
  templateUrl: './employee-calendar.html',
})
export class EmployeeCalendar implements OnInit {
  label = getSerbianLabel;
  private facilityService = inject(FacilityService);
  private reservationService = inject(ReservationService);
  private trainingService = inject(TrainingService);
  private userService = inject(UserService);

  facilities: Facility[] = [];
  resources: FacilityResource[] = [];
  schedule: Reservation[] = [];
  facilityId = '';
  resourceId = '';
  weekStart = this.getMonday(new Date());
  calendarDays: Date[] = [];
  calendarHours: number[] = [];
  draggedItem: Reservation | null = null;
  message = '';
  success = false;

  ngOnInit() {
    this.updateCalendarDays();
    const user = this.userService.getLoggedUser();

    if (!user) {
      return;
    }

    this.facilityService.getEmployeeFacilities(user.username).subscribe({
      next: (facilities) => {
        this.facilities = facilities.filter((facility) => facility.status === 'active');

        if (this.facilities.length > 0) {
          this.facilityId = this.facilities[0]._id;
          this.facilityChanged();
        }
      },
      error: (error) => {
        this.message = error.error?.message || 'Objekte nije moguce ucitati.';
      },
    });
  }

  get selectedFacility() {
    return this.facilities.find((facility) => facility._id === this.facilityId);
  }

  get selectedResource() {
    return this.resources.find((resource) => resource._id === this.resourceId);
  }

  facilityChanged() {
    this.resources = this.selectedFacility?.resources || [];
    this.resourceId = this.resources[0]?._id || '';
    this.updateCalendarHours();
    this.loadSchedule();
  }

  loadSchedule() {
    if (!this.resourceId) {
      this.schedule = [];
      return;
    }

    const rangeEnd = new Date(this.weekStart);
    rangeEnd.setDate(rangeEnd.getDate() + 7);
    this.reservationService.getSchedule(this.resourceId, this.weekStart, rangeEnd).subscribe({
      next: (schedule) => {
        this.schedule = schedule;
      },
      error: (error) => {
        this.message = error.error?.message || 'Raspored nije moguce ucitati.';
        this.success = false;
      },
    });
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

  getSlotItems(day: Date, hour: number) {
    const slotStart = new Date(day);
    slotStart.setHours(hour, 0, 0, 0);
    const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
    return this.schedule.filter(
      (item) => new Date(item.startDateTime) < slotEnd && new Date(item.endDateTime) > slotStart
    );
  }

  canDrag(item: Reservation) {
    return (
      ['reservation', 'training'].includes(item.type) &&
      Boolean(this.selectedResource && ['indoor', 'hall'].includes(this.selectedResource.type))
    );
  }

  dragStart(item: Reservation) {
    this.draggedItem = this.canDrag(item) ? item : null;
  }

  allowDrop(event: DragEvent, day: Date, hour: number) {
    if (this.draggedItem && this.canDropItem(this.draggedItem, day, hour)) {
      event.preventDefault();
    }
  }

  drop(event: DragEvent, day: Date, hour: number) {
    event.preventDefault();
    const user = this.userService.getLoggedUser();
    const item = this.draggedItem;
    this.draggedItem = null;

    if (!user || !item || !this.canDropItem(item, day, hour)) {
      return;
    }

    const oldStart = new Date(item.startDateTime);
    const oldEnd = new Date(item.endDateTime);
    const duration = oldEnd.getTime() - oldStart.getTime();
    const newStart = new Date(day);
    newStart.setHours(hour, 0, 0, 0);
    const newEnd = new Date(newStart.getTime() + duration);

    if (item.type === 'training') {
      this.trainingService.moveTraining(item._id, user.username, newStart, newEnd).subscribe({
        next: (response) => {
          this.message = response.message;
          this.success = true;
          this.loadSchedule();
        },
        error: (error) => {
          this.message = error.error?.message || 'Pomeranje treninga nije uspelo.';
          this.success = false;
          this.loadSchedule();
        },
      });
      return;
    }

    this.reservationService.moveReservation(item._id, user.username, newStart, newEnd).subscribe({
      next: (response) => {
        this.message = response.message;
        this.success = true;
        this.loadSchedule();
      },
      error: (error) => {
        this.message = error.error?.message || 'Pomeranje rezervacije nije uspelo.';
        this.success = false;
        this.loadSchedule();
      },
    });
  }

  private canDropItem(item: Reservation, day: Date, hour: number) {
    const facility = this.selectedFacility;

    if (!facility) {
      return false;
    }

    const oldStart = new Date(item.startDateTime);
    const oldEnd = new Date(item.endDateTime);
    const duration = oldEnd.getTime() - oldStart.getTime();
    const newStart = new Date(day);
    newStart.setHours(hour, 0, 0, 0);
    const newEnd = new Date(newStart.getTime() + duration);

    if (duration <= 0 || newStart <= new Date()) {
      return false;
    }

    const javascriptDay = day.getDay();
    const dayNumber = javascriptDay === 0 ? 7 : javascriptDay;
    const workingHours = facility.workingHours.find((item) => item.day === dayNumber);

    if (!workingHours) {
      return false;
    }

    const startMinutes = hour * 60;
    const endMinutes = startMinutes + duration / (60 * 1000);

    if (
      startMinutes < this.timeToMinutes(workingHours.from) ||
      endMinutes > this.timeToMinutes(workingHours.to)
    ) {
      return false;
    }

    return !this.schedule.some(
      (scheduledItem) =>
        scheduledItem._id !== item._id &&
        new Date(scheduledItem.startDateTime) < newEnd &&
        new Date(scheduledItem.endDateTime) > newStart
    );
  }

  isUnavailable(day: Date, hour: number) {
    const facility = this.selectedFacility;

    if (!facility) {
      return true;
    }

    const slotStart = new Date(day);
    slotStart.setHours(hour, 0, 0, 0);

    if (slotStart <= new Date()) {
      return true;
    }

    const javascriptDay = day.getDay();
    const dayNumber = javascriptDay === 0 ? 7 : javascriptDay;
    const workingHours = facility.workingHours.find((item) => item.day === dayNumber);

    if (!workingHours) {
      return true;
    }

    const startMinutes = hour * 60;
    return (
      startMinutes < this.timeToMinutes(workingHours.from) ||
      startMinutes + 60 > this.timeToMinutes(workingHours.to)
    );
  }

  getItemClass(item: Reservation) {
    if (item.type === 'training') {
      return 'bg-warning text-white rounded p-2';
    }

    return 'bg-primary text-white rounded p-2';
  }

  getCalendarDayName(day: Date) {
    const names = ['Ned', 'Pon', 'Uto', 'Sre', 'Cet', 'Pet', 'Sub'];
    return `${names[day.getDay()]} ${String(day.getDate()).padStart(2, '0')}.${String(
      day.getMonth() + 1
    ).padStart(2, '0')}.`;
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
    const workingHours = this.selectedFacility?.workingHours || [];

    if (workingHours.length === 0) {
      this.calendarHours = [];
      return;
    }

    const firstHour = Math.floor(
      Math.min(...workingHours.map((item) => this.timeToMinutes(item.from))) / 60
    );
    const lastHour = Math.ceil(
      Math.max(...workingHours.map((item) => this.timeToMinutes(item.to))) / 60
    );
    this.calendarHours = [];

    for (let hour = firstHour; hour < lastHour; hour++) {
      this.calendarHours.push(hour);
    }
  }

  private getMonday(date: Date) {
    const result = new Date(date);
    const day = result.getDay();
    result.setDate(result.getDate() + (day === 0 ? -6 : 1 - day));
    result.setHours(0, 0, 0, 0);
    return result;
  }

  private timeToMinutes(time: string) {
    const parts = time.split(':');
    return Number(parts[0]) * 60 + Number(parts[1]);
  }
}
