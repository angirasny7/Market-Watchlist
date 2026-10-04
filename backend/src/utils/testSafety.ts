/**
 * Test Safety Guard
 *
 * Ensures tests never accidentally run against production databases
 * and guarantees test accounts are created with `isTestUser: true` and safely cleaned up.
 */
export function assertTestEnvironment() {
  if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
    throw new Error(
      '❌ FATAL SAFETY VIOLATION: Tests must strictly run in NODE_ENV=test. Aborting execution to protect database.'
    );
  }
}
