import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()
const KEY = 'weeklyflow:snapshot'

export default async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get('origin') ?? ''
  const corsHeaders = {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type, x-sync-secret',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  const secret = req.headers.get('x-sync-secret')
  if (!secret || secret !== process.env.SYNC_SECRET) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders })
  }

  if (req.method === 'GET') {
    const data = await redis.get(KEY)
    return new Response(JSON.stringify({ snapshot: data ?? null }), {
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  if (req.method === 'POST') {
    const body = await req.json()
    if (!body || typeof body !== 'object' || !body.updatedAt) {
      return new Response('Bad payload', { status: 400, headers: corsHeaders })
    }
    await redis.set(KEY, body)
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  return new Response('Method not allowed', { status: 405, headers: corsHeaders })
}

export const config = { runtime: 'edge' }
