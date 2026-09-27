import type { Metadata } from 'next'
import SkillsSection from '@/components/sections/SkillsSection'

export const metadata: Metadata = {
  title: 'Skills',
  description:
    'Languages, frameworks, AI/ML and HPC tooling, cloud and infrastructure skills Patrick Woods works with.',
  alternates: { canonical: '/skills' },
}

export default function Skills() {
  return <SkillsSection />
}
