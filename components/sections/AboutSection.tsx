import { ArrowUpRight } from 'lucide-react'
import { PUBLICATIONS } from '@/lib/site'

function Publications() {
  return (
    <div className="mx-auto mt-14 max-w-3xl">
      <h2 className="mb-6 text-center text-2xl font-bold text-white sm:text-3xl">Publications</h2>
      <ul className="space-y-6">
        {PUBLICATIONS.map((p) => {
          const citation = `${p.authors.join(', ')}. "${p.title}." ${p.venue}, ${p.year}. arXiv:${p.arxiv}.`
          return (
            <li key={p.arxiv} className="rounded-lg border border-white/15 bg-white/5 p-5 text-left backdrop-blur-sm sm:p-6">
              <h3 className="text-lg font-semibold text-white">{p.title}</h3>
              <p className="mt-2 text-sm text-gray-300">
                {p.authors.map((a, i) => (
                  <span key={a}>
                    {i > 0 && ', '}
                    {a === 'Patrick Woods' ? <strong className="text-blue-400">{a}</strong> : a}
                  </span>
                ))}
              </p>
              <p className="mt-1 text-sm text-gray-400">
                {p.venue}, {p.year}
              </p>
              <p className="mt-3 leading-relaxed text-gray-300">{p.summary}</p>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-400 transition-colors hover:text-blue-300"
                >
                  arXiv:{p.arxiv}
                  <ArrowUpRight className="h-4 w-4" aria-hidden />
                </a>
                <a
                  href={`https://arxiv.org/pdf/${p.arxiv}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-400 transition-colors hover:text-blue-300"
                >
                  PDF
                  <ArrowUpRight className="h-4 w-4" aria-hidden />
                </a>
              </div>
              <details className="mt-4 text-sm">
                <summary className="cursor-pointer text-gray-400 hover:text-white">Cite</summary>
                <pre className="mt-2 whitespace-pre-wrap break-words rounded border border-white/10 bg-black/40 p-3 font-mono text-xs leading-relaxed text-gray-300">
                  {citation}
                </pre>
              </details>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default function AboutSection() {
  return (
    <section className="py-8 sm:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-16">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            About Me
          </h1>
        </div>
        
        <div className="max-w-5xl mx-auto">
          <div className="space-y-6 sm:space-y-8 text-base sm:text-lg text-gray-300 text-center">
            <div>
              <p className="mb-4 sm:mb-6 leading-relaxed">
                I'm an AI and Data Engineer at <strong className="text-blue-400">Fayetteville PWC</strong>, where I build data pipelines and ML systems for utility operations, create custom RAG agents for internal document search, build purpose-built agents in Microsoft Copilot Studio for business teams, and lead AI training for staff across the utility. I'm also a co-founder of <strong className="text-blue-400">RFP-Pilot</strong>, a cloud-based automation platform that streamlines the request-for-proposal process using a multi-agent RAG architecture on AWS and OpenAI. The product is in its pilot stage as we onboard early customers.
              </p>
              <p className="mb-4 sm:mb-6 leading-relaxed">
                As an undergraduate AI researcher at Clemson, I co-authored <a href="https://arxiv.org/abs/2604.04722" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">"Don't Waste Bits! Adaptive KV-Cache Quantization for Lightweight On-Device LLMs"</a>, accepted to the LoViF Workshop at <strong className="text-blue-400">CVPR 2026</strong>. I wrote the base test suite and built the learned controller with Gabriel Hillesheim — the controller uses lightweight token-level signals to dynamically select between 2-bit, 4-bit, 8-bit, and FP16 precision, improving the accuracy-latency trade-off for on-device inference.
              </p>
              <p className="mb-4 sm:mb-6 leading-relaxed">
                Earlier at Clemson I contributed to <strong className="text-blue-400">RAG Systems</strong> research on the Palmetto HPC cluster, developing retrieval-augmented generation pipelines to improve response accuracy. Outside of academia, I worked as a Network Technician at <strong className="text-blue-400">BCDA LLC</strong>, leading network expansion projects and maintaining near-perfect uptime through proactive system maintenance.
              </p>
            </div>
          </div>
        </div>

        <Publications />
      </div>
    </section>
  )
}
