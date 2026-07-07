// Always return the current hour in US Eastern Time regardless of device locale
export function getEasternHour(): number {
  const str = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    hour12: false,
    timeZone: 'America/New_York',
  }).format(new Date())
  return parseInt(str, 10) % 24
}
