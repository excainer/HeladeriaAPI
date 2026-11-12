import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Personal } from './personal';

describe('Personal', () => {
  it('muestra la navegación del personal', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const f = TestBed.createComponent(Personal);
    await f.whenStable();
    const textos = Array.from<HTMLElement>(f.nativeElement.querySelectorAll('nav a')).map((a) => a.textContent!.trim());
    expect(textos).toEqual(['Cocina', 'Pedidos', 'Resumen', 'Productos', 'Categorías', 'Tamaños', 'Mesas']);
  });
});
