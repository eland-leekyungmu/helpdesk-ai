import { prisma } from '@/lib/prisma';

// ============================================================
// 시스템 설정 캐시 (5분 TTL)
// DB에서 읽되 메모리에 캐시하여 성능 최적화
// ============================================================

interface ConfigCache {
  value: string;
  expiresAt: number;
}

const cache = new Map<string, ConfigCache>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5분

async function getConfig(key: string, defaultValue: string): Promise<string> {
  const now = Date.now();
  const cached = cache.get(key);

  // 캐시 유효하면 반환
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  // DB에서 조회
  try {
    const config = await prisma.systemConfig.findUnique({ where: { key } });
    const value = config?.value ?? defaultValue;
    cache.set(key, { value, expiresAt: now + CACHE_TTL_MS });
    return value;
  } catch {
    // DB 오류 시 .env 폴백
    return process.env[key.toUpperCase()] ?? defaultValue;
  }
}

async function setConfig(key: string, value: string): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
  // 캐시 즉시 무효화
  cache.delete(key);
}

export async function getConfidenceThreshold(): Promise<number> {
  const value = await getConfig('confidence_threshold', '0.5');
  return parseFloat(value);
}

export async function getMaxCategories(): Promise<number> {
  const value = await getConfig('max_categories', '10');
  return parseInt(value);
}

export async function getAllConfigs(): Promise<{ confidence_threshold: string; max_categories: string }> {
  const [ct, mc] = await Promise.all([
    getConfig('confidence_threshold', '0.5'),
    getConfig('max_categories', '10'),
  ]);
  return { confidence_threshold: ct, max_categories: mc };
}

export async function saveConfigs(configs: { confidenceThreshold?: number; maxCategories?: number }): Promise<void> {
  const tasks: Promise<void>[] = [];
  if (configs.confidenceThreshold !== undefined) {
    tasks.push(setConfig('confidence_threshold', String(configs.confidenceThreshold)));
  }
  if (configs.maxCategories !== undefined) {
    tasks.push(setConfig('max_categories', String(configs.maxCategories)));
  }
  await Promise.all(tasks);
}
