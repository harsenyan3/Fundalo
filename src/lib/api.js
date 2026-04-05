async function readJson(response) {
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.error || 'Request failed')
  }

  return payload
}

async function apiFetch(url, options) {
  try {
    const response = await fetch(url, options)
    return await readJson(response)
  } catch (error) {
    if (error instanceof TypeError && /fetch/i.test(error.message)) {
      throw new Error('Unable to reach the local Fundalo API. Start both apps with `npm run dev:full`.')
    }

    throw error
  }
}

export async function getApiHealth() {
  return apiFetch('/api/health')
}

export async function createPlaidLinkToken(profile) {
  return apiFetch('/api/plaid/create-link-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile }),
  })
}

export async function exchangePlaidPublicToken(publicToken) {
  return apiFetch('/api/plaid/exchange-public-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ publicToken }),
  })
}

export async function analyzePlaidAccount({ sessionId, profile, days = 180 }) {
  return apiFetch('/api/plaid/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, profile, days }),
  })
}
