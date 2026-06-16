import { state } from '../state';

export function setStatus(msg: string): void {
  const s = document.getElementById('__lh_f_status');
  if (s) s.textContent = msg || '';
}

