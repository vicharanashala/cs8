import { useState, useEffect } from 'react';

const API = '/api/faqs/top';

function getToken() {
  return localStorage.getItem('faq_access_token');
}

function getRankLabel(rank) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

function TopFAQItem({ faq, onToggle, isExpanded, userVote, onVote }) {
  const isOpen = isExpanded === faq._id;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.6rem',
        padding: '0.65rem 0',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Rank badge */}
      <span
        style={{
          fontSize: '0.95rem',
          minWidth: '1.6rem',
          textAlign: 'center',
          paddingTop: '0.1rem',
          flexShrink: 0,
        }}
        aria-label={`Rank ${faq.rank}`}
      >
        {getRankLabel(faq.rank)}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Question */}
        <button
          onClick={() => onToggle(faq._id)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            textAlign: 'left',
            width: '100%',
            fontSize: '0.88rem',
            fontWeight: 600,
            color: isOpen ? 'var(--primary)' : 'var(--text)',
            lineHeight: 1.4,
            textDecoration: 'none',
            display: 'block',
          }}
          aria-expanded={isOpen}
        >
          {faq.question}
        </button>

        {/* Expanded answer */}
        {isOpen && (
          <div
            style={{
              marginTop: '0.5rem',
              padding: '0.6rem 0.75rem',
              background: 'var(--surface-secondary)',
              borderRadius: '6px',
              borderLeft: '3px solid var(--primary)',
              fontSize: '0.85rem',
              lineHeight: 1.55,
              color: 'var(--text)',
            }}
          >
            <div>{faq.answer}</div>

            {/* Category + tags */}
            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.5rem', alignItems: 'center' }}>
              {faq.category && faq.category !== 'other' && (
                <span className="tag">{faq.category}</span>
              )}
              {(faq.tags || []).slice(0, 3).map(t => (
                <span key={t} className="tag" style={{ fontSize: '0.72rem' }}>{t}</span>
              ))}
            </div>

            {/* Vote buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
              <button
                className={`btn btn-ghost btn-sm ${userVote === 'helpful' ? 'voted-helpful' : ''}`}
                onClick={e => { e.stopPropagation(); onVote(faq._id, 'helpful'); }}
                aria-pressed={userVote === 'helpful'}
                title="Mark as helpful"
              >
                👍 Helpful <span>{faq.helpful}</span>
              </button>
              <button
                className={`btn btn-ghost btn-sm ${userVote === 'not_helpful' ? 'voted-not-helpful' : ''}`}
                onClick={e => { e.stopPropagation(); onVote(faq._id, 'not_helpful'); }}
                aria-pressed={userVote === 'not_helpful'}
                title="Mark as not helpful"
              >
                👎 Not Helpful <span>{faq.notHelpful}</span>
              </button>
            </div>

            {/* Collapse button */}
            <button
              className="btn btn-ghost btn-sm"
              onClick={e => { e.stopPropagation(); onToggle(faq._id); }}
              style={{ marginTop: '0.4rem', fontSize: '0.75rem' }}
            >
              ▲ Collapse
            </button>
          </div>
        )}

        {/* Collapsed stats row */}
        {!isOpen && (
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', alignItems: 'center' }}>
            {faq.category && faq.category !== 'other' && (
              <span className="tag" style={{ fontSize: '0.72rem' }}>{faq.category}</span>
            )}
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              👍 {faq.helpful} · 👁 {faq.viewCount || 0}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TopFAQsWidget({ limit = 10, showTitle = true, style = {}, category }) {
  const [data, setData] = useState({ faqs: [], count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [userVotes, setUserVotes] = useState({});
  const [voteLoading, setVoteLoading] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (category && category !== 'all') params.set('category', category);
    fetch(`${API}?${params.toString()}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load');
        return res.json();
      })
      .then(json => {
        setData({ faqs: json.faqs || [], count: json.count || 0 });
        setLoading(false);
      })
      .catch(() => {
        setError('Could not load top FAQs');
        setLoading(false);
      });
  }, [limit, category]);

  // When widget opens, fetch user vote for each visible FAQ
  const handleToggle = async (faqId) => {
    if (expandedId !== faqId) {
      const token = getToken();
      if (token && !userVotes[faqId]) {
        try {
          const res = await fetch(`/api/faqs/${faqId}/my-vote`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const json = await res.json();
          if (res.ok && json.data?.myVote) {
            setUserVotes(prev => ({ ...prev, [faqId]: json.data.myVote }));
          }
        } catch { /* ignore */ }
      }
    }
    setExpandedId(prev => prev === faqId ? null : faqId);
  };

  const handleVote = async (faqId, vote) => {
    const token = getToken();
    if (!token) return;

    const prev = userVotes[faqId] || null;
    const toggling = prev === vote; // removing vote

    // Optimistic update
    setData(prev => ({
      ...prev,
      faqs: prev.faqs.map(f => {
        if (f._id !== faqId) return f;
        let { helpful, notHelpful } = f;
        if (prev === 'helpful') helpful = Math.max(0, helpful - 1);
        if (prev === 'not_helpful') notHelpful = Math.max(0, notHelpful - 1);
        if (!toggling) {
          if (vote === 'helpful') helpful += 1;
          if (vote === 'not_helpful') notHelpful += 1;
        }
        return { ...f, helpful, notHelpful };
      }),
    }));
    setUserVotes(prev => ({ ...prev, [faqId]: toggling ? null : vote }));

    try {
      if (toggling) {
        await fetch(`/api/faqs/${faqId}/vote`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await fetch(`/api/faqs/${faqId}/vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ vote }),
        });
      }
    } catch {
      // revert on error — refetch
      const res = await fetch(`${API}?limit=${limit}`);
      const json = await res.json();
      setData({ faqs: json.faqs || [], count: json.count || 0 });
    }
  };

  if (error) return null; // silent fail — widget is non-critical
  if (loading) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', ...style }}>
        Loading top FAQs…
      </div>
    );
  }
  if (!data.faqs.length) return null;

  return (
    <section
      style={{
        background: 'var(--card-bg)',
        border: '2px solid var(--primary)',
        borderRadius: '12px',
        padding: '1rem 1.1rem',
        marginBottom: '1.75rem',
        boxShadow: '0 2px 12px rgba(74,107,255,0.08)',
        ...style,
      }}
      aria-label="Top 10 Most Helpful FAQs"
    >
      {showTitle && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '1.1rem' }}>🏆</span>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>
            Top {data.faqs.length} Most Helpful FAQs
          </h2>
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            by community votes
          </span>
        </div>
      )}

      <div>
        {data.faqs.map(faq => (
          <TopFAQItem
            key={faq._id}
            faq={faq}
            onToggle={handleToggle}
            isExpanded={expandedId}
            userVote={userVotes[faq._id]}
            onVote={handleVote}
          />
        ))}
      </div>
    </section>
  );
}
