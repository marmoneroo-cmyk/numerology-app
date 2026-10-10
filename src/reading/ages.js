/** A life cycle's ages as the screens write them: "32–41", or "50+" for the last, which never ends. */
export const agesText = ({ from, to }) => (to === null ? `${from}+` : `${from}–${to}`);
