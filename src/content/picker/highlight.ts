import { state } from '../state';
export function createHoverHighlight() {
  if (document.getElementById('__lh_hh')) return;
  const h = document.createElement('div');
  h.id = '__lh_hh';
  Object.assign(h.style, {
    position: 'fixed', zIndex: '2147483646', pointerEvents: 'none',
    border: '1.5px solid #f08c00', background: 'rgba(240,140,0,0.08)',
    borderRadius: '3px', display: 'none',
  });
  document.body.appendChild(h);
  state.hoverHighlight = h;
}

export function removeHoverHighlight() {
  if (state.hoverHighlight) { state.hoverHighlight.remove(); state.hoverHighlight = null; }
}

export function highlightEl(el: Element): void {
  if (!state.hoverHighlight || !el) return;
  const r = el.getBoundingClientRect();
  state.hoverHighlight.style.display = 'block';
  state.hoverHighlight.style.left = r.left + 'px';
  state.hoverHighlight.style.top = r.top + 'px';
  state.hoverHighlight.style.width = r.width + 'px';
  state.hoverHighlight.style.height = r.height + 'px';
}

export function hideHighlight() {
  if (state.hoverHighlight) state.hoverHighlight.style.display = 'none';
}
