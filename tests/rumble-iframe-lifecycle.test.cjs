const test = require('node:test');
const assert = require('node:assert/strict');
const {
  RumbleIframeLifecycleController,
} = require('../dist/test-modules/rumble-iframe-lifecycle.cjs');

function createHarness() {
  const calls = [];
  const nodes = [];
  let nextNodeId = 0;

  const host = {
    appendChild(node) {
      calls.push('append:' + node.id);
      nodes.push(node);
    },
    removeChild(node) {
      calls.push('remove:' + node.id);
      const index = nodes.indexOf(node);
      if (index >= 0) nodes.splice(index, 1);
    },
  };

  const createIframe = () => {
    const listeners = new Map();
    const node = {
      id: ++nextNodeId,
      src: '',
      addEventListener(type, listener) {
        listeners.set(type, listener);
        calls.push('bind:' + node.id + ':' + type);
      },
      removeEventListener(type, listener) {
        if (listeners.get(type) === listener) listeners.delete(type);
        calls.push('unbind:' + node.id + ':' + type);
      },
      emit(type) {
        listeners.get(type)?.();
      },
      listenerCount() {
        return listeners.size;
      },
    };
    return node;
  };

  return { calls, nodes, host, createIframe };
}

test('rapid transition performs deterministic teardown before replacement', () => {
  const harness = createHarness();
  const loaded = [];
  const controller = new RumbleIframeLifecycleController({
    createIframe: harness.createIframe,
    onLoad: (generation) => loaded.push(generation),
  });

  const firstGeneration = controller.mount(
    harness.host,
    'https://rumble.com/embed/first/',
  );
  const first = harness.nodes[0];

  assert.equal(first.src, 'https://rumble.com/embed/first/');
  assert.equal(firstGeneration, 1);

  const secondGeneration = controller.mount(
    harness.host,
    'https://rumble.com/embed/second/',
  );
  const second = harness.nodes[0];

  assert.equal(secondGeneration, 3);
  assert.equal(first.src, 'about:blank');
  assert.equal(first.listenerCount(), 0);
  assert.equal(second.src, 'https://rumble.com/embed/second/');
  assert.deepEqual(harness.calls, [
    'bind:1:load',
    'bind:1:error',
    'append:1',
    'unbind:1:load',
    'unbind:1:error',
    'remove:1',
    'bind:2:load',
    'bind:2:error',
    'append:2',
  ]);

  first.emit('load');
  second.emit('load');

  assert.deepEqual(loaded, [secondGeneration]);
});

test('stale callbacks are discarded after teardown', () => {
  const harness = createHarness();
  const events = [];
  const controller = new RumbleIframeLifecycleController({
    createIframe: harness.createIframe,
    onLoad: (generation) => events.push('load:' + generation),
    onError: (generation) => events.push('error:' + generation),
  });

  controller.mount(harness.host, 'https://rumble.com/embed/first/');
  const first = harness.nodes[0];

  controller.teardown(harness.host);

  assert.equal(first.src, 'about:blank');
  assert.equal(first.listenerCount(), 0);

  first.emit('load');
  first.emit('error');

  assert.deepEqual(events, []);
});

test('destroy is idempotent and cannot accept a new lifecycle event', () => {
  const harness = createHarness();
  const events = [];
  const controller = new RumbleIframeLifecycleController({
    createIframe: harness.createIframe,
    onLoad: (generation) => events.push(generation),
  });

  controller.mount(harness.host, 'https://rumble.com/embed/first/');
  const first = harness.nodes[0];

  controller.destroy(harness.host);
  controller.destroy(harness.host);
  first.emit('load');

  assert.equal(harness.nodes.length, 0);
  assert.deepEqual(events, []);
});
