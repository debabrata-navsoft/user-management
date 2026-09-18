import { HttpContext, HttpContextToken, HttpErrorResponse } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';

export const WRITE_GAP_MS = 150;

/** Extra attempts after json-server drops a write, and the wait before each one. */
export const WRITE_RETRIES = 2;
export const RETRY_BACKOFF_MS = 700;

/**
 * Marks a request as part of a paced batch. Such a batch retries dropped writes and
 * reports its own outcome once, so the error interceptor must not raise a connection
 * toast per request — see `error.interceptor.ts`.
 */
export const BATCHED_WRITE = new HttpContextToken<boolean>(() => false);

export const batchedWrite = (): HttpContext => new HttpContext().set(BATCHED_WRITE, true);

export const pause = (ms: number = WRITE_GAP_MS): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export interface PacedWriteOutcome<T> {
  done: T[];
  failed: T[];
  /** Never attempted, because the connection was lost before their turn. */
  pending: T[];
  aborted: boolean;
}

type WriteResult = 'done' | 'failed' | 'lost';

/**
 * Runs a single write, retrying while json-server is unreachable. Rewriting the whole
 * multi-MB `db.json` can take long enough that it drops the next connection, which is a
 * transient failure — the write lands on a later attempt. `lost` means it never did.
 */
async function attemptWrite<R>(write: () => Observable<R>): Promise<WriteResult> {
  for (let attempt = 0; ; attempt++) {
    try {
      await firstValueFrom(write());
      return 'done';
    } catch (error) {
      const status = error instanceof HttpErrorResponse ? error.status : -1;

      // 404 means the row is already gone, which is what a delete was after anyway. A POST
      // cannot land here: its collection URL is fixed, so json-server always resolves it.
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
