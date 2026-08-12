import usePermission from '../hooks/userPermission';

export default function TeamPage() {
  const { canAddTeamMembers } = usePermission();

  return (
    <div style={{ padding: '1.5rem' }}>
      <h1 style={{ fontSize: 22, fontWeight: 500, margin: '0 0 0.5rem', color: 'var(--color-text-primary)' }}>Team</h1>
      <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
        {canAddTeamMembers ? 'Manage your team members.' : 'View your team.'}
      </p>
    </div>
  );
}