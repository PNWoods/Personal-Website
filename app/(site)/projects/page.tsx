import type { Metadata } from 'next'
import ProjectsSection from '@/components/sections/ProjectsSection'

export const metadata: Metadata = {
  title: 'Projects',
  description:
    'Work by Patrick Woods: utility data and RAG systems at Fayetteville PWC, RFP-Pilot, Clemson research on edge LLMs and RAG, and network infrastructure at BCDA.',
  alternates: { canonical: '/projects' },
}

export default function Projects() {
  return <ProjectsSection />
}
