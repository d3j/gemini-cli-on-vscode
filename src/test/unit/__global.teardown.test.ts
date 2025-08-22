import { afterEach } from 'mocha';
import { deactivate } from '../../extension';

// Ensure the extension disposes resources between unit tests
afterEach(() => {
  try {
    deactivate();
  } catch {
    // ignore teardown errors to avoid masking test failures
  }
});

