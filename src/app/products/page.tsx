import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckoutButton } from '@/components/CheckoutButton'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Products | 8os.ai',
  description: 'Explore 8os products and pricing plans.',
  alternates: { canonical: '/products' },
}

// Types matching the API response
interface ProductPrice {
  amount: number
  currency: string
  interval: string | null
  lookupKey: string
}

interface Product {
  id: string
  name: string
  description: string | null
  price: ProductPrice
  mode: 'subscription' | 'payment'
  features: string[]
}

// Map lookup keys to tier values for checkout
function lookupKeyToTier(lookupKey: string): 'pro' | 'agent-connect' | null {
  const key = lookupKey.toLowerCase()
  if (key.includes('pro')) return 'pro'
  if (key.includes('agent')) return 'agent-connect'
  return null
}

// Fetch products from the API
async function getProducts(): Promise<Product[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://8os.ai'}/api/products`, {
      cache: 'no-store',
    })
    if (!res.ok) {
      console.error('Failed to fetch products:', res.status)
      return []
    }
    const data = await res.json()
    return data.products || []
  } catch (err) {
    console.error('Error fetching products:', err)
    return []
  }
}

function formatPrice(amount: number, currency: string, interval: string | null): string {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100)

  if (interval) {
    return `${formatted}/${interval}`
  }
  return formatted
}

export default async function ProductsPage() {
  const products = await getProducts()

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '4rem 1rem',
        background: 'var(--color-bg-primary)',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1
            style={{
              fontSize: 'clamp(2rem, 5vw, 3rem)',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              marginBottom: '1rem',
            }}
          >
            Choose Your 8os Plan
          </h1>
          <p
            style={{
              fontSize: '1.125rem',
              color: 'var(--color-text-secondary)',
              maxWidth: '600px',
              margin: '0 auto',
            }}
          >
            Select the plan that fits your needs. All plans include access to your archetype
            and basic features.
          </p>
        </div>

        {products.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              color: 'var(--color-text-secondary)',
            }}
          >
            <p>Unable to load products. Please try again later.</p>
            <Link
              href="/pricing"
              style={{
                display: 'inline-block',
                marginTop: '1rem',
                color: 'var(--color-accent)',
              }}
            >
              View pricing page →
            </Link>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '2rem',
            }}
          >
            {products.map((product) => (
              <div
                key={product.id}
                style={{
                  background: 'var(--color-bg-secondary)',
                  borderRadius: '12px',
                  padding: '2rem',
                  border: '1px solid var(--color-border)',
                }}
              >
                <h2
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    marginBottom: '0.5rem',
                  }}
                >
                  {product.name}
                </h2>

                <div style={{ marginBottom: '1.5rem' }}>
                  <span
                    style={{
                      fontSize: '2.5rem',
                      fontWeight: 700,
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {formatPrice(product.price.amount, product.price.currency, product.price.interval)}
                  </span>
                  {product.price.interval && (
                    <span
                      style={{
                        fontSize: '1rem',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      /{product.price.interval}
                    </span>
                  )}
                </div>

                {product.description && (
                  <p
                    style={{
                      color: 'var(--color-text-secondary)',
                      marginBottom: '1.5rem',
                    }}
                  >
                    {product.description}
                  </p>
                )}

                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: '0 0 1.5rem 0',
                  }}
                >
                  {product.features.map((feature, idx) => (
                    <li
                      key={idx}
                      style={{
                        padding: '0.5rem 0',
                        color: 'var(--color-text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      <span style={{ color: 'var(--color-accent)' }}>✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                {(() => {
                  const tier = lookupKeyToTier(product.price.lookupKey)
                  if (!tier) return null
                  return (
                    <CheckoutButton
                      tier={tier}
                      label={product.mode === 'payment' ? 'Buy Now' : 'Get Started'}
                      style={{
                        width: '100%',
                        padding: '0.875rem',
                        fontSize: '1rem',
                      }}
                    />
                  )
                })()}
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            textAlign: 'center',
            marginTop: '3rem',
          }}
        >
          <Link
            href="/pricing"
            style={{
              color: 'var(--color-accent)',
              fontSize: '1rem',
            }}
          >
            View full pricing details →
          </Link>
        </div>
      </div>
    </main>
  )
}
