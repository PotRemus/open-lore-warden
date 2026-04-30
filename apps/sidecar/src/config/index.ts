import { z } from 'zod'

const EnvSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().default('127.0.0.1'),
  DATA_DIR: z.string().default('@@/data'),
})

export const config = EnvSchema.parse(process.env)
