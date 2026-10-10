/**
 * Returns the human-readable display name for a user object.
 * Uses first_name/last_name (canonical profile name), falling back to username.
 */
export function getUserDisplayName(user) {
  if (!user) return 'User';
  if (user.full_name) return user.full_name;
  const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  return name || user.username || user.email?.split('@')[0] || 'User';
}
