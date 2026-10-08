const sameId = (a, b) => String(a) === String(b);

const includesId = (list, id) => list.some((item) => sameId(item, id));

const uniqueIds = (ids) => [...new Set(ids.map(String))];

const isGroupMember = (group, user) => includesId(group.members, user._id);
const isGroupAdmin = (group, user) => includesId(group.admins, user._id);
const isEventParticipant = (event, user) => includesId(event.participants, user._id);
const isEventOrganizer = (event, user) => includesId(event.organizers, user._id);

module.exports = {
  sameId,
  includesId,
  uniqueIds,
  isGroupMember,
  isGroupAdmin,
  isEventParticipant,
  isEventOrganizer,
};
