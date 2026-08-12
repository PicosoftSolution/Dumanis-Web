import { useEffect, useState } from 'react';
import api from '../api/axios';
import usePermission from '../hooks/userPermission';

const StatCard = ({ label, value, color = 'blue' }) => {
  const colors = {
    blue:   { bg: '#E6F1FB', text: '#0C447C' },
    green:  { bg: '#EAF3DE', text: '#27500A' },
    amber:  { bg: '#FAEEDA', text: '#633806' },
  };
  const c = colors[color] || colors.blue;
  return (
    <div style={{ background: c.bg, borderRadius: 12, padding: '1.25rem' }}>
      <span style={{ fontSize: 13, color: c.text, fontWeight: 500 }}>{label}</span>
      <p style={{ fontSize: 28, fontWeight: 600, color: c.text, margin: '8px 0 0' }}>{value ?? 0}</p>
    </div>
  );
};

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

export default function TeamMemberDashboard() {
  const { user } = usePermission();
  const [stats, setStats]       = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/submissions/stats'),
      api.get('/projects'),
    ])
      .then(([s, p]) => {
        setStats(s.data.data);
        setProjects(p.data.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>Loading...</div>;

  return (
    <div style={{ padding: '1.5rem', maxWidth: 960, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0, color: 'var(--color-text-primary)' }}>My Dashboard</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>
            Welcome, {user?.firstName}. Here's your activity summary.
          </p>
        </div>
        <a href="/entry" style={{ padding: '10px 18px', background: '#185FA5', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
          + New Entry
        </a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: '1.5rem' }}>
        <StatCard label="My Total Entries" value={stats?.total} color="blue"  />
        <StatCard label="Today's Entries"  value={stats?.today} color="green" />
        <StatCard label="This Week"        value={stats?.week}  color="amber" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Section title="My submissions by form">
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

        <Section title="My assigned projects">
          {projects.length ? projects.map(p => (
            <div key={p._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500 }}>{p.name}</span>
              <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 10px', borderRadius: 20, background: p.isActive ? '#EAF3DE' : '#FCEBEB', color: p.isActive ? '#27500A' : '#791F1F' }}>
                {p.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          )) : <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>No projects assigned.</p>}
        </Section>
      </div>
    </div>
  );
}