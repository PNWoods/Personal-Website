import SkillTag from '../SkillTag'
import { SKILL_GROUPS } from '../../data/skills'

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
          {SKILL_GROUPS.map((g) => (
            <div key={g.title}>
              <h2 className="mb-4 text-xl font-semibold text-white sm:text-2xl">{g.title}</h2>
              <div className="flex flex-wrap gap-2">
                {g.skills.map((s) => (
                  <SkillTag key={s} skill={s} color={g.color} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
