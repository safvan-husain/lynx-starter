export const COUNTER_DATABASE_NAME = 'lynx-counter';
export const COUNTER_SERVER_URL =
  SystemInfo.platform === 'Android'
    ? 'http://10.0.2.2:3000'
    : 'http://127.0.0.1:3000';

export const CONNECT_TIMEOUT_MS = 8000;
export const COUNTER_POLL_INTERVAL_MS = 1500;
export const REDUCER_ACK_TIMEOUT_MS = 750;
