import type { LucideIcon } from 'lucide-react'
import { ArrowUpRight, Bot, Database, FileText, GraduationCap, HardDrive, Lock, Server, Smartphone } from 'lucide-react'
import SkillTag from '../SkillTag'
import { getSkillColor } from '../../data/skills'
import { CONTACT } from '@/lib/site'

interface Project {
  title: string
  icon: LucideIcon
  gradient: string
  description: React.ReactNode
  links?: { href: string; label: string; lock?: boolean }[]
  /** Names must exist in data/skills.ts so colours match the Skills page. */
  skills: string[]
}

const PAPER_URL = 'https://arxiv.org/abs/2604.04722'

const PROJECTS: Project[] = [
  {
    title: 'Fayetteville PWC',
    icon: Database,
    gradient: 'from-emerald-400 to-teal-500',
    description:
      'AI and Data Engineer at Fayetteville Public Works Commission: data pipelines and ML systems for utility operations, custom RAG agents that let staff search internal documentation and the data dictionary, purpose-built agents in Microsoft Copilot Studio for business teams, and hands-on AI training for staff across the utility.',
    skills: [
      'Python',
      'SQL',
      'Oracle Database',
      'RAG',
      'Multi-Agent RAG',
      'Embeddings',
      'Vector Databases',
      'Microsoft Copilot Studio',
      'Prompt Engineering',
      'AI Training',
      'Staff Training',
      'API Development',
      'API Integration',
    ],
  },
  {
    title: 'RFP-Pilot',
    icon: FileText,
    gradient: 'from-blue-400 to-purple-500',
    description:
      'Co-founder of RFP-Pilot, a cloud platform that streamlines the request-for-proposal process for small businesses. A multi-agent RAG architecture reads the RFP and the company’s past material and drafts the response; AWS runs the backend. In pilot with early customers.',
    links: [{ href: 'https://rfppilot.com', label: 'rfppilot.com' }],
    skills: [
      'Python',
      'TypeScript',
      'Next.js',
      'SQL',
      'Multi-Agent RAG',
      'OpenAI API',
      'Vector Databases',
      'PostgreSQL',
      'pgvector',
      'AWS',
      'Lambda Functions',
      'API Development',
      'API Integration',
      'Git',
      'Frontend Design',
    ],
  },
  {
    title: 'pnwoods.com + private AI workspace',
    icon: Bot,
    gradient: 'from-orange-400 to-rose-500',
    description: (
      <>
        This site, plus an invite-only ChatGPT-style workspace at ai.pnwoods.com that runs
        open-weight coding models on my own hardware. Next.js on Vercel, Supabase for auth, Postgres
        and file storage, hybrid vector + full-text RAG over uploaded documents and a full data
        dictionary, per-user memory and personalization, live web search through a self-hosted
        SearXNG, and Ollama exposed through a Cloudflare Tunnel locked with Zero Trust service
        tokens. The same model powers an agentic coding setup in VS Code.
      </>
    ),
    links: [
      { href: 'https://github.com/PNWoods/Personal-Website', label: 'Source on GitHub' },
      { href: 'https://ai.pnwoods.com', label: 'ai.pnwoods.com (invite only)', lock: true },
    ],
    skills: [
      'TypeScript',
      'Next.js',
      'React',
      'Tailwind CSS',
      'Vercel',
      'Supabase',
      'PostgreSQL',
      'pgvector',
      'Hybrid Search',
      'Embeddings',
      'RAG',
      'Ollama',
      'Local LLM Hosting',
      'Prompt Engineering',
      'Model Context Protocol (MCP)',
      'Cloudflare Tunnel & Zero Trust',
      'Docker',
      'Proxmox',
      'Tailscale',
      'Self-Hosted Services',
    ],
  },
  {
    title: 'Home lab: Proxmox + self-hosted services',
    icon: HardDrive,
    gradient: 'from-slate-400 to-zinc-600',
    description:
      'A Proxmox VE host running the services behind everything else here, with local LLM inference on 96 GB of pooled GPU memory across three NVIDIA cards and an Apple silicon machine. Each service lives in its own LXC container: Pi-hole DNS for the whole network, the SearXNG metasearch engine that gives the AI workspace live web results, a Docker media-automation stack, a network file share, two dedicated game servers, and a small game-community bot. Tailscale handles remote access, and the few public endpoints go out through Cloudflare Tunnel behind Zero Trust.',
    skills: [
      'Proxmox',
      'Linux/Unix',
      'Docker',
      'Docker Compose',
      'Bash',
      'Tailscale',
      'Cloudflare Tunnel & Zero Trust',
      'Ollama',
      'Self-Hosted Services',
      'Network Administration',
      'NAS Management',
      'SSH',
    ],
  },
  {
    title: 'Clemson AI Research - Edge LLMs',
    icon: Smartphone,
    gradient: 'from-indigo-400 to-cyan-500',
    description: (
      <>
        Undergraduate AI research at Clemson University on optimizing and deploying Large Language
        Models on edge devices. Co-authored{' '}
        <a
          href={PAPER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 underline hover:text-blue-300"
        >
          &ldquo;Don&apos;t Waste Bits! Adaptive KV-Cache Quantization for Lightweight On-Device LLMs&rdquo;
        </a>
        , accepted to the LoViF Workshop at CVPR 2026. Contributed the base test suite and built the
        learned controller with Gabriel Hillesheim: it selects between 2-bit, 4-bit, 8-bit and FP16
        precision per token using lightweight signals to improve the accuracy-latency trade-off.
      </>
    ),
    links: [{ href: PAPER_URL, label: 'Read the paper on arXiv' }],
    skills: [
      'Python',
      'PyTorch',
      'Hugging Face',
      'LangChain',
      'LLM Optimization',
      'Edge Computing',
      'Model Compression',
      'Quantization',
      'Pruning',
      'Knowledge Distillation',
      'Parameter-Efficient Fine-Tuning (PEFT)',
      'Inference Optimization',
      'Technical Presentations',
    ],
  },
  {
    title: 'Clemson AI Research - RAG Systems',
    icon: GraduationCap,
    gradient: 'from-purple-400 to-pink-500',
    description:
      'Undergraduate AI research at Clemson University using the Palmetto HPC cluster for AI training and optimization. Developed a RAG model combining retrieval-based search with generative AI to improve response accuracy, and presented the work to University of Florida faculty.',
    skills: [
      'Python',
      'LangChain',
      'Hugging Face',
      'OpenAI API',
      'CUDA Toolkit',
      'RAG',
      'Embeddings',
      'Parallel Computing',
      'GPU Programming',
      'Distributed Computing',
      'Slurm',
      'Palmetto Cluster HPC',
      'AI Training',
      'Technical Presentations',
    ],
  },
  {
    title: 'BCDA LLC Network Infrastructure',
    icon: Server,
    gradient: 'from-green-400 to-blue-500',
    description:
      'Led network expansion and software implementation at BCDA LLC: grew the network to support 42 new devices, deployed and trained all staff on new software systems, and kept 99.9% network uptime with 95% of technical issues resolved within 6 hours.',
    skills: [
      'Network Administration',
      'System Integration',
      'Infrastructure',
      'NAS Management',
      'SSH',
      'Windows Server',
      'VMware Virtualization',
      'Docker Compose',
      'Staff Training',
      'Team Leadership',
      'Technical Support',
    ],
  },
]

function LinkRow({ href, label, lock }: { href: string; label: string; lock?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm text-blue-400 transition-colors hover:text-blue-300"
    >
      {lock && <Lock className="h-3.5 w-3.5" aria-hidden />}
      {label}
      <ArrowUpRight className="h-4 w-4" aria-hidden />
    </a>
  )
}

export default function ProjectsSection() {
  return (
    <section className="py-8 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h1 className="mb-4 text-3xl font-bold text-white sm:text-4xl">Featured Projects</h1>
          <p className="mx-auto max-w-3xl text-xl text-gray-300">
            Here are some of the projects I&apos;ve been working on recently.
          </p>
        </div>
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-2">
          {PROJECTS.map((p) => {
            const Icon = p.icon
            return (
              <article
                key={p.title}
                className="flex flex-col overflow-hidden rounded-lg border border-white/20 bg-white/10 shadow-md backdrop-blur-sm transition-transform duration-200 hover:-translate-y-0.5"
              >
                <div className={`flex h-48 items-center justify-center bg-gradient-to-br ${p.gradient}`}>
                  <Icon className="h-16 w-16 text-white" aria-hidden />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h2 className="mb-2 text-center text-xl font-semibold text-white">{p.title}</h2>
                  <p className="mb-4 text-gray-300">{p.description}</p>
                  {p.links && (
                    <div className="mb-4 flex flex-wrap gap-x-5 gap-y-1">
                      {p.links.map((l) => (
                        <LinkRow key={l.href} {...l} />
                      ))}
                    </div>
                  )}
                  <div className="mt-auto flex flex-wrap gap-2">
                    {p.skills.map((s) => (
                      <SkillTag key={s} skill={s} color={getSkillColor(s)} />
                    ))}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
        <p className="mt-10 text-center text-sm text-gray-500">
          Want the details on any of these?{' '}
          <a href={`mailto:${CONTACT.email}`} className="text-gray-400 underline hover:text-white">
            Email me
          </a>
          .
        </p>
      </div>
    </section>
  )
}
