import { LitElement, html, css, nothing } from 'lit';
import { state } from 'lit/decorators.js';
import { define } from '@erplora/outfitkit/define';
import '@erplora/outfitkit/ok-inline-feedback';
import '@erplora/outfitkit/ok-empty-state';
// Catálogo i18n del módulo (ADR-0055): esbuild inlinea estos JSON en el `dist` del WC. Los textos
// internos se resuelven con `erplora.t(CATALOG, 'ui.clave')` (idioma activo, fallback locale→en→clave).
import esLocale from '../../../locales/es.json';
import enLocale from '../../../locales/en.json';
const CATALOG: Record<string, unknown> = { es: esLocale, en: enLocale };

// erp-tables-canvas — editor visual del PLANO DE SALA (la "estructura de la terraza"). Pantalla
// completa del módulo `tables` (entrada de navegación `floor_plan`). Pinta las mesas como cajas
// posicionadas sobre un lienzo, con pestañas por ZONA. Permite:
//   · crear zona / crear mesa,
//   · ARRASTRAR una mesa para recolocarla (persiste con `tables.tables.move`),
//   · CLIC en una mesa para editarla (número/nombre/aforo/forma/estado) o borrarla,
//   · renombrar / borrar la zona activa.
// Distingue clic de arrastre por el desplazamiento del puntero. Tier 0 puro: toda la lógica vive en
// commands declarativos; el WC solo orquesta UI + drag. Lee el cliente de `globalThis.erplora`.

interface Zone { id: string; name: string; color?: string; sort_order?: number; is_active?: number; description?: string; }
interface Table {
  id: string; number: string; name: string; capacity: number; shape: string; status: string;
  is_active: number; zone_id: string | null; position_x: number; position_y: number; width: number; height: number;
  // tables#12: la retención viva de la mesa, servida por `tables.tables.list`. La leyenda
  // «Reservada» existía desde el principio pero nunca se alcanzaba porque nadie escribía el estado;
  // ahora que se pinta, el plano dice además DE QUIÉN es y a qué hora.
  reserved_for?: string | null;
  reserved_from?: string | null;
  reserved_until?: string | null;
  reserved_party_size?: number | null;
}

/** `2026-08-07T21:00:00+00:00` → `21:00`, en la hora del dispositivo: la sala mira el reloj de
 *  pared, y una fecha ISO entera no cabe sobre una mesa del plano. */
function hhmm(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

interface ErploraLike {
  query<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T>;
  /** TODAS las filas (sin tope). Para lo que no es «una página»: la rejilla del TPV, un
   *  `<ion-select>` de categorías… El viejo `page_size` NO existía y truncaba a 50. */
  queryAll<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T[]>;
  command<T = unknown>(name: string, payload?: Record<string, unknown>): Promise<T>;
  on?(event: string, cb: (payload: unknown) => void): () => void;
  /** i18n del módulo (ADR-0055): idioma activo + traducción del catálogo `ui`. */
  locale: string;
  t(catalog: Record<string, unknown>, key: string, params?: Record<string, unknown>): string;
}

const BOX = 72; // tamaño de la caja de mesa en px (se persiste como width/height)
const DRAG_THRESHOLD = 5; // px: por debajo se considera CLIC (editar), por encima ARRASTRE (mover)
const SHAPES = ['square', 'round', 'rectangle'];
const STATUSES = ['available', 'occupied', 'reserved', 'blocked'];
// enum → clave i18n (el `value=` del enum NO se traduce; sí su etiqueta visible).
const STATUS_KEY: Record<string, string> = {
  available: 'ui.statusAvailable', occupied: 'ui.statusOccupied', reserved: 'ui.statusReserved', blocked: 'ui.statusBlocked',
};
const SHAPE_KEY: Record<string, string> = { square: 'ui.shapeSquare', round: 'ui.shapeRound', rectangle: 'ui.shapeRectangle' };
const STATUS_COLOR: Record<string, string> = {
  available: '#2f9e44', occupied: '#d9480f', reserved: '#f08c00', blocked: '#868e96',
};

function erplora(): ErploraLike {
  const c = (globalThis as { erplora?: ErploraLike }).erplora;
  if (!c) throw new Error('erplora SDK no inicializado por el shell');
  return c;
}

function rows<T>(r: unknown): T[] {
  if (Array.isArray(r)) return r as T[];
  if (r && typeof r === 'object' && Array.isArray((r as { rows?: T[] }).rows)) return (r as { rows: T[] }).rows;
  return [];
}

// #271 — las mesas de un blueprint/seed llegan SIN posición (0,0) y colapsaban en la esquina
// superior izquierda, apiladas. Las creadas a mano (`addTable`) sí calculaban un offset en cascada;
// las importadas no. Esto reparte en un grid las mesas cuyo (x,y) es (0,0) (sin pisar a las que
// ya tienen coords reales) para que el plano se vea usable nada más cargar. El usuario luego las
// arrastra y persiste la posición final con `tables.tables.move`.
const AUTO_GAP = 16;       // px de margen entre celdas
const AUTO_CELL = BOX + AUTO_GAP; // paso del grid (una mesa por celda)
const AUTO_COLS = 4;       // nº de columnas del grid de fallback

/** `true` si la mesa no tiene una posición real (0,0 = default del Number(m)||0 en reload). */
function sinCoordenadas(t: Table): boolean {
  return !t.position_x && !t.position_y;
}

/** Reparte las mesas sin coords sobre un grid, respetando las que ya tienen posición. */
function autoLayoutTables(tables: Table[]): Table[] {
  // Primero recoge las posiciones ya ocupadas por mesas con coords reales (para no pisarlas).
  const ocupadas = new Set(tables.filter((t) => !sinCoordenadas(t)).map((t) => `${t.position_x},${t.position_y}`));
  let col = 0;
  let row = 0;
  const out: Table[] = [];
  for (const t of tables) {
    if (!sinCoordenadas(t)) {
      out.push(t);
      continue;
    }
    // Busca la próxima celda libre (saltando las ocupadas por mesas con coords reales).
    let x = AUTO_GAP + col * AUTO_CELL;
    let y = AUTO_GAP + row * AUTO_CELL;
    while (ocupadas.has(`${x},${y}`)) {
      col++;
      if (col >= AUTO_COLS) { col = 0; row++; }
      x = AUTO_GAP + col * AUTO_CELL;
      y = AUTO_GAP + row * AUTO_CELL;
    }
    ocupadas.add(`${x},${y}`);
    out.push({ ...t, position_x: x, position_y: y });
    col++;
    if (col >= AUTO_COLS) { col = 0; row++; }
  }
  return out;
}

export class ErpTablesCanvas extends LitElement {
  static styles = css`
    :host { display:block; font-family: system-ui, sans-serif; color: var(--ion-text-color,#1c1b18); }
    header { display:flex; gap:.5rem; align-items:center; flex-wrap:wrap; margin-bottom:.6rem; }
    h2 { margin:0; font-size:1.15rem; flex:1; }
    .newzone { display:flex; gap:.75rem; align-items:end; }
    .newzone ion-input { flex:1 1 11rem; min-width:9rem; }
    .zonebar { display:flex; gap:.5rem; align-items:center; margin-bottom:.6rem; }
    .zonebar ion-segment { flex:1; }
    .legend { display:flex; gap:.8rem; flex-wrap:wrap; margin:.2rem 0 .6rem; font-size:.75rem; color:#8b897f; }
    .legend span { display:inline-flex; align-items:center; gap:.3rem; }
    .dot { width:.7rem; height:.7rem; border-radius: var(--ok-radius-pill, 50%); display:inline-block; }
    .canvas { position:relative; height:60vh; min-height:22rem; border:1px dashed var(--ion-border-color,#cfcabd); border-radius: var(--ok-radius, 14px); background:
        repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(0,0,0,.04) 40px),
        repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(0,0,0,.04) 40px);
      overflow:hidden; touch-action:none; }
    .mesa { position:absolute; width:${BOX}px; height:${BOX}px; border:2px solid; border-radius: var(--ok-radius, 12px);
      display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:grab;
      background:var(--ion-background-color,#fff); user-select:none; box-shadow:0 1px 4px rgba(0,0,0,.12); }
    .mesa.round { border-radius: var(--ok-radius-pill, 50%); }
    .mesa.dragging { cursor:grabbing; opacity:.85; box-shadow:0 6px 18px rgba(0,0,0,.28); z-index:5; }
    .mesa .n { font-weight:700; font-size:1.05rem; }
    .mesa .c { font-size:.7rem; color:#8b897f; }
    /* Nombre y hora de la reserva. Es lo que convierte el color ambar en informacion util:
       sin esto el encargado ve «reservada» y no sabe si le da tiempo a sentar a alguien. */
    .mesa .hold { font-size:.62rem; color:var(--ion-color-warning,#f08c00); font-weight:600;
      max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .hint { color:#8b897f; font-size:.85rem; margin:.5rem 0 0; }
    .err { color:#d9480f; font-weight:600; }
    .empty { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:#8b897f; text-align:center; padding:1rem; }
    /* Sheet de edición (en el shadow → conserva estilos) */
    .scrim { position:fixed; inset:0; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; z-index:60; }
    .sheet { background:var(--ion-background-color,#fff); border-radius: var(--ok-radius-lg, 16px); padding:1rem; width:min(94vw,26rem); max-height:90vh; overflow:auto; box-shadow:0 12px 48px rgba(0,0,0,.35); }
    .sheet-h { display:flex; justify-content:space-between; align-items:center; margin-bottom:.8rem; }
    .sheet-h .t { font-size:1.2rem; font-weight:700; }
    .x { background:none; border:none; font-size:1.3rem; cursor:pointer; color:#8b897f; }
    .field { display:flex; flex-direction:column; gap:.25rem; margin-bottom:.7rem; }
    .field ion-input, .field ion-select { flex:1 1 11rem; min-width:9rem; }
    .row2 { display:grid; grid-template-columns:1fr 1fr; gap:.7rem; }
    .sheet-foot { display:flex; justify-content:space-between; gap:.5rem; margin-top:1rem; }
  `;

  @state() private zones: Zone[] = [];
  @state() private tables: Table[] = [];
  @state() private activeZone = '';
  @state() private newZoneName = '';
  @state() private error = '';
  @state() private loading = true;
  // Mesa en edición (copia editable; null = sheet cerrado). zoneEdit = sheet de zona.
  @state() private edit?: Table;
  @state() private zoneEdit?: Zone;
  @state() private saving = false;

  private unsub?: () => void;
  private dragId?: string;
  private dragDX = 0;
  private dragDY = 0;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragMoved = false;

  // Re-render al cambiar el idioma del shell (ADR-0055): los textos del template (legend, sheets,
  // tooltips…) se re-evalúan con el nuevo `erplora.locale`.
  private readonly onLocaleChange = (): void => this.requestUpdate();

  async connectedCallback() {
    super.connectedCallback();
    window.addEventListener('erplora:locale-changed', this.onLocaleChange);
    await this.reload();
    try {
      // Una suscripción por evento, con su literal EN la llamada (ADR-0127: el extractor
      // de contratos no sigue arrays; el nombre vive donde se usa).
      const offs = [
        erplora().on?.('tables.table.created', () => this.reload()),
        erplora().on?.('tables.table.updated', () => this.reload()),
        erplora().on?.('tables.table.deleted', () => this.reload()),
        erplora().on?.('tables.zone.created', () => this.reload()),
        erplora().on?.('tables.zone.updated', () => this.reload()),
        erplora().on?.('tables.zone.deleted', () => this.reload()),
      ].filter(Boolean) as Array<() => void>;
      this.unsub = () => offs.forEach((o) => o());
    } catch { /* preview sin SDK */ }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('erplora:locale-changed', this.onLocaleChange);
    this.unsub?.();
  }

  private async reload() {
    this.loading = true;
    try {
      const [z, t] = await Promise.all([
        erplora().queryAll('tables.zones.list', { sort: 'sort_order', dir: 'asc' }).catch(() => []),
        erplora().queryAll('tables.tables.list', { sort: 'number', dir: 'asc' }).catch(() => []),
      ]);
      this.zones = rows<Zone>(z);
      this.tables = autoLayoutTables(rows<Table>(t).map((m) => ({
        ...m,
        capacity: Number(m.capacity) || 1,
        is_active: Number(m.is_active),
        position_x: Number(m.position_x) || 0,
        position_y: Number(m.position_y) || 0,
        width: Number(m.width) || BOX,
        height: Number(m.height) || BOX,
      })));
      if (!this.activeZone || !this.zones.some((zo) => zo.id === this.activeZone)) {
        this.activeZone = this.zones[0]?.id ?? '';
      }
    } catch (e) {
      this.error = e instanceof Error ? e.message : erplora().t(CATALOG, 'ui.errLoadFloorPlan');
    } finally {
      this.loading = false;
    }
  }

  private get tablesInZone(): Table[] {
    if (!this.activeZone) return this.tables;
    return this.tables.filter((t) => t.zone_id === this.activeZone);
  }

  private get activeZoneObj(): Zone | undefined {
    return this.zones.find((z) => z.id === this.activeZone);
  }

  private canvasEl(): HTMLElement | null {
    return this.renderRoot.querySelector('.canvas');
  }

  // ── Drag + clic-para-editar (pointer events) ────────────────────────────────────────────────
  private onPointerDown(t: Table, e: PointerEvent) {
    const canvas = this.canvasEl();
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    this.dragId = t.id;
    this.dragDX = e.clientX - rect.left - t.position_x;
    this.dragDY = e.clientY - rect.top - t.position_y;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.dragMoved = false;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    e.preventDefault();
  }

  private onPointerMove(e: PointerEvent) {
    if (!this.dragId) return;
    if (Math.abs(e.clientX - this.dragStartX) > DRAG_THRESHOLD || Math.abs(e.clientY - this.dragStartY) > DRAG_THRESHOLD) {
      this.dragMoved = true;
    }
    const canvas = this.canvasEl();
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const maxX = Math.max(0, rect.width - BOX);
    const maxY = Math.max(0, rect.height - BOX);
    const x = Math.min(maxX, Math.max(0, e.clientX - rect.left - this.dragDX));
    const y = Math.min(maxY, Math.max(0, e.clientY - rect.top - this.dragDY));
    this.tables = this.tables.map((t) => (t.id === this.dragId ? { ...t, position_x: x, position_y: y } : t));
  }

  private async onPointerUp() {
    const id = this.dragId;
    this.dragId = undefined;
    if (!id) return;
    const t = this.tables.find((m) => m.id === id);
    if (!t) return;
    if (!this.dragMoved) {
      // Fue un clic (no arrastre): abrir el editor de la mesa.
      this.edit = { ...t };
      return;
    }
    try {
      await erplora().command('tables.tables.move', {
        table_id: t.id,
        position_x: Math.round(t.position_x),
        position_y: Math.round(t.position_y),
        width: BOX,
        height: BOX,
      });
    } catch (e) {
      this.error = e instanceof Error ? e.message : erplora().t(CATALOG, 'ui.errSavePosition');
    }
  }

  // ── Altas ───────────────────────────────────────────────────────────────────────────────────
  private async addTable() {
    this.error = '';
    const next = this.tablesInZone.length + 1;
    try {
      await erplora().command('tables.tables.create', {
        zone_id: this.activeZone || null,
        number: String(next),
        name: '',
        capacity: 4,
        position_x: 20 + ((next * 16) % 200),
        position_y: 20 + ((next * 12) % 160),
        width: BOX,
        height: BOX,
        shape: 'square',
      });
      await this.reload();
    } catch (e) {
      this.error = e instanceof Error ? e.message : erplora().t(CATALOG, 'ui.errCreateTable');
    }
  }

  private async addZone() {
    const name = this.newZoneName.trim();
    if (!name) return;
    this.error = '';
    try {
      await erplora().command('tables.zones.create', {
        name, description: '', color: 'primary', sort_order: this.zones.length,
      });
      this.newZoneName = '';
      await this.reload();
      const created = this.zones.find((z) => z.name === name);
      if (created) this.activeZone = created.id;
    } catch (e) {
      this.error = e instanceof Error ? e.message : erplora().t(CATALOG, 'ui.errCreateZone');
    }
  }

  // ── Edición / borrado de mesa ────────────────────────────────────────────────────────────────
  private patchEdit(p: Partial<Table>) { if (this.edit) this.edit = { ...this.edit, ...p }; }

  private async saveTable() {
    if (!this.edit) return;
    const t = this.edit;
    if (!String(t.number).trim()) { this.error = erplora().t(CATALOG, 'ui.errTableNumberRequired'); return; }
    this.saving = true; this.error = '';
    try {
      await erplora().command('tables.tables.update', {
        table_id: t.id,
        number: String(t.number).trim(),
        name: t.name ?? '',
        capacity: Math.max(1, Number(t.capacity) || 1),
        zone_id: t.zone_id ?? null,
        shape: t.shape,
        status: t.status,
        is_active: Number(t.is_active) ? 1 : 0,
      });
      this.edit = undefined;
      await this.reload();
    } catch (e) {
      this.error = e instanceof Error ? e.message : erplora().t(CATALOG, 'ui.errSaveTable');
    } finally {
      this.saving = false;
    }
  }

  private async deleteTable() {
    if (!this.edit) return;
    this.saving = true; this.error = '';
    try {
      await erplora().command('tables.tables.delete', { table_id: this.edit.id });
      this.edit = undefined;
      await this.reload();
    } catch (e) {
      this.error = e instanceof Error ? e.message : erplora().t(CATALOG, 'ui.errDeleteTable');
    } finally {
      this.saving = false;
    }
  }

  // ── Edición / borrado de zona ────────────────────────────────────────────────────────────────
  private async openZoneEdit() {
    const z = this.activeZoneObj;
    if (!z) return;
    this.error = '';
    try {
      // zones.get trae description (la lista no la incluye) para no perderla al actualizar.
      const full = await erplora().query<Zone | Zone[]>('tables.zones.get', { zone_id: z.id });
      const zo = Array.isArray(full) ? full[0] : full;
      this.zoneEdit = { ...z, ...(zo || {}) };
    } catch {
      this.zoneEdit = { ...z };
    }
  }

  private async saveZone() {
    if (!this.zoneEdit) return;
    const z = this.zoneEdit;
    if (!z.name.trim()) { this.error = erplora().t(CATALOG, 'ui.errZoneNameRequired'); return; }
    this.saving = true; this.error = '';
    try {
      await erplora().command('tables.zones.update', {
        zone_id: z.id,
        name: z.name.trim(),
        description: z.description ?? '',
        color: z.color ?? 'primary',
        sort_order: Number(z.sort_order) || 0,
        is_active: Number(z.is_active) ? 1 : 0,
      });
      this.zoneEdit = undefined;
      await this.reload();
    } catch (e) {
      this.error = e instanceof Error ? e.message : erplora().t(CATALOG, 'ui.errSaveZone');
    } finally {
      this.saving = false;
    }
  }

  private async deleteZone() {
    if (!this.zoneEdit) return;
    this.saving = true; this.error = '';
    try {
      await erplora().command('tables.zones.delete', { zone_id: this.zoneEdit.id });
      this.zoneEdit = undefined;
      this.activeZone = '';
      await this.reload();
    } catch (e) {
      // El WASM rechaza si la zona tiene mesas activas (tables_attached).
      this.error = e instanceof Error ? e.message : erplora().t(CATALOG, 'ui.errDeleteZone');
    } finally {
      this.saving = false;
    }
  }

  render() {
    const t = (k: string, params?: Record<string, unknown>): string => erplora().t(CATALOG, k, params);
    return html`
      <header>
        <h2>${t('ui.floorPlan')}</h2>
        <div class="newzone">
          <ion-input fill="outline" label-placement="floating" label=${t('ui.colZone')} placeholder=${t('ui.newZonePlaceholder')} .value=${this.newZoneName}
            @ionInput=${(e: CustomEvent) => { this.newZoneName = (e.target as HTMLInputElement).value || ''; }}></ion-input>
          <ion-button size="small" fill="outline" ?disabled=${!this.newZoneName.trim()} @click=${() => this.addZone()}>${t('ui.addZone')}</ion-button>
        </div>
        <ion-button size="small" ?disabled=${!this.zones.length} @click=${() => this.addTable()}>${t('ui.addTable')}</ion-button>
      </header>

      ${this.error ? html`<ok-inline-feedback tone="danger" icon="alert-circle-outline">${this.error}</ok-inline-feedback>` : nothing}

      ${this.zones.length
        ? html`<div class="zonebar">
            <ion-segment scrollable value=${this.activeZone}
              @ionChange=${(e: CustomEvent) => { this.activeZone = (e.detail as { value: string }).value; }}>
              ${this.zones.map((z) => html`<ion-segment-button value=${z.id}><ion-label>${z.name}</ion-label></ion-segment-button>`)}
            </ion-segment>
            <ion-button size="small" fill="clear" ?disabled=${!this.activeZoneObj} @click=${() => this.openZoneEdit()}>${t('ui.editZone')}</ion-button>
          </div>`
        : nothing}

      <div class="legend">
        ${STATUSES.map((s) => html`<span><i class="dot" style=${`background:${STATUS_COLOR[s]}`}></i>${t(STATUS_KEY[s] ?? s)}</span>`)}
      </div>

      <div class="canvas"
        @pointermove=${(e: PointerEvent) => this.onPointerMove(e)}
        @pointerup=${() => this.onPointerUp()}
        @pointercancel=${() => this.onPointerUp()}>
        ${this.tablesInZone.map((tb) => html`
          <div class=${`mesa ${tb.shape === 'round' ? 'round' : ''} ${tb.id === this.dragId && this.dragMoved ? 'dragging' : ''}`}
            style=${`left:${tb.position_x}px; top:${tb.position_y}px; border-color:${STATUS_COLOR[tb.status] ?? '#d9d6cf'}`}
            title=${[
              t('ui.tableTooltip', { status: STATUS_KEY[tb.status] ? t(STATUS_KEY[tb.status]) : tb.status, count: tb.capacity }),
              tb.reserved_for
                ? `${t('ui.reservedFor', { name: tb.reserved_for })} ${[hhmm(tb.reserved_from), hhmm(tb.reserved_until)].filter(Boolean).join('–')}`.trim()
                : '',
            ].filter(Boolean).join(' · ')}
            @pointerdown=${(e: PointerEvent) => this.onPointerDown(tb, e)}>
            <div class="n">${tb.number}</div>
            <div class="c">${t('ui.paxCount', { count: tb.capacity })}</div>
            ${tb.reserved_for
              ? html`<div class="hold">${tb.reserved_for}${tb.reserved_from ? ` · ${hhmm(tb.reserved_from)}` : ''}</div>`
              : nothing}
          </div>`)}
        ${!this.loading && !this.zones.length ? html`<ok-empty-state icon="grid-outline" message=${t('ui.createZoneToStart')}></ok-empty-state>` : nothing}
        ${!this.loading && this.zones.length && !this.tablesInZone.length ? html`<ok-empty-state icon="square-outline" message=${t('ui.noTablesInZonePrompt')}></ok-empty-state>` : nothing}
        ${this.loading ? html`<div class="empty">${t('ui.loading')}</div>` : nothing}
      </div>
      <p class="hint">${t('ui.canvasHint')}</p>

      ${this.edit ? this.renderTableSheet(this.edit) : nothing}
      ${this.zoneEdit ? this.renderZoneSheet(this.zoneEdit) : nothing}
    `;
  }

  private renderTableSheet(table: Table) {
    const t = (k: string, params?: Record<string, unknown>): string => erplora().t(CATALOG, k, params);
    return html`<div class="scrim" @click=${(e: Event) => { if ((e.target as HTMLElement).classList.contains('scrim')) this.edit = undefined; }}>
      <div class="sheet">
        <div class="sheet-h">
          <span class="t">${t('ui.editTable')}</span>
          <button class="x" @click=${() => { this.edit = undefined; }}>✕</button>
        </div>
        <div class="row2">
          <div class="field">
            <ion-input fill="outline" label-placement="floating" label=${t('ui.fieldNumber')} .value=${table.number} @ionInput=${(e: CustomEvent) => this.patchEdit({ number: (e.target as HTMLInputElement).value || '' })}></ion-input></div>
          <div class="field">
            <ion-input fill="outline" label-placement="floating" label=${t('ui.fieldCapacity')} type="number" min="1" .value=${String(table.capacity)} @ionInput=${(e: CustomEvent) => this.patchEdit({ capacity: Number((e.target as HTMLInputElement).value) || 1 })}></ion-input></div>
        </div>
        <div class="field">
          <ion-input fill="outline" label-placement="floating" label=${t('ui.fieldNameOptional')} .value=${table.name} @ionInput=${(e: CustomEvent) => this.patchEdit({ name: (e.target as HTMLInputElement).value || '' })}></ion-input></div>
        <div class="row2">
          <div class="field">
            <ion-select fill="outline" label-placement="floating" label=${t('ui.fieldShape')} .value=${table.shape} interface="popover" @ionChange=${(e: CustomEvent) => this.patchEdit({ shape: (e.detail as { value: string }).value })}>
              ${SHAPES.map((s) => html`<ion-select-option value=${s}>${t(SHAPE_KEY[s] ?? s)}</ion-select-option>`)}
            </ion-select></div>
          <div class="field">
            <ion-select fill="outline" label-placement="floating" label=${t('ui.fieldStatus')} .value=${table.status} interface="popover" @ionChange=${(e: CustomEvent) => this.patchEdit({ status: (e.detail as { value: string }).value })}>
              ${STATUSES.map((s) => html`<ion-select-option value=${s}>${t(STATUS_KEY[s] ?? s)}</ion-select-option>`)}
            </ion-select></div>
        </div>
        <div class="field">
          <ion-select fill="outline" label-placement="floating" label=${t('ui.fieldZone')} .value=${table.zone_id ?? ''} interface="popover" @ionChange=${(e: CustomEvent) => this.patchEdit({ zone_id: (e.detail as { value: string }).value || null })}>
            <ion-select-option value="">${t('ui.noZone')}</ion-select-option>
            ${this.zones.map((z) => html`<ion-select-option value=${z.id}>${z.name}</ion-select-option>`)}
          </ion-select></div>
        <div class="sheet-foot">
          <ion-button color="danger" fill="outline" size="small" ?disabled=${this.saving} @click=${() => this.deleteTable()}>${t('ui.delete')}</ion-button>
          <ion-button ?disabled=${this.saving} @click=${() => this.saveTable()}>${this.saving ? t('ui.saving') : t('ui.save')}</ion-button>
        </div>
      </div>
    </div>`;
  }

  private renderZoneSheet(z: Zone) {
    const t = (k: string, params?: Record<string, unknown>): string => erplora().t(CATALOG, k, params);
    return html`<div class="scrim" @click=${(e: Event) => { if ((e.target as HTMLElement).classList.contains('scrim')) this.zoneEdit = undefined; }}>
      <div class="sheet">
        <div class="sheet-h">
          <span class="t">${t('ui.editZone')}</span>
          <button class="x" @click=${() => { this.zoneEdit = undefined; }}>✕</button>
        </div>
        <div class="field">
          <ion-input fill="outline" label-placement="floating" label=${t('ui.colName')} .value=${z.name} @ionInput=${(e: CustomEvent) => { this.zoneEdit = { ...z, name: (e.target as HTMLInputElement).value || '' }; }}></ion-input></div>
        <div class="field">
          <ion-input fill="outline" label-placement="floating" label=${t('ui.fieldDescriptionOptional')} .value=${z.description ?? ''} @ionInput=${(e: CustomEvent) => { this.zoneEdit = { ...z, description: (e.target as HTMLInputElement).value || '' }; }}></ion-input></div>
        <div class="sheet-foot">
          <ion-button color="danger" fill="outline" size="small" ?disabled=${this.saving} @click=${() => this.deleteZone()}>${t('ui.deleteZone')}</ion-button>
          <ion-button ?disabled=${this.saving} @click=${() => this.saveZone()}>${this.saving ? t('ui.saving') : t('ui.save')}</ion-button>
        </div>
      </div>
    </div>`;
  }
}

define('erp-tables-canvas', ErpTablesCanvas);

declare global {
  interface HTMLElementTagNameMap {
    'erp-tables-canvas': ErpTablesCanvas;
  }
}
