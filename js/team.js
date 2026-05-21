import { escapeHtml } from './utils.js';

const defaultTeam = [
  { name: 'Team Member', role: 'Lead Photographer', phone: '', email: '', assignment: 'Coverage lead', status: 'Assigned' },
  { name: 'Team Member', role: 'Editor', phone: '', email: '', assignment: 'Editing and delivery', status: 'Ready' },
];

export function createDefaultTeam() {
  return defaultTeam.map(normalizeTeamMember);
}

export function createBlankTeamMember() {
  return normalizeTeamMember({
    name: 'New Team Member',
    role: 'Role',
    phone: '',
    email: '',
    assignment: 'Assignment notes',
    status: 'Available',
  });
}

export function normalizeTeamMember(member = {}) {
  return {
    name: member.name || 'Team Member',
    role: member.role || 'Role',
    phone: member.phone || '',
    email: member.email || '',
    assignment: member.assignment || '',
    status: member.status || 'Available',
  };
}

export function renderTeamEditorHtml(team = []) {
  return team.map((member, memberIndex) => `
    <div class="team-row" data-team-row="${memberIndex}">
      <div class="team-fields">
        <label><span>Name</span><input type="text" value="${escapeHtml(member.name)}" data-team-field="name"></label>
        <label><span>Role</span><input type="text" value="${escapeHtml(member.role)}" data-team-field="role"></label>
        <label><span>Status</span><input type="text" value="${escapeHtml(member.status)}" data-team-field="status"></label>
        <label><span>Phone</span><input type="tel" value="${escapeHtml(member.phone)}" data-team-field="phone"></label>
        <label><span>Email</span><input type="email" value="${escapeHtml(member.email)}" data-team-field="email"></label>
        <label class="full"><span>Assignment</span><textarea rows="2" data-team-field="assignment">${escapeHtml(member.assignment)}</textarea></label>
      </div>
      <button class="icon-button" type="button" aria-label="Remove team member" data-action="remove-team-member">x</button>
    </div>
  `).join('');
}