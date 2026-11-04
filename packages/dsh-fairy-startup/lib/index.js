import { createFairyDiagnostics } from './diagnostics.js';

export const name = 'dsh-fairy-startup';
const diagnostics = createFairyDiagnostics(name);

export function apply() {
  return diagnostics.guard('apply', () => undefined, { surface: 'host' });
}
