'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useContactModal } from '../ContactModalProvider'

export default function HomePage() {
  const { showContactModal } = useContactModal()
  return (
    <section className="relative min-h-screen flex items-center py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full overflow-x-hidden">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Photo - Left Side */}
          <div className="flex-shrink-0">
            <div className="w-48 h-48 lg:w-64 lg:h-64 rounded-full overflow-hidden border-4 border-blue-400/30 shadow-2xl">
              <Image
                src="/patrick-woods-photo.jpeg"
                alt="Patrick Woods"
                width={256}
                height={256}
                priority
                className="w-full h-full object-cover"
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
              AI and Data Engineer at Fayetteville PWC and co-founder of RFP-Pilot.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link href="/skills" className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                View Skills
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
