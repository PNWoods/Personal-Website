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
                I'm a software engineer currently working on <strong className="text-blue-400">RFP-Pilot</strong>, a cloud-based automation platform that streamlines the request-for-proposal process. My focus has been on developing multi-agent RAG architectures powered by AWS and OpenAI APIs to process large documents and generate rapid, human-verifiable responses. By integrating intelligent backend automation with a collaborative frontend, the project aims to drastically reduce RFP turnaround times while maintaining accuracy and control.
              </p>
              <p className="mb-4 sm:mb-6 leading-relaxed">
                At Clemson University, I'm also conducting undergraduate AI research on <strong className="text-blue-400">Edge LLMs</strong>, where I explore techniques for running optimized language models on limited-hardware edge devices. This work involves experimenting with model compression, inference optimization, and quantization methods to enable high-performance AI inference in low-power environments. Through this research, I'm helping bridge the gap between cloud-scale AI and efficient, on-device deployment.
              </p>
              <p className="mb-4 sm:mb-6 leading-relaxed">
                Previously, I have contributed to Clemson's <strong className="text-blue-400">RAG Systems</strong> research, where I developed retrieval-augmented generation pipelines using the Palmetto HPC cluster to enhance response accuracy and computation efficiency. Outside of academia, I worked as a Network Technician at <strong className="text-blue-400">BCDA LLC</strong>, leading network expansion projects and ensuring near-perfect uptime through proactive system maintenance. Together, these experiences have shaped a balance between cutting-edge AI development and real-world infrastructure reliability.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
