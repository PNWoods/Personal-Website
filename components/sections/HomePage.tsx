'use client'

import Link from 'next/link'
import { useContactModal } from '../ContactModalProvider'

export default function HomePage() {
  const { showContactModal } = useContactModal()
  return (
    <section className="relative h-screen flex items-center overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Photo - Left Side */}
          <div className="flex-shrink-0">
            <div className="w-48 h-48 lg:w-64 lg:h-64 rounded-full overflow-hidden border-4 border-blue-400/30 shadow-2xl">
              <img 
                src="/patrick-woods-photo.jpeg" 
                alt="Patrick Woods" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to placeholder if image doesn't exist
                  e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgdmlld0JveD0iMCAwIDI1NiAyNTYiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyNTYiIGhlaWdodD0iMjU2IiBmaWxsPSIjMzMzMzMzIi8+CjxjaXJjbGUgY3g9IjEyOCIgY3k9IjEyOCIgcj0iNjQiIGZpbGw9IiM2NjY2NjYiLz4KPHN2ZyB4PSI4OCIgeT0iODgiIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjOTk5OTk5Ij4KPHBhdGggZD0iTTEyIDJDMTMuMSAyIDE0IDIuOSAxNCA0UzEzLjEgNiAxMiA2IDEwIDUuMSAxMCA0UzEwLjkgMiAxMiAyTTIxIDlWN0gxNVY5SDIxTTkgN0gzVjlIOU0yMSAxNVYxM0gxNVYxNUgyMU05IDEzSDNWMTVIOU0xMiAxN0MxMy4xIDE3IDE0IDE3LjkgMTQgMTlTMTMuMSAyMSAxMiAyMSAxMCAyMC4xIDEwIDE5UzEwLjkgMTcgMTIgMTdaIi8+Cjwvc3ZnPgo8L3N2Zz4K'
                }}
              />
            </div>
          </div>
          
          {/* Text Content - Right Side */}
          <div className="flex-1 text-center lg:text-left">
            <h1 className="text-4xl sm:text-6xl font-bold text-white mb-6">
              Hi, I'm
              <span className="text-blue-400 block">Patrick Woods</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto lg:mx-0">
              Software developer passionate about building innovative solutions and working on exciting projects.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link href="/skills" className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                View Skills & Resume
              </Link>
              <button 
                onClick={showContactModal}
                className="border border-blue-400 text-blue-400 px-8 py-3 rounded-lg hover:bg-blue-400/10 transition-colors"
              >
                Get In Touch
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
