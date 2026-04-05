import { createPlaidLinkToken, exchangePlaidPublicToken } from './api.js'

let plaidScriptPromise

export function loadPlaidScript() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Plaid Link requires a browser environment'))
  }

  if (window.Plaid) {
    return Promise.resolve(window.Plaid)
  }

  if (!plaidScriptPromise) {
    plaidScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js'
      script.async = true
      script.onload = () => resolve(window.Plaid)
      script.onerror = () => reject(new Error('Unable to load Plaid Link'))
      document.head.appendChild(script)
    })
  }

  return plaidScriptPromise
}

export async function openPlaidLink(profile) {
  const [{ linkToken }, Plaid] = await Promise.all([
    createPlaidLinkToken(profile),
    loadPlaidScript(),
  ])

  return new Promise((resolve, reject) => {
    const handler = Plaid.create({
      token: linkToken,
      onSuccess: async (publicToken) => {
        try {
          const exchange = await exchangePlaidPublicToken(publicToken)
          resolve(exchange)
        } catch (error) {
          reject(error)
        }
      },
      onExit: (error) => {
        if (error) {
          reject(new Error(error.display_message || error.error_message || 'Plaid Link exited early'))
          return
        }
        resolve(null)
      },
    })

    handler.open()
  })
}
