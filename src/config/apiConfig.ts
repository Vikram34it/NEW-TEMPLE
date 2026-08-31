// ------------------- Google Apps Script API configuration -------------------
// Set these values via environment variables when building, OR edit directly.
//
// For GitHub Pages you cannot use runtime secrets, so the Web App URL is fine
// to include here (it is meant to be public). NEVER put the API key / token
// for the backend here in the public bundle - see SECURITY notes in README.
//
// IMPORTANT: While developing with sample data, keep useMockData = true.
// When you have deployed the Apps Script backend, set it to false and provide
// the deployed Web App URL.

export interface ApiConfig {
  /** Deployed Google Apps Script Web App URL, e.g. https://script.google.com/macros/s/xxxx/exec */
  webAppUrl: string
  /** When true, the app runs entirely offline with bundled sample data. */
  useMockData: boolean
}

export const CONFIG: ApiConfig = {
  webAppUrl: import.meta.env.VITE_WEB_APP_URL || '',
  useMockData: import.meta.env.VITE_WEB_APP_URL
    ? import.meta.env.VITE_USE_MOCK === 'true'
    : true,
}
