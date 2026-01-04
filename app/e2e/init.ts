import { cleanup, init } from 'detox/internals';

beforeAll(async () => {
  await init({ launchApp: false });
}, 120000);

afterAll(async () => {
  await cleanup();
});

