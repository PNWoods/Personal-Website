import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ContactModalProvider } from '../components/ContactModalProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Patrick Woods - Software Developer',
  description: 'Personal website of Patrick Woods, software developer and creator of rfp-pilot',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full overflow-hidden">
      <body className={`${inter.className} h-full overflow-hidden`}>
        <div className="relative h-screen w-full bg-black overflow-hidden">
          <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
          <div className="absolute left-0 right-0 top-[-10%] h-[1000px] w-[1000px] rounded-full bg-[radial-gradient(circle_400px_at_50%_300px,#fbfbfb36,#000)]"></div>
          <div className="relative z-10 h-full overflow-hidden">
            <ContactModalProvider>
              {children}
            </ContactModalProvider>
          </div>
        </div>
      </body>
    </html>
  )
}
