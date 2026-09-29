const test = require('node:test');
const assert = require('node:assert/strict');
const { teardownHlsInstance } = require('../dist/test-modules/hls-lifecycle.cjs');

test('teardown stops loading, detaches media, destroys HLS, then clears media', () => {
  const calls = [];
  const hls = {
    stopLoad: () => calls.push('stopLoad'),
    detachMedia: () => calls.push('detachMedia'),
    destroy: () => calls.push('destroy'),
  };
  const video = {
    pause: () => calls.push('pause'),
    removeAttribute: (name) => calls.push('removeAttribute:' + name),
    load: () => calls.push('load'),
  };

  teardownHlsInstance(hls, video);

  assert.deepEqual(calls, [
    'stopLoad',
    'detachMedia',
    'destroy',
    'pause',
    'removeAttribute:src',
    'load',
  ]);
});

test('teardown clears native media even when no HLS instance exists', () => {
  const calls = [];
  teardownHlsInstance(null, {
    pause: () => calls.push('pause'),
    removeAttribute: () => calls.push('removeAttribute'),
    load: () => calls.push('load'),
  });
  assert.deepEqual(calls, ['pause', 'removeAttribute', 'load']);
});