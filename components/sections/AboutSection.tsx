'use client'

export default function AboutSection() {
  return (
    <section className="py-8 sm:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
            About Me
          </h2>
        </div>
        
        <div className="max-w-5xl mx-auto">
          <div className="space-y-6 sm:space-y-8 text-base sm:text-lg text-gray-300 text-center">
            <div>
              <p className="mb-4 sm:mb-6 leading-relaxed">
                I'm an AI and Data Engineer at <strong className="text-blue-400">Fayetteville PWC</strong>, where I build data pipelines and ML systems for utility operations, along with creating custom RAG agents to assist with internal document search. I'm also a co-founder of <strong className="text-blue-400">RFP-Pilot</strong>, a cloud-based automation platform that streamlines the request-for-proposal process using a multi-agent RAG architecture on AWS and OpenAI. The product is in its pilot stage as we onboard early customers.
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
      </div>
    </section>
  )
}
