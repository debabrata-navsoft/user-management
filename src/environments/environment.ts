export const environment = {
  production: false,
  /** Base URL of the json-server mock API (`npm run api`). */
  apiUrl: 'http://localhost:3000',
  /** How long a mock session stays valid before the guard forces a new login. */
  sessionMinutes: 120,
  /** Upload ceiling per file. Files are stored as data URLs inside db.json. */
  maxUploadMb: 2,
};
