import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { AthleteStatistics as AthleteStatisticsData } from '../../../models/reservation';
import { ReservationService } from '../../../services/reservation';
import { UserService } from '../../../services/user';

Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip
);

@Component({
  selector: 'app-athlete-statistics',
  templateUrl: './athlete-statistics.html',
})
export class AthleteStatistics implements OnInit, AfterViewInit, OnDestroy {
  private reservationService = inject(ReservationService);
  private userService = inject(UserService);

  @ViewChild('sportChart') sportChartElement!: ElementRef<HTMLCanvasElement>;
  @ViewChild('monthChart') monthChartElement!: ElementRef<HTMLCanvasElement>;

  statistics = new AthleteStatisticsData();
  message = '';
  private viewReady = false;
  private dataReady = false;
  private sportChart: Chart | null = null;
  private monthChart: Chart | null = null;

  ngOnInit() {
    const user = this.userService.getLoggedUser();

    if (!user) {
      return;
    }

    this.reservationService.getStatistics(user.username).subscribe({
      next: (statistics) => {
        this.statistics = statistics;
        this.dataReady = true;
        this.drawCharts();
      },
      error: (error) => {
        this.message = error.error?.message || 'Statistiku nije moguce ucitati.';
      },
    });
  }

  ngAfterViewInit() {
    this.viewReady = true;
    this.drawCharts();
  }

  ngOnDestroy() {
    this.sportChart?.destroy();
    this.monthChart?.destroy();
  }

  private drawCharts() {
    if (!this.viewReady || !this.dataReady) {
      return;
    }

    this.sportChart?.destroy();
    this.monthChart?.destroy();

    const sports = [
      ...new Set([
        ...this.statistics.playedBySport.map((item) => item.label),
        ...this.statistics.reservedBySport.map((item) => item.label),
      ]),
    ].sort();

    this.sportChart = new Chart(this.sportChartElement.nativeElement, {
      type: 'bar',
      data: {
        labels: sports,
        datasets: [
          {
            label: 'Odigrane rezervacije',
            data: sports.map(
              (sport) =>
                this.statistics.playedBySport.find((item) => item.label === sport)?.value || 0
            ),
            backgroundColor: '#176b87',
          },
          {
            label: 'Rezervisani termini',
            data: sports.map(
              (sport) =>
                this.statistics.reservedBySport.find((item) => item.label === sport)?.value || 0
            ),
            backgroundColor: '#64ccc5',
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          x: { title: { display: true, text: 'Sport' } },
          y: {
            beginAtZero: true,
            ticks: { precision: 0 },
            title: { display: true, text: 'Broj rezervacija' },
          },
        },
      },
    });

    this.monthChart = new Chart(this.monthChartElement.nativeElement, {
      type: 'line',
      data: {
        labels: this.statistics.reservationsByMonth.map((item) => item.label),
        datasets: [
          {
            label: 'Neotkazane rezervacije',
            data: this.statistics.reservationsByMonth.map((item) => item.value),
            borderColor: '#176b87',
            backgroundColor: '#176b87',
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          x: { title: { display: true, text: 'Mesec' } },
          y: {
            beginAtZero: true,
            ticks: { precision: 0 },
            title: { display: true, text: 'Broj rezervacija' },
          },
        },
      },
    });
  }
}
