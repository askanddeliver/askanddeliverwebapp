/** Admin workspace calendar blocks (legacy docs omit ownerAuth0Id). */
export const ADMIN_TIME_BLOCK_OWNER_FILTER = {
  $or: [{ ownerAuth0Id: { $exists: false } }, { ownerAuth0Id: null }],
};

export function memberTimeBlockOwnerFilter(memberAuth0Id: string) {
  return { ownerAuth0Id: memberAuth0Id };
}
