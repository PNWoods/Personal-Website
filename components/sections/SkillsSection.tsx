import SkillTag from '../SkillTag'
import { getSkillColor } from '../../data/skills'

export default function SkillsSection() {
  return (
    <section className="py-6 sm:py-8 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 sm:mb-4">
            Skills
          </h2>
          <p className="text-base sm:text-xl text-gray-300 max-w-3xl">
            A comprehensive overview of my technical skills and professional experience.
          </p>
        </div>
        
        <div className="space-y-6 sm:space-y-8">
          <div className="text-left">
            <h4 className="text-xl sm:text-2xl font-semibold text-white mb-4 sm:mb-6">Programming Languages</h4>
            <div className="flex flex-wrap gap-2">
              <SkillTag skill="Java" color={getSkillColor('Java')} />
              <SkillTag skill="C" color={getSkillColor('C')} />
              <SkillTag skill="C++" color={getSkillColor('C++')} />
              <SkillTag skill="Python" color={getSkillColor('Python')} />
              <SkillTag skill="Swift" color={getSkillColor('Swift')} />
              <SkillTag skill="SQL" color={getSkillColor('SQL')} />
              <SkillTag skill="Prolog" color={getSkillColor('Prolog')} />
              <SkillTag skill="Next.js" color={getSkillColor('Next.js')} />
              <SkillTag skill="PowerShell" color={getSkillColor('PowerShell')} />
            </div>
          </div>
          
          <div className="text-left">
            <h4 className="text-xl sm:text-2xl font-semibold text-white mb-4 sm:mb-6">Frameworks & Libraries</h4>
            <div className="flex flex-wrap gap-2">
              <SkillTag skill="LangChain" color={getSkillColor('LangChain')} />
              <SkillTag skill="Hugging Face" color={getSkillColor('Hugging Face')} />
              <SkillTag skill="OpenAI API" color={getSkillColor('OpenAI API')} />
              <SkillTag skill="NumPy" color={getSkillColor('NumPy')} />
              <SkillTag skill="Pandas" color={getSkillColor('Pandas')} />
              <SkillTag skill="Matplotlib" color={getSkillColor('Matplotlib')} />
              <SkillTag skill="Flask" color={getSkillColor('Flask')} />
              <SkillTag skill="CUDA Toolkit" color={getSkillColor('CUDA Toolkit')} />
            </div>
          </div>
          
          <div className="text-left">
            <h4 className="text-xl sm:text-2xl font-semibold text-white mb-4 sm:mb-6">Development Tools</h4>
            <div className="flex flex-wrap gap-2">
              <SkillTag skill="Visual Studio" color={getSkillColor('Visual Studio')} />
              <SkillTag skill="AWS" color={getSkillColor('AWS')} />
              <SkillTag skill="Postman" color={getSkillColor('Postman')} />
              <SkillTag skill="Git" color={getSkillColor('Git')} />
              <SkillTag skill="Trello" color={getSkillColor('Trello')} />
              <SkillTag skill="Slurm" color={getSkillColor('Slurm')} />
              <SkillTag skill="Docker" color={getSkillColor('Docker')} />
              <SkillTag skill="Docker Compose" color={getSkillColor('Docker Compose')} />
              <SkillTag skill="Cloudflare" color={getSkillColor('Cloudflare')} />
            </div>
          </div>
          
          <div className="text-left">
            <h4 className="text-xl sm:text-2xl font-semibold text-white mb-4 sm:mb-6">Operating Systems & Virtualization</h4>
            <div className="flex flex-wrap gap-2">
              <SkillTag skill="Windows" color={getSkillColor('Windows')} />
              <SkillTag skill="Linux/Unix" color={getSkillColor('Linux/Unix')} />
              <SkillTag skill="macOS" color={getSkillColor('macOS')} />
              <SkillTag skill="Windows Server" color={getSkillColor('Windows Server')} />
              <SkillTag skill="VMware Virtualization" color={getSkillColor('VMware Virtualization')} />
            </div>
          </div>
          
          <div className="text-left">
            <h4 className="text-xl sm:text-2xl font-semibold text-white mb-4 sm:mb-6">AI, ML, and HPC</h4>
            <div className="flex flex-wrap gap-2">
              <SkillTag skill="RAG" color={getSkillColor('RAG')} />
              <SkillTag skill="Multi-Agent RAG" color={getSkillColor('Multi-Agent RAG')} />
              <SkillTag skill="AI Training" color={getSkillColor('AI Training')} />
              <SkillTag skill="Parallel Computing" color={getSkillColor('Parallel Computing')} />
              <SkillTag skill="Palmetto Cluster HPC" color={getSkillColor('Palmetto Cluster HPC')} />
              <SkillTag skill="Distributed Computing" color={getSkillColor('Distributed Computing')} />
              <SkillTag skill="LLM Optimization" color={getSkillColor('LLM Optimization')} />
              <SkillTag skill="Knowledge Distillation" color={getSkillColor('Knowledge Distillation')} />
              <SkillTag skill="Parameter-Efficient Fine-Tuning (PEFT)" color={getSkillColor('Parameter-Efficient Fine-Tuning (PEFT)')} />
              <SkillTag skill="Model Compression" color={getSkillColor('Model Compression')} />
              <SkillTag skill="Inference Optimization" color={getSkillColor('Inference Optimization')} />
              <SkillTag skill="Quantization" color={getSkillColor('Quantization')} />
              <SkillTag skill="Pruning" color={getSkillColor('Pruning')} />
              <SkillTag skill="Edge Computing" color={getSkillColor('Edge Computing')} />
              <SkillTag skill="Vector Database Integration" color={getSkillColor('Vector Database Integration')} />
            </div>
          </div>
          
          <div className="text-left">
            <h4 className="text-xl sm:text-2xl font-semibold text-white mb-4 sm:mb-6">Backend & Cloud</h4>
            <div className="flex flex-wrap gap-2">
              <SkillTag skill="PostgreSQL" color={getSkillColor('PostgreSQL')} />
              <SkillTag skill="pgvector" color={getSkillColor('pgvector')} />
              <SkillTag skill="REST APIs" color={getSkillColor('REST APIs')} />
              <SkillTag skill="API Development" color={getSkillColor('API Development')} />
              <SkillTag skill="API Integration" color={getSkillColor('API Integration')} />
              <SkillTag skill="Lambda Functions" color={getSkillColor('Lambda Functions')} />
              <SkillTag skill="Vector Databases" color={getSkillColor('Vector Databases')} />
            </div>
          </div>
          
          <div className="text-left">
            <h4 className="text-xl sm:text-2xl font-semibold text-white mb-4 sm:mb-6">Networking & Infrastructure</h4>
            <div className="flex flex-wrap gap-2">
              <SkillTag skill="Network Administration" color={getSkillColor('Network Administration')} />
              <SkillTag skill="System Integration" color={getSkillColor('System Integration')} />
              <SkillTag skill="NAS Management" color={getSkillColor('NAS Management')} />
              <SkillTag skill="SSH" color={getSkillColor('SSH')} />
              <SkillTag skill="Technical Support" color={getSkillColor('Technical Support')} />
              <SkillTag skill="Infrastructure" color={getSkillColor('Infrastructure')} />
              <SkillTag skill="Staff Training" color={getSkillColor('Staff Training')} />
              <SkillTag skill="Team Leadership" color={getSkillColor('Team Leadership')} />
              <SkillTag skill="Frontend Design" color={getSkillColor('Frontend Design')} />
              <SkillTag skill="Technical Presentations" color={getSkillColor('Technical Presentations')} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
