import { state } from '../state';
import { cancelPick } from './pick-flow';
import { deactivate } from '../lifecycle';

export function onKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    if (state.pickMode) {
      cancelPick();
    } else {
      deactivate();
    }
  }
}
