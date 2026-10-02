// Molduras de avatar desbloqueadas pelas medalhas (a lista oficial vem de /auth/me/rewards).
export const frameClass = user => (user?.moldura ? `av-frame ${user.moldura}` : '');
