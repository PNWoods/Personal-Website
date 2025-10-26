// Skill color mapping organized by topic for better visual consistency
export const skillColors: Record<string, string> = {
  // Programming Languages - Blue theme
  'Java': 'blue',
  'C': 'blue',
  'C++': 'blue',
  'Python': 'blue',
  'Swift': 'blue',
  'SQL': 'blue',
  'Prolog': 'blue',
  'Next.js': 'blue',
  'Node.js': 'blue',
  'PowerShell': 'blue',
  
  // Frameworks & Libraries - Green theme
  'LangChain': 'green',
  'Hugging Face': 'green',
  'OpenAI API': 'green',
  'NumPy': 'green',
  'Pandas': 'green',
  'Matplotlib': 'green',
  'Flask': 'green',
  'CUDA Toolkit': 'green',
  'PyTorch': 'green',
  
  // Development Tools - Cyan theme
  'Visual Studio': 'cyan',
  'AWS': 'cyan',
  'Postman': 'cyan',
  'Git': 'cyan',
  'Trello': 'cyan',
  'Slurm': 'cyan',
  'Docker': 'cyan',
  'Docker Compose': 'cyan',
  'Cloudflare': 'cyan',
  
  // Operating Systems & Virtualization - Purple theme
  'Windows': 'purple',
  'Linux/Unix': 'purple',
  'macOS': 'purple',
  'Windows Server': 'purple',
  'VMware Virtualization': 'purple',
  
  // AI, ML, and HPC - Orange theme
  'RAG': 'orange',
  'Multi-Agent RAG': 'orange',
  'AI Training': 'orange',
  'Parallel Computing': 'orange',
  'GPU Accelerated Programming': 'orange',
  'Palmetto Cluster HPC': 'orange',
  'Distributed Computing': 'orange',
  'LLM Optimization': 'orange',
  'Knowledge Distillation': 'orange',
  'Parameter-Efficient Fine-Tuning (PEFT)': 'orange',
  'Model Compression': 'orange',
  'Inference Optimization': 'orange',
  'Quantization': 'orange',
  'Pruning': 'orange',
  'Edge Computing': 'orange',
  'Vector Database Integration': 'orange',
  
  
  // Backend & Cloud - Pink theme
  'PostgreSQL': 'pink',
  'pgvector': 'pink',
  'REST APIs': 'pink',
  'API Development': 'pink',
  'API Integration': 'pink',
  'Lambda Functions': 'pink',
  'Vector Databases': 'pink',
  'API Calls': 'pink',
  'Microservices': 'pink',
  'Cloud Databases': 'pink',
  'Relational Databases': 'pink',
  
  // Networking & Infrastructure - Yellow theme
  'Network Administration': 'yellow',
  'System Integration': 'yellow',
  'NAS Management': 'yellow',
  'SSH': 'yellow',
  'Technical Support': 'yellow',
  'Infrastructure': 'yellow',
  'Staff Training': 'yellow',
  'Team Leadership': 'yellow',
  'Frontend Design': 'yellow',
  'Technical Presentations': 'yellow'
}

export const getSkillColor = (skill: string): string => {
  return skillColors[skill] || 'blue' // Default to blue if not found
}
