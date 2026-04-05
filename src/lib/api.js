async function readJson(response) {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'Request failed')
  return payload
}

let preferredApiBase = ''

function getApiCandidates(pathname) {
  const candidates = [pathname]

  if (typeof window === 'undefined') {
    return candidates
  }

  if (preferredApiBase) {
    return [`${preferredApiBase}${pathname}`]
  }

  const hostnames = new Set([
    window.location.hostname,
    'localhost',
    '127.0.0.1',
  ])

  hostnames.forEach((hostname) => {
    if (hostname) {
      candidates.push(`http://${hostname}:3001${pathname}`)
    }
  })

  return candidates
}

export async function apiFetch(pathname, options) {
  const candidates = getApiCandidates(pathname)
  let lastError = null

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, options)
      if (candidate.startsWith('http')) {
        preferredApiBase = candidate.replace(pathname, '')
      } else {
        preferredApiBase = ''
      }
      return await readJson(response)
    } catch (error) {
      lastError = error
      if (!(error instanceof TypeError && /fetch/i.test(error.message))) {
        throw error
      }
    }
  }

  throw new Error('Unable to reach the local Fundalo API. Keep `npm run dev:full` running, then refresh and try again.')
}

export function getApiHealth() {
  return apiFetch('/api/health')
}

export function createPlaidLinkToken(profile) {
  return apiFetch('/api/plaid/create-link-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile }),
  })
}

export function exchangePlaidPublicToken(publicToken) {
  return apiFetch('/api/plaid/exchange-public-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ publicToken }),
  })
}

export function analyzePlaidAccount({ sessionId, profile, days = 180 }) {
  return apiFetch('/api/plaid/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, profile, days }),
  })
}
