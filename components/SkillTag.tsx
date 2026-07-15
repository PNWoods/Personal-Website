export type SkillColor =
  | 'blue'
  | 'green'
  | 'purple'
  | 'orange'
  | 'cyan'
  | 'pink'
  | 'yellow'
  | 'red'
  | 'gray'

interface SkillTagProps {
  skill: string
  color?: SkillColor
}

const colorClasses: Record<SkillColor, string> = {
  blue: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  green: 'bg-green-500/20 text-green-300 border-green-500/30',
  purple: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  orange: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  cyan: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  pink: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  yellow: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  red: 'bg-red-500/20 text-red-300 border-red-500/30',
  gray: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
}

export default function SkillTag({ skill, color = 'blue' }: SkillTagProps) {
  return (
    <span className={`px-3 py-1 text-sm rounded-full border ${colorClasses[color]}`}>
      {skill}
    </span>
  )
}
