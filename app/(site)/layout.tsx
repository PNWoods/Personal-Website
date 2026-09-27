import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'

/**
 * Shared frame for the public pages: one scroll container (the root layout
 * locks the body), the grid + glow background, the nav and the footer.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 overflow-y-auto overflow-x-hidden" style={{ WebkitOverflowScrolling: 'touch' }}>
      {/*
        overflow-x: clip (not hidden) on the inner wrapper: the 1000px glow
        would otherwise leave scrollable horizontal overflow that a focus or
        scrollIntoView (e.g. tapping the menu button) can shift the page into.
      */}
      <div className="relative flex min-h-full w-full flex-col bg-black" style={{ overflowX: 'clip' }}>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-10%] h-[1000px] w-[1000px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_400px_at_50%_300px,#fbfbfb36,#000)]"
        />
        <div className="relative z-10 flex min-h-full flex-1 flex-col">
          <Navigation />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </div>
    </div>
  )
}
