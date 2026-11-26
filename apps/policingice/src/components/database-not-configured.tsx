export const DatabaseNotConfigured = () => (
  <main id="main-content" className="min-h-screen bg-background px-4 py-8 sm:px-6">
    <div className="max-w-xl">
      <header className="mb-12">
        <h1 className="text-base font-normal">Policing ICE</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Documenting incidents of ICE overreach.
        </p>
      </header>
      <section aria-labelledby="database-not-configured">
        <h2 id="database-not-configured" className="text-sm font-medium">
          Database not configured
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Incidents live in the production Turso database, and there is no local one. Set{" "}
          <code>TURSO_DATABASE_URL</code> and <code>TURSO_AUTH_TOKEN</code> in{" "}
          <code>apps/policingice/.env</code> to show them.
        </p>
      </section>
    </div>
  </main>
);
