import * as Linking from 'expo-linking';
import { applyE2ESeedIfNeeded, setE2ESeedScenario } from './database';

type SeedPreset = 'empty' | 'single' | 'three' | 'streak3' | 'gap';

export async function handleE2ELink(url?: string | null): Promise<void> {
  if (!url) return;

  const parsed = Linking.parse(url);
  const hostname = parsed.hostname?.toLowerCase() ?? '';
  const path = (parsed.path ?? '').toLowerCase();
  const query = parsed.queryParams ?? {};

  const isE2E = hostname === 'e2e' || path.startsWith('e2e');
  if (!isE2E) return;

  const seedParam = (query.seed ?? query.scenario ?? query.preset ?? '') as string;
  const offsetsParam = (query.days ?? query.offsets ?? '') as string;
  const hourParam = query.hour as string | undefined;

  const preset = (seedParam || path.replace('e2e/', '') || 'empty') as SeedPreset;

  const offsets =
    offsetsParam && typeof offsetsParam === 'string'
      ? offsetsParam
          .split(',')
          .map((v) => parseInt(v.trim(), 10))
          .filter((n) => !Number.isNaN(n))
      : undefined;

  if (hourParam && !Number.isNaN(Number(hourParam))) {
    (globalThis as any).__E2E_FAKE_HOUR__ = Number(hourParam);
  }

  setE2ESeedScenario({
    preset: (preset as SeedPreset) ?? 'empty',
    offsets,
  });

  await applyE2ESeedIfNeeded(true);
}

