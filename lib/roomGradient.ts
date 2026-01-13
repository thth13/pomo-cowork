export interface RoomGradientOption {
	key: RoomGradientKey
	label: string
	className: string
}

export const ROOM_GRADIENT_OPTIONS = [
	// No background
	{
		key: 'none',
		label: 'No background',
		className: 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800',
	},
	// Soft multi-stop (existing style)
	{
		key: 'primary-to-secondary',
		label: 'Primary → Secondary',
		className:
			'bg-gradient-to-br from-primary-50 via-white to-secondary-50 dark:from-primary-900/25 dark:via-slate-950 dark:to-secondary-900/25',
	},
	{
		key: 'secondary-to-primary',
		label: 'Secondary → Primary',
		className:
			'bg-gradient-to-br from-secondary-50 via-white to-primary-50 dark:from-secondary-900/25 dark:via-slate-950 dark:to-primary-900/25',
	},
	{
		key: 'primary-soft',
		label: 'Primary Soft',
		className:
			'bg-gradient-to-br from-primary-50 via-gray-50 to-primary-100 dark:from-primary-900/25 dark:via-slate-950 dark:to-primary-800/20',
	},
	{
		key: 'secondary-soft',
		label: 'Secondary Soft',
		className:
			'bg-gradient-to-br from-secondary-50 via-gray-50 to-secondary-100 dark:from-secondary-900/25 dark:via-slate-950 dark:to-secondary-800/20',
	},
	{
		key: 'primary-soft-neutral',
		label: 'Primary + Neutral',
		className:
			'bg-gradient-to-br from-primary-100 via-gray-50 to-secondary-100 dark:from-primary-900/30 dark:via-slate-950 dark:to-secondary-900/20',
	},
	{
		key: 'secondary-soft-neutral',
		label: 'Secondary + Neutral',
		className:
			'bg-gradient-to-br from-secondary-100 via-gray-50 to-primary-100 dark:from-secondary-900/30 dark:via-slate-950 dark:to-primary-900/20',
	},

	{
		key: 'primary-soft-white',
		label: 'Primary + White',
		className:
			'bg-gradient-to-br from-primary-50 via-white to-primary-100 dark:from-primary-900/25 dark:via-slate-950 dark:to-primary-800/20',
	},
	{
		key: 'secondary-soft-white',
		label: 'Secondary + White',
		className:
			'bg-gradient-to-br from-secondary-50 via-white to-secondary-100 dark:from-secondary-900/25 dark:via-slate-950 dark:to-secondary-800/20',
	},

	{
		key: 'violet-soft',
		label: 'Violet Soft (via)',
		className:
			'bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 dark:from-violet-900/25 dark:via-slate-950 dark:to-fuchsia-900/25',
	},
	{
		key: 'rose-soft',
		label: 'Rose Soft (via)',
		className:
			'bg-gradient-to-br from-rose-50 via-white to-red-50 dark:from-rose-900/25 dark:via-slate-950 dark:to-red-900/25',
	},
	{
		key: 'emerald-soft',
		label: 'Emerald Soft (via)',
		className:
			'bg-gradient-to-br from-emerald-50 via-white to-green-50 dark:from-emerald-900/25 dark:via-slate-950 dark:to-green-900/25',
	},
	{
		key: 'sky-soft',
		label: 'Sky Soft (via)',
		className:
			'bg-gradient-to-br from-sky-50 via-white to-indigo-50 dark:from-sky-900/25 dark:via-slate-950 dark:to-indigo-900/25',
	},
	{
		key: 'amber-soft',
		label: 'Amber Soft (via)',
		className:
			'bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-amber-900/25 dark:via-slate-950 dark:to-orange-900/25',
	},
	{
		key: 'teal-soft',
		label: 'Teal Soft (via)',
		className:
			'bg-gradient-to-br from-teal-50 via-white to-cyan-50 dark:from-teal-900/25 dark:via-slate-950 dark:to-cyan-900/25',
	},

	// Pastel (two-color transition, no `via`)
	{
		key: 'violet-to-pink',
		label: 'Violet → Pink',
		className: 'bg-gradient-to-br from-violet-50 to-fuchsia-100 dark:from-violet-900/25 dark:to-fuchsia-900/25',
	},
	{
		key: 'rose-to-red',
		label: 'Rose → Red',
		className: 'bg-gradient-to-br from-rose-50 to-red-100 dark:from-rose-900/25 dark:to-red-900/25',
	},
	{
		key: 'green-to-emerald',
		label: 'Green → Emerald',
		className: 'bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/25 dark:to-emerald-900/25',
	},
	{
		key: 'sky-to-indigo',
		label: 'Sky → Indigo',
		className: 'bg-gradient-to-br from-sky-50 to-indigo-100 dark:from-sky-900/25 dark:to-indigo-900/25',
	},
	{
		key: 'amber-to-orange',
		label: 'Amber → Orange',
		className: 'bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-900/25 dark:to-orange-900/25',
	},
	{
		key: 'teal-to-cyan',
		label: 'Teal → Cyan',
		className: 'bg-gradient-to-br from-teal-50 to-cyan-100 dark:from-teal-900/25 dark:to-cyan-900/25',
	},
] as const

export type RoomGradientKey = (typeof ROOM_GRADIENT_OPTIONS)[number]['key']

const ROOM_GRADIENT_BY_KEY: Record<RoomGradientKey, string> = ROOM_GRADIENT_OPTIONS.reduce(
	(acc, option) => {
		acc[option.key] = option.className
		return acc
	},
	{} as Record<RoomGradientKey, string>
)

const ROOM_GRADIENT_KEYS = new Set<RoomGradientKey>(ROOM_GRADIENT_OPTIONS.map((o) => o.key))

const hashStringToInt32 = (value: string): number => {
	let hash = 0
	for (let i = 0; i < value.length; i += 1) {
		hash = (hash << 5) - hash + value.charCodeAt(i)
		hash |= 0
	}
	return hash
}

export const isRoomGradientKey = (value: unknown): value is RoomGradientKey => {
	return typeof value === 'string' && ROOM_GRADIENT_KEYS.has(value as RoomGradientKey)
}

export const getRoomGradientClass = (
	roomId?: string | null,
	backgroundGradientKey?: string | null
): string | null => {
	if (backgroundGradientKey && isRoomGradientKey(backgroundGradientKey)) {
		return ROOM_GRADIENT_BY_KEY[backgroundGradientKey]
	}

	if (!roomId) return null
	const hash = hashStringToInt32(roomId)
	const index = Math.abs(hash) % ROOM_GRADIENT_OPTIONS.length
	return ROOM_GRADIENT_OPTIONS[index]?.className ?? null
}
