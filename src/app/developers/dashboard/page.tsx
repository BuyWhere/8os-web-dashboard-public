export const metadata = {
  title: '8OS Developer Dashboard',
  description: 'Manage your Agent Connect API keys and explore the 8OS developer platform.',
}

export default function DevelopersDashboardPage() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 800, margin: '0 auto', padding: '2rem' }}>
      <h1>8OS Developer Dashboard</h1>
      <p>Welcome to the 8OS Agent Connect developer platform.</p>
      <section>
        <h2>Agent Connect API</h2>
        <p>Use the Agent Connect API to integrate your agents with the 8OS platform:</p>
        <ul>
          <li><code>POST /api/v1/keys</code>, Issue an Agent Connect API key (requires authentication)</li>
          <li><code>GET /api/v1/archetype</code>, Retrieve the archetype catalogue</li>
          <li><code>GET /api/v1/archetype/:id</code>, Retrieve a specific archetype definition</li>
          <li><code>POST /api/v1/archetype/generate</code>, Generate a user archetype (requires authentication)</li>
        </ul>
      </section>
      <section>
        <h2>Getting Started</h2>
        <ol>
          <li>Sign in to your 8OS account at <a href="/auth/login">/auth/login</a></li>
          <li>Issue an API key via <code>POST /api/v1/keys</code></li>
          <li>Use your key to authenticate agent requests</li>
        </ol>
      </section>
    </main>
  )
}
