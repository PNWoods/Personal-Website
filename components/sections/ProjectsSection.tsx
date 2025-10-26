import { GraduationCap, FileText, Server, Smartphone } from 'lucide-react'
import SkillTag from '../SkillTag'
import { getSkillColor } from '../../data/skills'

export default function ProjectsSection() {
  return (
    <section className="py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Featured Projects
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Here are some of the projects I've been working on recently.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-md overflow-hidden border border-white/20">
            <div className="h-48 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
              <FileText className="w-16 h-16 text-white" />
            </div>
            <div className="p-6">
              <h3 className="text-xl font-semibold text-white mb-2 text-center">RFP-Pilot</h3>
              <p className="text-gray-300 mb-4">A web-based application designed to streamline the request for proposal (RFP) process for small businesses, reducing submission time and improving efficiency. Features multi-agent RAG architecture for intelligent document processing and AWS-powered backend services.</p>
              <div className="flex gap-2 flex-wrap">
                {/* Programming Languages */}
                <SkillTag skill="Python" color={getSkillColor('Python')} />
                <SkillTag skill="Next.js" color={getSkillColor('Node.js')} />
                <SkillTag skill="SQL" color={getSkillColor('SQL')} />
                
                {/* AI & ML */}
                <SkillTag skill="Multi-Agent RAG" color={getSkillColor('Multi-Agent RAG')} />
                <SkillTag skill="Vector Database Integration" color={getSkillColor('Vector Database Integration')} />
                
                {/* Development Tools */}
                <SkillTag skill="AWS" color={getSkillColor('AWS')} />
                <SkillTag skill="Git" color={getSkillColor('Git')} />
                
                {/* Backend & Cloud */}
                <SkillTag skill="Lambda Functions" color={getSkillColor('Lambda Functions')} />
                <SkillTag skill="API Calls" color={getSkillColor('API Calls')} />
                <SkillTag skill="PostgreSQL" color={getSkillColor('PostgreSQL')} />
                <SkillTag skill="pgvector" color={getSkillColor('pgvector')} />
                <SkillTag skill="API Development" color={getSkillColor('API Development')} />
                <SkillTag skill="API Integration" color={getSkillColor('API Integration')} />
                
                {/* Frontend */}
                <SkillTag skill="Frontend Design" color={getSkillColor('Frontend Design')} />
              </div>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-md overflow-hidden border border-white/20">
            <div className="h-48 bg-gradient-to-br from-indigo-400 to-cyan-500 flex items-center justify-center">
              <Smartphone className="w-16 h-16 text-white" />
            </div>
            <div className="p-6">
              <h3 className="text-xl font-semibold text-white mb-2 text-center">Clemson AI Research - Edge LLMs</h3>
              <p className="text-gray-300 mb-4">Undergraduate AI research at Clemson University focused on optimizing and deploying Large Language Models on edge devices. Understanding compression techniques and inference optimization strategies to enable efficient LLM execution on resource-constrained hardware, pushing the boundaries of on-device AI capabilities.</p>
              <div className="flex gap-2 flex-wrap">
                {/* Programming Languages */}
                <SkillTag skill="Python" color={getSkillColor('Python')} />
                
                {/* Frameworks & Libraries */}
                <SkillTag skill="PyTorch" color={getSkillColor('PyTorch')} />
                <SkillTag skill="Hugging Face" color={getSkillColor('Hugging Face')} />
                <SkillTag skill="LangChain" color={getSkillColor('LangChain')} />
                
                {/* AI, ML, and HPC */}
                <SkillTag skill="LLM Optimization" color={getSkillColor('LLM Optimization')} />
                <SkillTag skill="Edge Computing" color={getSkillColor('Edge Computing')} />
                <SkillTag skill="Model Compression" color={getSkillColor('Model Compression')} />
                <SkillTag skill="Quantization" color={getSkillColor('Quantization')} />
                <SkillTag skill="Pruning" color={getSkillColor('Pruning')} />
                <SkillTag skill="Knowledge Distillation" color={getSkillColor('Knowledge Distillation')} />
                <SkillTag skill="Parameter-Efficient Fine-Tuning (PEFT)" color={getSkillColor('Parameter-Efficient Fine-Tuning (PEFT)')} />
                
                {/* Research & Communication */}
                <SkillTag skill="Technical Presentations" color={getSkillColor('Technical Presentations')} />
              </div>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-md overflow-hidden border border-white/20">
            <div className="h-48 bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
              <GraduationCap className="w-16 h-16 text-white" />
            </div>
            <div className="p-6">
              <h3 className="text-xl font-semibold text-white mb-2 text-center">Clemson AI Research - RAG Systems</h3>
              <p className="text-gray-300 mb-4">Undergraduate AI research at Clemson University utilizing Palmetto HPC for AI training and optimization. Developed a RAG model combining retrieval-based search with generative AI to improve response accuracy and delivered technical presentations to University of Florida professors.</p>
              <div className="flex gap-2 flex-wrap">
                {/* Programming Languages */}
                <SkillTag skill="Python" color={getSkillColor('Python')} />
                
                {/* Frameworks & Libraries */}
                <SkillTag skill="LangChain" color={getSkillColor('LangChain')} />
                <SkillTag skill="Hugging Face" color={getSkillColor('Hugging Face')} />
                <SkillTag skill="OpenAI API" color={getSkillColor('OpenAI API')} />
                <SkillTag skill="CUDA Toolkit" color={getSkillColor('CUDA Toolkit')} />
                
                {/* AI, ML, and HPC */}
                <SkillTag skill="Parallel Computing" color={getSkillColor('Parallel Computing')} />
                <SkillTag skill="GPU Accelerated Programming" color={getSkillColor('GPU Accelerated Programming')} />
                <SkillTag skill="Palmetto Cluster HPC" color={getSkillColor('Palmetto Cluster HPC')} />
                <SkillTag skill="AI Training" color={getSkillColor('AI Training')} />
                
                {/* Research & Communication */}
                <SkillTag skill="Technical Presentations" color={getSkillColor('Technical Presentations')} />
              </div>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-md overflow-hidden border border-white/20">
            <div className="h-48 bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
              <Server className="w-16 h-16 text-white" />
            </div>
            <div className="p-6">
              <h3 className="text-xl font-semibold text-white mb-2 text-center">BCDA LLC Network Infrastructure</h3>
              <p className="text-gray-300 mb-4">Network expansion and software deployment project with staff training. Led network expansion and software implementation at BCDA LLC, expanding the network system to support 42 new devices and training all staff on new software systems. Achieved 99.9% network uptime and 95% technical issue resolution within 6 hours.</p>
              <div className="flex gap-2 flex-wrap">
                {/* Development Tools */}
                <SkillTag skill="Docker Compose" color={getSkillColor('Docker Compose')} />
                
                {/* Operating Systems & Virtualization */}
                <SkillTag skill="VMware Virtualization" color={getSkillColor('VMware Virtualization')} />
                
                {/* Networking & Infrastructure */}
                <SkillTag skill="Network Administration" color={getSkillColor('Network Administration')} />
                <SkillTag skill="System Integration" color={getSkillColor('System Integration')} />
                <SkillTag skill="Infrastructure" color={getSkillColor('Infrastructure')} />
                <SkillTag skill="NAS Management" color={getSkillColor('NAS Management')} />
                <SkillTag skill="SSH" color={getSkillColor('SSH')} />
                <SkillTag skill="Staff Training" color={getSkillColor('Staff Training')} />
                <SkillTag skill="Team Leadership" color={getSkillColor('Team Leadership')} />
                <SkillTag skill="Technical Support" color={getSkillColor('Technical Support')} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
