'use client'

import Link from 'next/link'
import { useContactModal } from './ContactModalProvider'
import { useState } from 'react'

export default function Navigation() {
  const { showContactModal } = useContactModal()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <nav className="bg-black/0 backdrop-blur-sm shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <Link href="/home" className="text-2xl font-bold text-white hover:text-blue-400 transition-colors">
            Patrick Woods
          </Link>
          
          {/* Desktop Navigation */}
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

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden text-white p-2"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-700">
            <div className="flex flex-col space-y-4">
              <Link 
                href="/home" 
                className="text-gray-300 hover:text-white transition-colors px-4"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link 
                href="/about" 
                className="text-gray-300 hover:text-white transition-colors px-4"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                About
              </Link>
              <Link 
                href="/skills" 
                className="text-gray-300 hover:text-white transition-colors px-4"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Skills
              </Link>
              <Link 
                href="/projects" 
                className="text-gray-300 hover:text-white transition-colors px-4"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Projects
              </Link>
              <button 
                onClick={() => {
                  showContactModal()
                  setIsMobileMenuOpen(false)
                }}
                className="text-gray-300 hover:text-white transition-colors text-left px-4"
              >
                Contact
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
