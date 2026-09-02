// tables#66 — permission checks of this module's screens, in ONE place.
//
// UI VISIBILITY ONLY. The runtime re-validates the permission of every command and query it
// serves, so this is about not offering a button that can only answer 403 — never about security.
// That is also why the fallback is PERMISSIVE: a shell that predates `hasPermission` would blank
// out every screen if the default were deny, and it would gain nothing, because the door that
// actually enforces is the dispatcher.

interface ShellLike {
  hasPermission?: (permission: string) => boolean;
}

/** Whether the current user holds `permission`, as far as the shell knows. */
export function can(permission: string): boolean {
  const shell = (globalThis as { erplora?: ShellLike }).erplora;
  return typeof shell?.hasPermission === 'function' ? shell.hasPermission(permission) : true;
}
