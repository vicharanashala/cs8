import { useState, useEffect, useCallback, useRef } from 'react';
import TopFAQsWidget from '../components/faq/TopFAQsWidget';

const API = '/api/faqs';
const CAT_API = '/api/categories';

function getToken() {
  return localStorage.getItem('faq_access_token');
}

const SORT_OPTIONS = [
  { value: 'helpful', label: '⭐ Most Useful' },
  { value: 'newest', label: '🕐 Newest' },
  { value: 'views', label: '👁 Most Viewed' },
  { value: 'rated', label: '★ Top Rated' },
  { value: 'oldest', label: '🕘 Oldest' },
];

function VoteButtons({ faqId, helpful, notHelpful, myVote, onVote }) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
      <button
        className={`btn btn-ghost btn-sm ${myVote === 'helpful' ? 'voted-helpful' : ''}`}
        onClick={e => { e.stopPropagation(); onVote(faqId, 'helpful'); }}
        title={myVote === 'helpful' ? 'Remove helpful vote' : 'Mark as helpful'}
        aria-pressed={myVote === 'helpful'}
        aria-label={`Helpful (${helpful} votes)`}
      >
        👍 Helpful <span className="vote-count" style={{ transition: 'transform 0.15s', display: 'inline-block' }}>{helpful}</span>
      </button>
      <button
        className={`btn btn-ghost btn-sm ${myVote === 'not_helpful' ? 'voted-not-helpful' : ''}`}
        onClick={e => { e.stopPropagation(); onVote(faqId, 'not_helpful'); }}
        title={myVote === 'not_helpful' ? 'Remove vote' : 'Mark as not helpful'}
        aria-pressed={myVote === 'not_helpful'}
        aria-label={`Not helpful (${notHelpful} votes)`}
      >
        👎 Not Helpful <span style={{ transition: 'transform 0.15s', display: 'inline-block' }}>{notHelpful}</span>
      </button>
    </div>
  );
}

function FAQCard({ faq, isExpanded, onToggle, onVote, userVote, categoryLabel }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isExpanded === faq._id) setIsOpen(true);
    else setIsOpen(false);
  }, [isExpanded, faq._id]);

  const catDisplay = categoryLabel(faq.category);

  return (
    <div
      className="card faq-card"
      style={{ cursor: 'pointer', padding: 0, overflow: 'hidden', transition: 'box-shadow 0.2s' }}
      onClick={() => onToggle(faq._id)}
      role="button"
      aria-expanded={isOpen}
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onToggle(faq._id)}
    >
      {isOpen && (
        <>
          <div style={{ padding: '1rem 1.1rem 0' }}>
            <div className="faq-question">
              <span className="q-icon">Q</span>
              <span>{faq.question}</span>
            </div>
            {faq.category && (
              <div style={{ marginBottom: '0.5rem', marginLeft: '1.7rem' }}>
                <span className="tag">{catDisplay}</span>
              </div>
            )}
            <div style={{
              marginLeft: '1.7rem',
              padding: '0.75rem 0.9rem',
              background: 'var(--surface-secondary)',
              borderRadius: '8px',
              borderLeft: '3px solid var(--primary)',
              fontSize: '0.92rem',
              lineHeight: 1.6,
              color: 'var(--text)',
              marginBottom: '0.75rem',
            }}>
              {faq.answer}
            </div>
            <div className="faq-tags">
              {(faq.tags || []).map(t => <span key={t} className="tag">{t}</span>)}
              <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                👁 {faq.viewCount || 0}
                {faq.averageRating > 0 && ` · ★ ${faq.averageRating}`}
              </span>
            </div>
            <VoteButtons
              faqId={faq._id}
              helpful={faq.helpful || 0}
              notHelpful={faq.notHelpful || 0}
              myVote={userVote || null}
              onVote={onVote}
            />
          </div>
          <div style={{ padding: '0 1rem 0.75rem', marginTop: '0.25rem', textAlign: 'right' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={e => { e.stopPropagation(); onToggle(faq._id); }}
              aria-label="Collapse FAQ"
            >
              ▲ Collapse
            </button>
          </div>
        </>
      )}
      {!isOpen && (
        <div style={{ padding: '0.9rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '0.92rem', lineHeight: 1.4, display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
              <span style={{ color: 'var(--primary)', fontWeight: 800, flexShrink: 0 }}>Q</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{faq.question}</span>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {faq.category && <span className="tag" style={{ fontSize: '0.7rem' }}>{catDisplay}</span>}
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>👍 {faq.helpful || 0}</span>
            </div>
          </div>
          <span style={{ color: 'var(--text-muted)', flexShrink: 0, fontSize: '1rem' }}>▼</span>
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  const [faqs, setFaqs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [userVotes, setUserVotes] = useState({});
  const [sort, setSort] = useState('helpful');
  const searchTimer = useRef(null);

  useEffect(() => {
    fetch(CAT_API)
      .then(r => r.json())
      .then(data => { if (data.success) setCategories(data.data || []); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  const categoryLabel = useCallback((name) => {
    if (!name) return 'Other';
    const c = categories.find(x => x.name === name);
    return c ? `${c.icon || ''} ${c.displayName}`.trim() : name;
  }, [categories]);

  const fetchFAQs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeCategory && activeCategory !== 'all') params.set('category', activeCategory);
      if (debouncedSearch) params.set('search', debouncedSearch);
      params.set('sort', sort);
      const res = await fetch(`${API}?${params.toString()}`);
      const data = await res.json();
      if (res.ok) setFaqs(data.data || []);
    } catch {
      setFaqs([]);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, debouncedSearch, sort]);

  useEffect(() => {
    fetchFAQs();
  }, [fetchFAQs]);

  const open = (id) => setExpandedId(prev => prev === id ? null : id);

  const activeSortLabel = SORT_OPTIONS.find(o => o.value === sort)?.label || 'Sorted';

  const fetchMyVote = async (faqId) => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API}/${faqId}/my-vote`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.data?.myVote) {
        setUserVotes(prev => ({ ...prev, [faqId]: data.data.myVote }));
      }
    } catch { /* silent */ }
  };

  const handleVote = async (faqId, vote) => {
    const token = getToken();
    if (!token) return;

    const prev = userVotes[faqId] || null;
    setFaqs(prevList => prevList.map(f => {
      if (f._id !== faqId) return f;
      let { helpful, notHelpful } = f;
      if (prev === 'helpful') helpful = Math.max(0, helpful - 1);
      if (prev === 'not_helpful') notHelpful = Math.max(0, notHelpful - 1);
      if (vote === 'helpful') helpful += 1;
      if (vote === 'not_helpful') notHelpful += 1;
      return { ...f, helpful, notHelpful };
    }));

    let actualVote = null;
    if (prev === vote) actualVote = null;
    else actualVote = vote;

    try {
      if (actualVote) {
        const res = await fetch(`${API}/${faqId}/vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ vote: actualVote }),
        });
        const data = await res.json();
        if (res.ok) {
          setFaqs(prevList => prevList.map(f => f._id === faqId ? { ...f, helpful: data.data.helpful, notHelpful: data.data.notHelpful } : f));
          setUserVotes(prev => ({ ...prev, [faqId]: data.data.myVote || actualVote }));
        }
      } else {
        await fetch(`${API}/${faqId}/vote`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        setUserVotes(prev => ({ ...prev, [faqId]: null }));
      }
    } catch {
      fetchFAQs();
      setUserVotes(prev => ({ ...prev, [faqId]: prev[faqId] || null }));
    }
  };

  const handleToggle = async (faqId) => {
    if (expandedId !== faqId) fetchMyVote(faqId);
    open(faqId);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>📖 Frequently Asked Questions</h1>
        <p>Find answers to the most common questions from the community</p>
      </div>

      <TopFAQsWidget
        limit={10}
        category={activeCategory !== 'all' ? activeCategory : undefined}
      />

      <div className="faq-panel-toolbar">
        <div className="search-bar">
          <input
            type="search"
            placeholder="🔍 Search FAQs by keyword…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search FAQs"
          />
        </div>

        <div className="faq-sort-panel" role="group" aria-label="Sort FAQs">
          <span className="faq-sort-panel-label">Sort by</span>
          <div className="faq-sort-tabs">
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                className={`faq-sort-tab ${sort === opt.value ? 'active' : ''}`}
                onClick={() => setSort(opt.value)}
                aria-pressed={sort === opt.value}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <nav className="faq-category-tabs" aria-label="FAQ categories">
        <button
          type="button"
          onClick={() => setActiveCategory('all')}
          className={`btn btn-sm ${activeCategory === 'all' ? 'btn-primary' : 'btn-ghost'}`}
          aria-pressed={activeCategory === 'all'}
        >
          📚 All
        </button>
        {categories.map(cat => (
          <button
            key={cat._id}
            type="button"
            onClick={() => setActiveCategory(cat.name)}
            className={`btn btn-sm ${activeCategory === cat.name ? 'btn-primary' : 'btn-ghost'}`}
            aria-pressed={activeCategory === cat.name}
          >
            {cat.icon} {cat.displayName}
            {cat.faqCount !== undefined && (
              <span style={{ marginLeft: '0.3rem', fontSize: '0.72rem', opacity: 0.75 }}>
                ({cat.faqCount})
              </span>
            )}
          </button>
        ))}
      </nav>

      <section aria-label="All FAQs">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '1.1rem' }}>📋</span>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            {activeCategory !== 'all'
              ? `${categories.find(c => c.name === activeCategory)?.displayName || activeCategory} FAQs`
              : 'All FAQs'}
          </h2>
          <span className="tag" style={{ fontSize: '0.72rem' }}>{activeSortLabel}</span>
          {!loading && (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.25rem' }}>
              ({faqs.length})
            </span>
          )}
        </div>

        {loading ? (
          <div className="empty-state"><div className="icon">⏳</div><p>Loading FAQs…</p></div>
        ) : faqs.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🔎</div>
            <p>{debouncedSearch || search ? 'No FAQs match your search' : 'No FAQs in this category yet.'}</p>
          </div>
        ) : (
          <div className="card-grid">
            {faqs.map(faq => (
              <FAQCard
                key={faq._id}
                faq={faq}
                isExpanded={expandedId}
                onToggle={handleToggle}
                onVote={handleVote}
                userVote={userVotes[faq._id]}
                categoryLabel={categoryLabel}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
