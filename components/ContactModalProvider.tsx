'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import ContactModal from './ContactModal'

interface ContactModalContextType {
  showContactModal: () => void
  hideContactModal: () => void
}

const ContactModalContext = createContext<ContactModalContextType | undefined>(undefined)

export function ContactModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const showContactModal = () => setIsOpen(true)
  const hideContactModal = () => setIsOpen(false)

  return (
    <ContactModalContext.Provider value={{ showContactModal, hideContactModal }}>
      {children}
      <ContactModal isOpen={isOpen} onClose={hideContactModal} />
    </ContactModalContext.Provider>
  )
}

export function useContactModal() {
  const context = useContext(ContactModalContext)
  if (context === undefined) {
    throw new Error('useContactModal must be used within a ContactModalProvider')
  }
  return context
}
