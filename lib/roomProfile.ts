export const ROOM_DESCRIPTION_LIMIT = 500
export const ROOM_IMAGE_LIMIT = 2 * 1024 * 1024
export const ROOM_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export interface RoomProfileDraft {
  description: string
  avatarUrl: string | null
  backgroundImageUrl: string | null
  avatarFile?: File
  backgroundFile?: File
}

export const roomProfileDraft = (room?: { description?: string | null; avatarUrl?: string | null; backgroundImageUrl?: string | null }): RoomProfileDraft => ({
  description: room?.description ?? '',
  avatarUrl: room?.avatarUrl ?? null,
  backgroundImageUrl: room?.backgroundImageUrl ?? null,
})

export function roomFormData(name: string, privacy: string, profile: RoomProfileDraft) {
  const body = new FormData()
  body.set('name', name)
  body.set('privacy', privacy)
  body.set('description', profile.description)
  if (profile.avatarFile) body.set('avatar', profile.avatarFile)
  else if (!profile.avatarUrl) body.set('avatarUrl', '')
  if (profile.backgroundFile) body.set('background', profile.backgroundFile)
  else if (!profile.backgroundImageUrl) body.set('backgroundImageUrl', '')
  return body
}
