import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 text-center">
      <p className="mb-2 text-sm font-medium uppercase tracking-widest text-blue-400">404</p>
      <h1 className="mb-4 text-3xl font-bold text-white sm:text-4xl">That page isn&apos;t here.</h1>
      <p className="mb-8 max-w-md text-gray-300">
        The link may be old, or the address has a typo. Everything on this site is reachable
        from the home page.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
        >
          Back to home
        </Link>
        <Link
          href="/projects"
          className="rounded-lg border border-blue-400 px-6 py-3 text-blue-400 transition-colors hover:bg-blue-400/10"
        >
          See projects
        </Link>
      </div>
    </div>
  )
}
