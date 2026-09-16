import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './components/shared/header/header';
import { Footer } from './components/shared/footer/footer';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer],
  templateUrl: './app.html',
})
export class App {}
