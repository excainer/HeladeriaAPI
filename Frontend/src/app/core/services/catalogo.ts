import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';
import { MesaService } from './mesa';
import { ProductoService } from './producto';
import { TamanoService } from './tamano';

/**
 * Nombres de productos, tamaños y números de mesa para mostrar en pedidos, que solo traen ids.
 * Se piden una vez y se reutilizan; `invalidar()` obliga a pedirlos de nuevo
 * (se llama cuando el personal edita el catálogo).
 */
@Injectable({
  providedIn: 'root',
})
export class CatalogoService {
  private readonly productoService = inject(ProductoService);
  private readonly mesaService = inject(MesaService);
  private readonly tamanoService = inject(TamanoService);

  private productos$?: Observable<Map<number, string>>;
  private mesas$?: Observable<Map<number, number>>;
  private tamanos$?: Observable<Map<number, string>>;

  get nombresProductos$(): Observable<Map<number, string>> {
    return (this.productos$ ??= this.productoService.obtenerTodos().pipe(
      map((lista) => new Map(lista.map((p) => [p.productoId, p.nombre] as const))),
      shareReplay({ bufferSize: 1, refCount: false }),
    ));
  }

  get numerosMesa$(): Observable<Map<number, number>> {
    return (this.mesas$ ??= this.mesaService.obtenerTodos().pipe(
      map((lista) => new Map(lista.map((m) => [m.mesaId, m.numero] as const))),
      shareReplay({ bufferSize: 1, refCount: false }),
    ));
  }

  get nombresTamanos$(): Observable<Map<number, string>> {
    return (this.tamanos$ ??= this.tamanoService.obtenerTodos().pipe(
      map((lista) => new Map(lista.map((t) => [t.tamanoId, t.nombre] as const))),
      shareReplay({ bufferSize: 1, refCount: false }),
    ));
  }

  invalidar() {
    this.productos$ = undefined;
    this.mesas$ = undefined;
    this.tamanos$ = undefined;
  }
}
