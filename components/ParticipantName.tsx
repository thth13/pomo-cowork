export function getParticipantIdentity(username: string, guestLabel: string) {
  const isGuest = /^Guest(?:\s*#|-)/i.test(username)
  const guestCode = isGuest ? username.replace(/^Guest(?:\s*#|-)/i, '').slice(-4).toUpperCase() : ''
  return {
    isGuest,
    guestCode,
    displayName: isGuest ? `${guestLabel} #${guestCode}` : username,
  }
}

export default function ParticipantName({ username, guestLabel }: { username: string; guestLabel: string }) {
  const { isGuest, guestCode } = getParticipantIdentity(username, guestLabel)
  return isGuest ? (
    <>{guestLabel} <span className="guest-identity-code">#{guestCode}</span></>
  ) : <>{username}</>
}
