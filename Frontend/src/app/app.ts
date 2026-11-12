import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SonidoService } from './core/services/sonido';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  constructor() {
    // Se crea al inicio para que el primer toque en cualquier pantalla habilite los sonidos.
    inject(SonidoService);
  }
}
