import { Award, CalendarDays, CalendarRange, CheckCheck, Flame, Folder, HelpCircle, Medal, Moon, Target, Timer, Users } from 'lucide-react'
import type { AchievementView } from '@/lib/achievements/definitions'
const icons = { focus: Target, sessions: Timer, streak: Flame, daily: CalendarDays, weekly: CalendarRange, projects: Folder, tasks: CheckCheck, coworking: Users, leaderboard: Medal, consistency: Award, secret: Moon }
export default function AchievementBadge({ item }: { item: AchievementView }) {
  const Icon = item.secret && !item.unlockedAt ? HelpCircle : icons[item.icon]
  return <span className="achievement-badge" data-rarity={item.rarity} data-locked={!item.unlockedAt} aria-hidden="true"><Icon size={22} strokeWidth={1.6} /></span>
}
