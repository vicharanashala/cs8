import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TopFAQsWidget from '../components/faq/TopFAQsWidget';

function getToken() {
  return localStorage.getItem('faq_access_token');
}

function getUser() {
  try { return JSON.parse(localStorage.getItem('faq_user') || 'null'); } catch { return null; }
}

const STATUS_LABEL = {
  open: '🟡 Open', assigned: '🟣 Assigned', pending_approval: '🔵 Review',
  resolved: '✅ Resolved', rejected: '❌ Rejected', closed: '⚫ Closed',
};
const STATUS_CLASS = {
  open: 'status-pending', assigned: 'status-pending',
  pending_approval: 'tag-pending', resolved: 'status-solved', rejected: 'status-rejected',
};

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.1rem 1.25rem' }}>
      <span style={{ fontSize: '1.8rem' }}>{icon}</span>
      <div>
        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: color || 'var(--primary)' }}>{value}</div>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>{label}</div>
        {sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function UserDashboardPage() {
  const navigate = useNavigate();
  const user = getUser();
  const [myStats, setMyStats] = useState(null);
  const [recommended, setRecommended] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [recentQueries, setRecentQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = getToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    Promise.all([
      fetch('/api/dashboard/my-stats', { headers }).then(r => r.json()),
      fetch('/api/dashboard/recommended-faqs?limit=6', { headers }).then(r => r.json()),
      fetch('/api/announcements', { headers }).then(r => r.json()),
      fetch('/api/queries', { headers }).then(r => r.json()),
    ]).then(([stats, rec, ann, qData]) => {
      if (stats.success) setMyStats(stats.data);
      if (rec.success) setRecommended(rec.data || []);
      if (ann.success) setAnnouncements(ann.data || []);
      if (qData.success) setRecentQueries((qData.data || []).slice(0, 5));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>{greeting()}, {user?.name?.split(' ')[0] || 'there'} 👋</h1>
        <p>Here's your personalized support overview</p>
      </div>

      {announcements.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          {announcements.slice(0, 2).map(a => (
            <div key={a._id} style={{
              padding: '0.85rem 1rem', borderRadius: '8px', marginBottom: '0.5rem',
              background: a.priority === 'urgent' ? '#fee2e2' : a.priority === 'warning' ? '#fef3c7' : '#eff6ff',
              borderLeft: `4px solid ${a.priority === 'urgent' ? '#ef4444' : a.priority === 'warning' ? '#f59e0b' : '#3b82f6'}`,
            }}>
              <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{a.title}</div>
              <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{a.content}</div>
            </div>
          ))}
        </div>
      )}

      {myStats && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.75rem' }}>
            <StatCard icon="📝" label="My Queries" value={myStats.totalQueries || 0} sub="total raised" color="var(--primary)" />
            <StatCard icon="🟡" label="Open" value={myStats.openQueries || 0} sub="awaiting response" color="#f59e0b" />
            <StatCard icon="✅" label="Resolved" value={myStats.resolvedQueries || 0} sub="answered" color="#10b981" />
            <StatCard icon="🏆" label="Reputation" value={myStats.stats?.reputationPoints || 0} sub="points earned" color="#f97316" />
          </div>
          <section style={{ marginBottom: '1.75rem' }}>
            <TopFAQsWidget showTitle={true} />
          </section>
        </>
      )}

      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>📋 My Recent Queries</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/resolve')}>View all →</button>
        </div>
        {recentQueries.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>
            No queries yet. <button className="btn btn-ghost btn-sm" onClick={() => navigate('/raise')}>Raise one →</button>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {recentQueries.map((q, i) => (
              <div key={q._id} style={{
                padding: '0.85rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
                borderBottom: i < recentQueries.length - 1 ? '1px solid var(--border)' : 'none',
                cursor: 'pointer',
              }} onClick={() => navigate('/resolve')}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {q.question}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(q.createdAt).toLocaleDateString()} · {q.category}
                  </div>
                </div>
                <span className={`status-badge ${STATUS_CLASS[q.status] || ''}`} style={{ fontSize: '0.72rem', flexShrink: 0 }}>
                  {STATUS_LABEL[q.status] || q.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>💡 Recommended for You</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>Browse all →</button>
        </div>
        {recommended.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>
            Explore our <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>FAQ library →</button>
          </div>
        ) : (
          <div className="card-grid">
            {recommended.map(faq => (
              <div key={faq._id} className="card faq-card" style={{ padding: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', marginBottom: '0.3rem' }}>
                  <span className="q-icon" style={{ color: 'var(--primary)', fontWeight: 700, flexShrink: 0 }}>Q</span>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', lineHeight: 1.4 }}>{faq.question}</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', paddingLeft: '1.2rem', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {faq.answer}
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', alignItems: 'center' }}>
                  {faq.category && <span className="tag" style={{ fontSize: '0.68rem' }}>{faq.category}</span>}
                  <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-muted)' }}>👍 {faq.helpful || 0}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
