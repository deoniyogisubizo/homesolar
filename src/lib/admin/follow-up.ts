export function followUpCutoff(minutes: number, now = Date.now()) {
  return new Date(now - minutes * 60_000);
}

export function isFollowUpDue(createdAt: Date, minutes: number, now = Date.now()) {
  return now - createdAt.getTime() > minutes * 60_000;
}
