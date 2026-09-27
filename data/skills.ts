import type { SkillColor } from '../components/SkillTag'

/**
 * Every skill lives in exactly one group, and the group decides the colour,
 * so a tag looks the same on the Skills page and on every project card.
 * Add new skills here (never inline in a component).
 */
export interface SkillGroup {
  title: string
  color: SkillColor
  skills: string[]
}

export const SKILL_GROUPS: SkillGroup[] = [
  {
    title: 'Programming Languages',
    color: 'blue',
    skills: ['Python', 'SQL', 'TypeScript', 'JavaScript', 'Java', 'C', 'C++', 'Swift', 'Prolog', 'PowerShell', 'Bash'],
  },
  {
    title: 'Frameworks & Libraries',
    color: 'green',
    skills: [
      'Next.js',
      'React',
      'Node.js',
      'Tailwind CSS',
      'LangChain',
      'Hugging Face',
      'PyTorch',
      'OpenAI API',
      'NumPy',
      'Pandas',
      'Matplotlib',
      'Flask',
      'CUDA Toolkit',
    ],
  },
  {
    title: 'AI, ML & HPC',
    color: 'orange',
    skills: [
      'RAG',
      'Multi-Agent RAG',
      'Hybrid Search',
      'Embeddings',
      'Ollama',
      'Local LLM Hosting',
      'Prompt Engineering',
      'Microsoft Copilot Studio',
      'Model Context Protocol (MCP)',
      'LLM Optimization',
      'Quantization',
      'Pruning',
      'Knowledge Distillation',
      'Parameter-Efficient Fine-Tuning (PEFT)',
      'Model Compression',
      'Inference Optimization',
      'Edge Computing',
      'AI Training',
      'GPU Programming',
      'Parallel Computing',
      'Distributed Computing',
      'Palmetto Cluster HPC',
    ],
  },
  {
    title: 'Data & Backend',
    color: 'pink',
    skills: [
      'PostgreSQL',
      'pgvector',
      'Supabase',
      'Oracle Database',
      'Vector Databases',
      'REST APIs',
      'API Development',
      'API Integration',
      'Lambda Functions',
    ],
  },
  {
    title: 'Cloud & DevOps',
    color: 'cyan',
    skills: ['AWS', 'Vercel', 'Cloudflare Tunnel & Zero Trust', 'Docker', 'Docker Compose', 'Tailscale', 'Git', 'GitHub', 'Slurm', 'Postman', 'VS Code', 'Visual Studio', 'Trello'],
  },
  {
    title: 'Operating Systems & Virtualization',
    color: 'purple',
    skills: ['Linux/Unix', 'Windows', 'Windows Server', 'macOS', 'Proxmox', 'VMware Virtualization'],
  },
  {
    title: 'Networking & Infrastructure',
    color: 'yellow',
    skills: ['Network Administration', 'Self-Hosted Services', 'System Integration', 'Infrastructure', 'NAS Management', 'SSH', 'Technical Support'],
  },
  {
    title: 'Professional',
    color: 'gray',
    skills: ['Team Leadership', 'Staff Training', 'Technical Presentations', 'Frontend Design'],
  },
]

const colorBySkill: Record<string, SkillColor> = {}
for (const group of SKILL_GROUPS) {
  for (const skill of group.skills) colorBySkill[skill] = group.color
}

/** Colour for a skill tag; unknown skills fall back to gray so they stand out in review. */
export const getSkillColor = (skill: string): SkillColor => colorBySkill[skill] ?? 'gray'
