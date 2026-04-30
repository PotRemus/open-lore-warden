import { type HealthResponse } from '@open-lore-warden/shared'

export type { HealthResponse }

export function getHealthStatus(): HealthResponse {
  return {
    status: 'ok',
    version: process.env['npm_package_version'] ?? '0.1.0',
    timestamp: new Date().toISOString(),
  }
}
