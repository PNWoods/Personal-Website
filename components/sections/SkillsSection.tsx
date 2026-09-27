import SkillTag from '../SkillTag'
import { getSkillColor } from '../../data/skills'

const GROUPS: { title: string; skills: string[] }[] = [
  {
    title: 'Programming Languages',
    skills: ['Python', 'SQL', 'Java', 'C', 'C++', 'Swift', 'Prolog', 'PowerShell'],
  },
  {
    title: 'Frameworks & Libraries',
    skills: ['Next.js', 'LangChain', 'Hugging Face', 'PyTorch', 'OpenAI API', 'NumPy', 'Pandas', 'Matplotlib', 'Flask', 'CUDA Toolkit'],
  },
  {
    title: 'AI, ML, and HPC',
    skills: [
      'RAG',
      'Multi-Agent RAG',
      'Vector Database Integration',
      'LLM Optimization',
      'Quantization',
      'Pruning',
      'Knowledge Distillation',
      'Parameter-Efficient Fine-Tuning (PEFT)',
      'Model Compression',
      'Inference Optimization',
      'Edge Computing',
      'AI Training',
      'Parallel Computing',
      'Distributed Computing',
      'Palmetto Cluster HPC',
    ],
  },
  {
    title: 'Backend & Cloud',
    skills: ['PostgreSQL', 'pgvector', 'AWS', 'Lambda Functions', 'REST APIs', 'API Development', 'API Integration', 'Vector Databases', 'Cloudflare'],
  },
  {
    title: 'Development Tools',
    skills: ['Git', 'Docker', 'Docker Compose', 'Slurm', 'Visual Studio', 'Postman', 'Trello'],
  },
  {
    title: 'Operating Systems & Virtualization',
    skills: ['Linux/Unix', 'Windows', 'Windows Server', 'macOS', 'VMware Virtualization'],
  },
  {
    title: 'Networking & Infrastructure',
    skills: ['Network Administration', 'System Integration', 'Infrastructure', 'NAS Management', 'SSH', 'Technical Support'],
  },
  {
    title: 'Professional',
    skills: ['Team Leadership', 'Staff Training', 'Technical Presentations', 'Frontend Design'],
  },
]

export default function SkillsSection() {
  return (
    <section className="py-8 pb-20 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center sm:mb-14">
          <h1 className="mb-4 text-3xl font-bold text-white sm:text-4xl">Skills</h1>
          <p className="mx-auto max-w-3xl text-lg text-gray-300 sm:text-xl">
            The languages, tools, and systems I work with day to day.
          </p>
        </div>

        <div className="space-y-8 sm:space-y-10">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <h2 className="mb-4 text-xl font-semibold text-white sm:text-2xl">{g.title}</h2>
              <div className="flex flex-wrap gap-2">
                {g.skills.map((s) => (
                  <SkillTag key={s} skill={s} color={getSkillColor(s)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
