import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Ensure each test starts from a clean DOM and clean localStorage.
afterEach(() => {
  cleanup();
  window.localStorage.clear();
});
