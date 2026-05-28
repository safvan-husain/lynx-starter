import { REDUCER_ACK_TIMEOUT_MS } from './connectionConfig';
import { writeHostLog } from '../debug/hostFileLogger';

export async function runReducerWithTimeout<T>(
  label: string,
  reducerPromise: Promise<T>,
): Promise<T> {
  let acknowledged = false;

  try {
    const result = await Promise.race([
      reducerPromise.then((value) => {
        acknowledged = true;
        return value;
      }),
      new Promise<T>((resolve) => {
        setTimeout(() => resolve(undefined as T), REDUCER_ACK_TIMEOUT_MS);
      }),
    ]);

    if (!acknowledged) {
      writeHostLog('warn', `[Reducer] ${label} ack timed out`, {
        source: 'reducerUtils',
        timeoutMs: REDUCER_ACK_TIMEOUT_MS,
      });
    }

    return result;
  } catch (error) {
    throw error;
  }
}
