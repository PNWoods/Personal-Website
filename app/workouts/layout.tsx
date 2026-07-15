import WorkoutsNav from '@/components/workouts/WorkoutsNav'

export const metadata = {
  title: 'Workouts',
}

export default function WorkoutsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-full overflow-y-auto overscroll-contain">
      <div className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6 text-white">
        <WorkoutsNav />
        {children}
      </div>
    </div>
  )
}
