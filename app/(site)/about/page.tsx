import type { Metadata } from 'next'
import AboutSection from '@/components/sections/AboutSection'

export const metadata: Metadata = {
  title: 'About',
  description:
    'Patrick Woods: AI and Data Engineer at Fayetteville PWC, co-founder of RFP-Pilot, and co-author of research on adaptive KV-cache quantization for on-device LLMs.',
  alternates: { canonical: '/about' },
}

export default function About() {
  return <AboutSection />
}
