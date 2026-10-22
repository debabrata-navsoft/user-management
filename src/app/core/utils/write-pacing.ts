import { HttpContext, HttpContextToken, HttpErrorResponse } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';

export const WRITE_GAP_MS = 150;

export const WRITE_RETRIES = 2;
export const RETRY_BACKOFF_MS = 700;

export const BATCHED_WRITE = new HttpContextToken<boolean>(() => false);

export const batchedWrite = (): HttpContext => new HttpContext().set(BATCHED_WRITE, true);

export const pause = (ms: number = WRITE_GAP_MS): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export interface PacedWriteOutcome<T> {
  done: T[];
  failed: T[];
  pending: T[];
  aborted: boolean;
}

type WriteResult = 'done' | 'failed' | 'lost';

async function attemptWrite<R>(write: () => Observable<R>): Promise<WriteResult> {
  for (let attempt = 0; ; attempt++) {
    try {
      await firstValueFrom(write());
      return 'done';
    } catch (error) {
      const status = error instanceof HttpErrorResponse ? error.status : -1;

      if (status === 404) return 'done';
      if (status !== 0) return 'failed';
      if (attempt >= WRITE_RETRIES) return 'lost';
      await pause(RETRY_BACKOFF_MS * (attempt + 1));
    }
  }
}

export async function runPacedWrites<T, R>(
  items: readonly T[],
  write: (item: T) => Observable<R>,
): Promise<PacedWriteOutcome<T>> {
  const outcome: PacedWriteOutcome<T> = { done: [], failed: [], pending: [], aborted: false };

  for (const [index, item] of items.entries()) {
    if (index) await pause();

    const result = await attemptWrite(() => write(item));
    if (result === 'lost') {
      outcome.aborted = true;
      outcome.pending.push(...items.slice(index));
      break;
    }

    outcome[result].push(item);
  }

  return outcome;
}
