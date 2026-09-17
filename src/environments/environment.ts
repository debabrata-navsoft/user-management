export const environment = {
  production: false,
  /** Base URL of the json-server mock API (`npm run api`). */
  apiUrl: 'http://localhost:3000',
  /** How long a mock session stays valid before the guard forces a new login. */
  sessionMinutes: 120,
  /** Gallery image ceiling per file. Files are stored as data URLs inside db.json. */
  maxUploadMb: 2,
  /**
   * Drive ceiling per file. Files are base64-encoded into the JSON body, which
   * inflates them ~1.33x, and json-server rejects bodies over 10MB with a 413.
   * 6MB raw is the largest value that stays safely under that.
   */
  maxDriveUploadMb: 6,
};
