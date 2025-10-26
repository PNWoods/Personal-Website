'use client'

import Link from 'next/link'
import { useContactModal } from './ContactModalProvider'

export default function Navigation() {
  const { showContactModal } = useContactModal()
  return (
    <nav className="bg-black/0 backdrop-blur-sm shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <Link href="/home" className="text-2xl font-bold text-white hover:text-blue-400 transition-colors">
            Patrick Woods
          </Link>
          <div className="hidden md:flex space-x-8">
            <Link href="/home" className="text-gray-300 hover:text-white transition-colors">
              Home
            </Link>
            <Link href="/about" className="text-gray-300 hover:text-white transition-colors">
              About
            </Link>
            <Link href="/skills" className="text-gray-300 hover:text-white transition-colors">
              Skills
            </Link>
            <Link href="/projects" className="text-gray-300 hover:text-white transition-colors">
              Projects
            </Link>
            <button 
              onClick={showContactModal}
              className="text-gray-300 hover:text-white transition-colors"
            >
              Contact
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
