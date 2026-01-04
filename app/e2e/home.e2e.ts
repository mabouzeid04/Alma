import { by, device, element, expect, waitFor } from 'detox';

const launchWithSeed = async (seed: string) => {
  await device.launchApp({
    newInstance: true,
    permissions: { microphone: 'YES' },
    url: `secondbrain://e2e?seed=${seed}`,
  });
};

const launchWithSeedAndHour = async (seed: string, hour: number) => {
  await device.launchApp({
    newInstance: true,
    permissions: { microphone: 'YES' },
    url: `secondbrain://e2e?seed=${seed}&hour=${hour}`,
  });
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const waitForHomeReady = async () => {
  await waitFor(element(by.id('home-hint-text'))).toBeVisible().withTimeout(30000);
};

describe('Home screen', () => {
  beforeEach(async () => {
    await device.terminateApp();
  });

  it('renders empty state with no sessions', async () => {
    await launchWithSeed('empty');
    await waitForHomeReady();
    await expect(element(by.id('home-session-meta'))).not.toExist();
    await expect(element(by.id('home-insights-button'))).not.toExist();
    await expect(element(by.id('home-swipe-hint'))).toBeVisible();
  });

  it('renders with sessions and shows insights button', async () => {
    await launchWithSeed('three');
    await waitForHomeReady();
    await delay(2000);
    await waitFor(element(by.id('home-session-meta'))).toBeVisible().withTimeout(30000);
    await waitFor(element(by.id('home-insights-button'))).toBeVisible().withTimeout(30000);
    await expect(element(by.id('home-session-meta'))).toHaveText('Session 4 · 3 day streak');
  });

  it('streak resets when there is a gap', async () => {
    await launchWithSeed('gap');
    await waitForHomeReady();
    await delay(2000);
    await waitFor(element(by.id('home-session-meta'))).toBeVisible().withTimeout(30000);
    await expect(element(by.id('home-session-meta'))).toHaveText('Session 3');
  });

  it('navigates to conversation when tapping the orb', async () => {
    await launchWithSeed('empty');
    await waitFor(element(by.id('home-orb'))).toBeVisible().withTimeout(30000);
    await element(by.id('home-orb')).tap();
    await waitFor(element(by.id('conversation-screen'))).toBeVisible().withTimeout(20000);
  });

  it('navigates to history on swipe up', async () => {
    await launchWithSeed('three');
    await waitFor(element(by.id('home-gesture-area'))).toBeVisible().withTimeout(15000);
    await element(by.id('home-gesture-area')).swipe('up', 'fast', 0.6);
    await waitFor(element(by.id('history-screen'))).toBeVisible().withTimeout(15000);
  });

  it('header buttons navigate to settings and insights', async () => {
    await launchWithSeed('three');
    await waitForHomeReady();
    await delay(2000);
    await waitFor(element(by.id('home-settings-button'))).toBeVisible().withTimeout(30000);
    await element(by.id('home-settings-button')).tap();
    await waitFor(element(by.id('settings-screen'))).toBeVisible().withTimeout(15000);
    await device.terminateApp();
    await launchWithSeed('three');
    await waitForHomeReady();
    await delay(2000);
    await element(by.id('home-insights-button')).tap();
    await waitFor(element(by.id('insights-screen'))).toBeVisible().withTimeout(15000);
  });

  it('shows correct greeting buckets for morning and evening', async () => {
    await launchWithSeedAndHour('empty', 8);
    await waitFor(element(by.id('home-greeting-text'))).toBeVisible().withTimeout(30000);
    await expect(element(by.id('home-greeting-text'))).toHaveText('Good morning');

    await device.reloadReactNative();
    await launchWithSeedAndHour('empty', 19);
    await waitFor(element(by.id('home-greeting-text'))).toBeVisible().withTimeout(30000);
    await expect(element(by.id('home-greeting-text'))).toHaveText('Good evening');
  });
});

