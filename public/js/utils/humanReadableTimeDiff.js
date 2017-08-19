export default function humanReadableTimeDiff (date) {
  const dateDiff = Date.now() - date
  if (dateDiff <= 0 || Math.floor(dateDiff / 1000) === 0) {
    return 'now'
  }
  const sixtySeconds = 1000 * 60
  if (dateDiff < sixtySeconds) {
    return Math.floor(dateDiff / 1000) + 's'
  }
  const sixtyMinutes = sixtySeconds * 60
  if (dateDiff < sixtyMinutes) {
    return Math.floor(dateDiff / (1000 * 60)) + 'm'
  }
  const twentyFourHours = 1000 * 60 * 60 * 24
  if (dateDiff < twentyFourHours) {
    return Math.floor(dateDiff / (1000 * 60 * 60)) + 'h'
  }
  return Math.floor(dateDiff / (1000 * 60 * 60 * 24)) + 'd'
}