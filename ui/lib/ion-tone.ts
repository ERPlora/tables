// The colour of an `ion-button` inside an `ion-modal`, as INLINE custom properties read from the
// theme token (ERPlora/pm#392). `color="…"` cannot be used in a module: Ionic resolves it through a
// global `.ion-color-*` rule that does not reach inside a shadow root. And a `static styles` rule
// does not reach a modal either, because Ionic reparents an open `ion-modal` to <body>. Custom
// properties set on the element itself paint the same wherever the element ends up.

export type IonToneKind = 'solid';
export type IonTone = 'danger';

/** Ionic 8's default palette: the fallback when the theme does not define the token. */
const PALETTE: Record<IonTone, { base: string; contrast: string; shade: string; tint: string }> = {
  danger: { base: '#c5000f', contrast: '#fff', shade: '#ad000d', tint: '#cb1a27' },
};

/** The `style` value that paints a filled `ion-button` in `tone`: background, states and text. */
export function ionTone(_kind: IonToneKind, tone: IonTone): string {
  const p = PALETTE[tone];
  const token = (suffix: string, fallback: string) => `var(--ion-color-${tone}${suffix}, ${fallback})`;
  return [
    `--background: ${token('', p.base)}`,
    `--background-activated: ${token('-shade', p.shade)}`,
    `--background-focused: ${token('-shade', p.shade)}`,
    `--background-hover: ${token('-tint', p.tint)}`,
    `--color: ${token('-contrast', p.contrast)};`,
  ].join('; ');
}
