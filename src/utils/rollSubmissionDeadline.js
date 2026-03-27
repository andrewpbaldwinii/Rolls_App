/**
 * Camera / submission UX: treat submission_deadline as a calendar date in the user's local timezone.
 * The roll stays eligible through the entire deadline day (until local midnight rolls to the next day).
 * Missing deadline => still eligible (same idea as RollsContext "active" default).
 */

function localDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * @param {Object} roll
 * @returns {boolean} true if the user may still submit photos (deadline day is today or in the future, local time)
 */
export function isSubmissionOpenForCamera(roll) {
  if (!roll?.submission_deadline) {
    return true;
  }
  const deadline = new Date(roll.submission_deadline);
  if (Number.isNaN(deadline.getTime())) {
    return true;
  }
  const deadlineDay = localDateKey(deadline);
  const today = localDateKey(new Date());
  return today <= deadlineDay;
}
