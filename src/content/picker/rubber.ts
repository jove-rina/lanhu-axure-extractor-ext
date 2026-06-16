import { state } from '../state';
export function createRubber() {
  if (document.getElementById('__lh_r')) return;
  state.rubber = document.createElement('div');
  state.rubber.id = '__lh_r';
  Object.assign(state.rubber.style, {
    position: 'fixed', zIndex: '2147483645', pointerEvents: 'none',
    border: '2px dashed #f08c00', background: 'rgba(240,140,0,0.06)',
    borderRadius: '4px', display: 'none',
  });
  document.body.appendChild(state.rubber);
}

export function removeRubber() { if (state.rubber) { state.rubber.remove(); state.rubber = null; } }

export function updateRubber(x1: number, y1: number, x2: number, y2: number): void {
  if (!state.rubber) return;
  const l = Math.min(x1, x2), t = Math.min(y1, y2);
  state.rubber.style.display = 'block';
  state.rubber.style.left = l + 'px';
  state.rubber.style.top = t + 'px';
  state.rubber.style.width = Math.abs(x2 - x1) + 'px';
  state.rubber.style.height = Math.abs(y2 - y1) + 'px';
}
