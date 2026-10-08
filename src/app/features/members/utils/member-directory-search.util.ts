/** Minimum characters before the parish member directory applies a text search. */
export const MEMBER_DIRECTORY_SEARCH_MIN_LENGTH = 2;

/** Search string sent to `GET /api/members` (trimmed; omitted until min length). */
export function memberDirectorySearchParam(raw: string | null | undefined): string | undefined {
  const trimmed = (raw ?? '').trim();
  if (trimmed.length < MEMBER_DIRECTORY_SEARCH_MIN_LENGTH) {
    return undefined;
  }

  return trimmed;
}

/** Case-insensitive key for duplicate detection while typing. */
export function memberDirectorySearchKey(raw: string | null | undefined): string {
  const param = memberDirectorySearchParam(raw);
  return param ? param.toLocaleLowerCase() : '';
}
