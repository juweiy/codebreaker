import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getAuthServerErrorPath,
  isAuthServerUnavailable,
} from '../lib/auth/errors.ts';

test('recognizes authentication connectivity failures', () => {
  assert.equal(
    isAuthServerUnavailable(
      new Error('Unable to connect to authentication server.')
    ),
    true
  );
  assert.equal(isAuthServerUnavailable({ status: 503 }), true);
  assert.equal(isAuthServerUnavailable(new Error('Invalid password')), false);
});

test('builds an encoded authentication retry path', () => {
  assert.equal(
    getAuthServerErrorPath('/auth/login?next=/dashboard'),
    '/auth/error?returnTo=%2Fauth%2Flogin%3Fnext%3D%2Fdashboard'
  );
});
