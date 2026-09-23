import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Facility } from '../../../models/facility';
import { FacilityService } from '../../../services/facility';
import { ReportService } from '../../../services/report';
import { UserService } from '../../../services/user';

@Component({
  selector: 'app-employee-reports',
  imports: [FormsModule],
  templateUrl: './employee-reports.html',
})
export class EmployeeReports implements OnInit {
  private facilityService = inject(FacilityService);
  private reportService = inject(ReportService);
  private userService = inject(UserService);

  facilities: Facility[] = [];
  facilityId = '';
  month = '';
  message = '';

  ngOnInit() {
    const user = this.userService.getLoggedUser();

    if (!user) {
      return;
    }

    this.facilityService.getEmployeeFacilities(user.username).subscribe({
      next: (facilities) => {
        this.facilities = facilities.filter((facility) => facility.status === 'active');
        this.facilityId = this.facilities[0]?._id || '';
      },
      error: (error) => {
        this.message = error.error?.message || 'Objekte nije moguce ucitati.';
      },
    });
  }

  downloadOccupancy() {
    const user = this.userService.getLoggedUser();

    if (!user || !this.facilityId || !this.month) {
      this.message = 'Izaberite objekat i mesec.';
      return;
    }

    this.reportService.getOccupancyReport(this.facilityId, user.username, this.month).subscribe({
      next: (file) => this.downloadFile(file, `popunjenost-${this.month}.pdf`),
      error: () => {
        this.message = 'Izvestaj o popunjenosti nije moguce generisati.';
      },
    });
  }

  downloadSales() {
    const user = this.userService.getLoggedUser();

    if (!user || !this.facilityId || !this.month) {
      this.message = 'Izaberite objekat i mesec.';
      return;
    }

    this.reportService.getSalesReport(this.facilityId, user.username, this.month).subscribe({
      next: (file) => this.downloadFile(file, `promet-${this.month}.pdf`),
      error: () => {
        this.message = 'Izvestaj o prometu nije moguce generisati.';
      },
    });
  }

  private downloadFile(file: Blob, filename: string) {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    this.message = 'PDF izvestaj je generisan.';
  }
}
