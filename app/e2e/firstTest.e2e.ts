import { by, element, expect, waitFor } from 'detox';

describe('Smoke test', () => {
  it('shows the home screen hint', async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { microphone: 'YES' },
      url: 'secondbrain://e2e?seed=empty',
    });
    const hint = element(by.text('Tap to start talking'));
    await waitFor(hint).toBeVisible().withTimeout(20000);
    await expect(hint).toBeVisible();
  });
});

