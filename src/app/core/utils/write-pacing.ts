import { HttpErrorResponse } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';

export const WRITE_GAP_MS = 150;

export function pause(ms: number = WRITE_GAP_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isConnectionLost(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 0;
}

export interface PacedWriteOutcome<T> {
  done: T[];
  failed: T[];
  aborted: boolean;
}

export async function runPacedWrites<T, R>(
  items: readonly T[],
  write: (item: T) => Observable<R>,
): Promise<PacedWriteOutcome<T>> {
  const outcome: PacedWriteOutcome<T> = { done: [], failed: [], aborted: false };

  for (const [index, item] of items.entries()) {
    if (index) await pause();
    try {
      await firstValueFrom(write(item));
      outcome.done.push(item);
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        outcome.done.push(item);
      } else if (isConnectionLost(error)) {
        outcome.aborted = true;
        break;
      } else {
        outcome.failed.push(item);
      }
    }
  }

  return outcome;
}
