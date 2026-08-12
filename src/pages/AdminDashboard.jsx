import { useEffect, useState } from 'react';
import api from '../api/axios';
import usePermission from '../hooks/userPermission';

const StatCard = ({ label, value, color = 'blue' }) => {
  const colors = {
    blue:   { bg: '#E6F1FB', text: '#0C447C' },
    green:  { bg: '#EAF3DE', text: '#27500A' },
    amber:  { bg: '#FAEEDA', text: '#633806' },
    purple: { bg: '#EEEDFE', text: '#3C3489' },
  };
  const c = colors[color] || colors.blue;
  return (
    <div style={{ background: c.bg, borderRadius: 12, padding: '1.25rem' }}>
      <span style={{ fontSize: 13, color: c.text, fontWeight: 500 }}>{label}</span>
      <p style={{ fontSize: 28, fontWeight: 600, color: c.text, margin: '8px 0 0' }}>{value ?? 0}</p>
    </div>
  );
};

const Badge = ({ active }) => (
  <span style={{
    fontSize: 11, fontWeight: 500, padding: '2px 10px', borderRadius: 20,
    background: active ? '#EAF3DE' : '#FCEBEB',
    color: active ? '#27500A' : '#791F1F',
  }}>{active ? 'Active' : 'Inactive'}</span>
);

const Section = ({ title, children }) => (
  <div style={{
    background: 'var(--color-background-primary)',
    border: '0.5px solid var(--color-border-tertiary)',
    borderRadius: 12, padding: '1.25rem',
  }}>
    <h2 style={{ fontSize: 15, fontWeight: 500, margin: '0 0 1rem', color: 'var(--color-text-primary)' }}>{title}</h2>
    {children}
  </div>
);

export default function AdminDashboard() {
  const { user } = usePermission();
  const [stats, setStats]       = useState(null);
  const [projects, setProjects] = useState([]);
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/submissions/stats'),
      api.get('/projects'),
      api.get('/users'),
    ])
      .then(([s, p, u]) => {
        setStats(s.data.data);
        setProjects(p.data.data || []);
        setUsers(u.data.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>Loading...</div>;

  return (
    <div style={{ padding: '1.5rem', maxWidth: 960, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0, color: 'var(--color-text-primary)' }}>Admin Dashboard</h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>
          Welcome, {user?.firstName}. Manage your projects and team.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: '1.5rem' }}>
        <StatCard label="Total Submissions" value={stats?.total}                        color="blue"   />
        <StatCard label="Today's Entries"   value={stats?.today}                        color="green"  />
        <StatCard label="Active Projects"   value={projects.filter(p => p.isActive).length} color="purple" />
        <StatCard label="Team Members"      value={users.filter(u => u.role === 'team_member').length} color="amber" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Section title="Submissions by form">
          {stats?.byForm?.length ? stats.byForm.map(f => (
            <div key={f._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{f._id}</span>
              <div style={{ flex: 1, margin: '0 12px', height: 6, background: 'var(--color-background-tertiary)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: 6, background: '#185FA5', borderRadius: 4, width: stats.total ? `${(f.count / stats.total) * 100}%` : '0%' }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{f.count}</span>
            </div>
          )) : <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>No submissions yet.</p>}
        </Section>

        <Section title="Top contributors">
          {stats?.byUser?.length ? stats.byUser.slice(0, 5).map((u, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{u.name || u._id}</span>
              <span style={{ fontSize: 12, fontWeight: 500, background: '#E6F1FB', color: '#0C447C', padding: '2px 10px', borderRadius: 20 }}>{u.count}</span>
            </div>
          )) : <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>No data yet.</p>}
        </Section>
      </div>

      <Section title="Projects">
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
              {['Project name', 'Forms enabled', 'Status'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 12px 8px 0', color: 'var(--color-text-secondary)', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projects.map(p => (
              <tr key={p._id} style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                <td style={{ padding: '10px 12px 10px 0', fontWeight: 500, color: 'var(--color-text-primary)' }}>{p.name}</td>
                <td style={{ padding: '10px 12px 10px 0', color: 'var(--color-text-secondary)' }}>{(p.enabledForms || []).join(', ') || '—'}</td>
                <td style={{ padding: '10px 0' }}><Badge active={p.isActive} /></td>
              </tr>
            ))}
            {!projects.length && <tr><td colSpan={3} style={{ padding: '1rem 0', color: 'var(--color-text-tertiary)', fontSize: 13 }}>No projects yet.</td></tr>}
          </tbody>
        </table>
      </Section>
    </div>
  );
}