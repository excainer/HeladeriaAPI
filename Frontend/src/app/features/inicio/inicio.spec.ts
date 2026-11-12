import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { Inicio } from './inicio';
import { errorInterceptor } from '../../core/interceptors/error';
import { MesaSesionService } from '../../core/services/mesa-sesion';

const mesas = [
  { mesaId: 2, numero: 2, estado: 'Disponible' },
  { mesaId: 1, numero: 1, estado: 'Disponible' },
];

describe('Inicio', () => {
  let http: HttpTestingController;

  function configurar(numero?: string) {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])), provideHttpClientTesting(), provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map(numero ? [['numero', numero]] : []) } } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  }

  it('muestra la portada y las mesas ordenadas', async () => {
    configurar();
    const f = TestBed.createComponent(Inicio);
    http.expectOne('/api/Mesas').flush(mesas);
    await f.whenStable();
    const el: HTMLElement = f.nativeElement;
    expect(el.querySelector('h1')!.textContent).toBe('HeladApp');
    expect(Array.from(el.querySelectorAll('.mesa__numero')).map((n) => n.textContent)).toEqual(['1', '2']);
  });

  it('al elegir una mesa la guarda y entra al menú', async () => {
    configurar();
    const f = TestBed.createComponent(Inicio);
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    http.expectOne('/api/Mesas').flush(mesas);
    await f.whenStable();
    (f.nativeElement.querySelectorAll('.mesa')[1] as HTMLButtonElement).click();
    expect(TestBed.inject(MesaSesionService).mesa()?.numero).toBe(2);
    expect(navegar).toHaveBeenCalledWith('/menu');
  });

  it('con enlace /mesa/:numero entra directo', async () => {
    configurar('2');
    const f = TestBed.createComponent(Inicio);
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    http.expectOne('/api/Mesas').flush(mesas);
    await f.whenStable();
    expect(TestBed.inject(MesaSesionService).mesa()?.numero).toBe(2);
    expect(navegar).toHaveBeenCalledWith('/menu');
  });

  it('con enlace de una mesa que no existe avisa y deja elegir', async () => {
    configurar('9');
    const f = TestBed.createComponent(Inicio);
    http.expectOne('/api/Mesas').flush(mesas);
    await f.whenStable();
    expect(f.nativeElement.querySelector('[role=alert]').textContent).toContain('No encontramos la mesa 9');
    expect(f.nativeElement.querySelectorAll('.mesa').length).toBe(2);
  });

  it('si el servidor no responde muestra el error y permite reintentar', async () => {
    configurar();
    const f = TestBed.createComponent(Inicio);
    http.expectOne('/api/Mesas').error(new ProgressEvent('error'));
    await f.whenStable();
    expect(f.nativeElement.querySelector('[role=alert]').textContent).toContain('No se pudo conectar');
    (f.nativeElement.querySelector('[role=alert] button') as HTMLButtonElement).click();
    http.expectOne('/api/Mesas').flush(mesas);
    await f.whenStable();
    expect(f.nativeElement.querySelectorAll('.mesa').length).toBe(2);
  });
});
