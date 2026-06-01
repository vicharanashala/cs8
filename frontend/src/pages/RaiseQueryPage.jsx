import { useState, useRef, useEffect } from 'react';

function getToken() {
  return localStorage.getItem('faq_access_token');
}

function SimilarityBar({ score }) {
  const pct = Math.round(score * 100);
  const color = pct >= 70 ? '#ef4444' : pct >= 45 ? '#f59e0b' : '#10b981';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
      <div style={{ width: '60px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.2s' }} />
      </div>
      <span style={{ fontSize: '0.72rem', fontWeight: 600, color }}>{pct}% match</span>
    </div>
  );
}

// Client-side spam phrases (mirror of backend BLOCKED_PHRASES)
const CLIENT_BLOCKED = [
  'yes','no','ok','okay','thanks','thank you','hi','hello',
  'bye','good','fine','sure','yep','nope','cool','great',
  'awesome','nice','got it','noted','understood','hmm','lol',
];

function validateClientSide(question) {
  const errors = [];
  if (question.trim().length < 20 && question.trim().length > 0) {
    errors.push('Question must be at least 20 characters');
  }
  if (/^[A-Z\s!?.]+$/.test(question.trim())) {
    errors.push('Do not use ALL CAPS');
  }
  if (/(.)\1{4,}/.test(question)) {
    errors.push('Avoid repeated characters like "helloooooo"');
  }
  const norm = question.trim().toLowerCase().replace(/[^a-z\s]/g, '');
  if (CLIENT_BLOCKED.includes(norm)) {
    errors.push('Question is too short or meaningless');
  }
  return errors;
}

export default function RaiseQueryPage() {
  const [form, setForm] = useState({ question: '', description: '', priority: 'medium', category: 'other' });
  const [screenshot, setScreenshot] = useState(null);
  const [preview, setPreview] = useState(null);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [faqSuggestions, setFaqSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Duplicate detection
  const [similarResults, setSimilarResults] = useState(null);
  const [showDuplicatePanel, setShowDuplicatePanel] = useState(false);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Auto-classification
  const [autoCategory, setAutoCategory] = useState(null);
  const [classifying, setClassifying] = useState(false);
  const [clientErrors, setClientErrors] = useState([]);

  const fileRef = useRef(null);
  const searchTimeout = useRef(null);
  const classifyTimeout = useRef(null);

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (res.ok && data.data?.length) {
        setCategories(data.data);
        setForm(f => ({
          ...f,
          category: f.category === 'other' ? data.data[0].name : f.category,
        }));
      }
    } catch { /* silent */ }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setMsg({ type: 'error', text: 'Image must be smaller than 5MB' });
      return;
    }
    setScreenshot(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const removeFile = () => {
    setScreenshot(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  // Debounced FAQ search
  const searchFAQs = (query) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!query || query.trim().length < 3) {
      setFaqSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/faqs?search=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        if (res.ok) {
          setFaqSuggestions(data.data || []);
          setShowSuggestions(true);
        }
      } catch { /* silent */ }
      finally { setSearching(false); }
    }, 400);
  };

  // Debounced auto-classification
  const triggerClassify = (text) => {
    if (classifyTimeout.current) clearTimeout(classifyTimeout.current);
    if (!text || text.trim().length < 10) {
      setAutoCategory(null);
      return;
    }
    setClassifying(true);
    classifyTimeout.current = setTimeout(async () => {
      const token = getToken();
      try {
        const res = await fetch('/api/queries/classify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ text }),
        });
        const data = await res.json();
        if (res.ok && data.data && data.data.category !== 'other') {
          setAutoCategory({ category: data.data.category, confidence: data.data.confidence });
        } else {
          setAutoCategory(null);
        }
      } catch { setAutoCategory(null); }
      finally { setClassifying(false); }
    }, 500);
  };

  // Debounced similarity check
  const checkSimilar = (text, category) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!text || text.trim().length < 5) return;
    setCheckingDuplicates(true);
    searchTimeout.current = setTimeout(async () => {
      const token = getToken();
      try {
        const res = await fetch(`/api/queries/similar?q=${encodeURIComponent(text)}&category=${category}`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        const data = await res.json();
        if (res.ok) {
          const { similarFAQs, similarQueries } = data.data || {};
          if ((similarFAQs?.length > 0 || similarQueries?.length > 0)) {
            setSimilarResults(data.data);
            setShowDuplicatePanel(true);
          } else {
            setSimilarResults(null);
            setShowDuplicatePanel(false);
          }
        }
      } catch { /* silent */ }
      finally { setCheckingDuplicates(false); }
    }, 600);
  };

  const handleQuestionChange = (e) => {
    const val = e.target.value;
    set('question', val);
    // Client-side validation
    setClientErrors(validateClientSide(val));
    // FAQ suggestions
    searchFAQs(val);
    // Auto-classify
    triggerClassify(val);
    // Similar query check
    setShowDuplicatePanel(false);
    if (val.trim().length >= 20) {
      checkSimilar(val, form.category);
    }
  };

  const applyAutoCategory = () => {
    if (autoCategory) {
      set('category', autoCategory.category);
      setAutoCategory(null);
    }
  };

  const checkForDuplicates = () => {
    if (!form.question.trim() || form.question.trim().length < 5) return false;
    return similarResults && (similarResults.similarQueries?.length > 0 || similarResults.similarFAQs?.length > 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.question.trim()) return;
    if (clientErrors.length > 0) return;

    if (checkForDuplicates()) return; // panel is already shown

    await submitQuery();
  };

  const submitQuery = async () => {
    setSubmitting(true);
    setMsg(null);
    setShowSuggestions(false);
    setShowDuplicatePanel(false);

    const formData = new FormData();
    formData.append('question', form.question);
    formData.append('description', form.description);
    formData.append('priority', form.priority);
    formData.append('category', form.category);
    if (screenshot) formData.append('screenshot', screenshot);

    const token = getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await fetch('/api/queries', { method: 'POST', headers, body: formData });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: 'success', text: "✅ Query raised! The community or admin will respond soon." });
        setForm({ question: '', description: '', priority: 'medium', category: 'other' });
        setAutoCategory(null);
        setSimilarResults(null);
        removeFile();
      } else {
        // Show server-side validation error
        const errMsg = data.errors?.[0]?.msg || data.message || data.error || 'Failed to raise query';
        setMsg({ type: 'error', text: errMsg });
      }
    } catch {
      setMsg({ type: 'error', text: 'Network error — is the server running?' });
    } finally {
      setSubmitting(false);
    }
  };

  const forceSubmit = () => {
    setShowDuplicatePanel(false);
    submitQuery();
  };

  const charCount = form.question.length;
  const charColor = charCount === 0 ? 'var(--text-muted)' : charCount < 20 ? '#ef4444' : charCount > 450 ? '#f59e0b' : '#10b981';

  return (
    <div className="page">
      <div className="page-header">
        <h1>🙋 Raise a Query</h1>
        <p>Can't find your answer? Submit your question to the community or admin.</p>
      </div>
      <div className="two-col">
        <div className="card">
          <h2 className="section-title">Submit Your Question</h2>
          {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group" style={{ position: 'relative' }}>
              <label htmlFor="question-input">Question *</label>
              <input
                id="question-input"
                value={form.question}
                onChange={handleQuestionChange}
                onFocus={() => faqSuggestions.length > 0 && setShowSuggestions(true)}
                placeholder="What's your question? Be specific — at least 20 characters..."
                required
                maxLength={500}
                aria-describedby="question-hint question-char-count"
              />
              {/* Character counter */}
              <div id="question-char-count" style={{ fontSize: '0.75rem', color: charColor, textAlign: 'right', marginTop: '2px' }}>
                {charCount}/500
              </div>
              {searching && (
                <span style={{ position: 'absolute', right: '10px', top: '38px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Searching...
                </span>
              )}

              {/* Client-side validation errors */}
              {clientErrors.length > 0 && (
                <div role="alert" style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px' }}>
                  {clientErrors[0]}
                </div>
              )}

              {/* FAQ suggestions dropdown */}
              {showSuggestions && faqSuggestions.length > 0 && (
                <div className="faq-suggestions-dropdown" role="listbox" aria-label="FAQ suggestions">
                  <div className="faq-suggestions-header">
                    📖 Found {faqSuggestions.length} matching FAQ{faqSuggestions.length > 1 ? 's' : ''} — check if your answer is here:
                  </div>
                  {faqSuggestions.slice(0, 5).map(faq => (
                    <div key={faq._id} className="faq-suggestion-item" role="option">
                      <div className="faq-suggestion-q">
                        <span className="q-icon">Q</span>
                        <span>{faq.question}</span>
                      </div>
                      {faq.answer && (
                        <div className="faq-suggestion-a">{faq.answer.substring(0, 150)}{faq.answer.length > 150 ? '...' : ''}</div>
                      )}
                      <div className="faq-suggestion-meta">
                        {faq.category && <span className="tag">{faq.category}</span>}
                        <span>👍 {faq.helpful || 0}</span>
                      </div>
                    </div>
                  ))}
                  <div className="faq-suggestions-footer">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => window.location.href = '/'}>
                      🔍 Browse all FAQs
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowSuggestions(false)}>
                      Continue with query ↓
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="description-input">Description (optional)</label>
              <textarea
                id="description-input"
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Add more context or details — the more specific, the better the answer..."
                style={{ minHeight: '110px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label htmlFor="category-select">Category *</label>
                <div style={{ position: 'relative' }}>
                  <select
                    id="category-select"
                    value={form.category}
                    required
                    onChange={e => { set('category', e.target.value); setAutoCategory(null); }}
                  >
                    {categories.length > 0 ? (
                      categories.map(c => <option key={c._id} value={c.name}>{c.icon} {c.displayName}</option>)
                    ) : (
                      <>
                        <option value="academics">📚 Academics</option>
                        <option value="admission">🎓 Admission</option>
                        <option value="fees">💰 Fees</option>
                        <option value="placement">💼 Placement</option>
                        <option value="facilities">🏢 Facilities</option>
                        <option value="other">📁 Other</option>
                      </>
                    )}
                  </select>
                  {/* Auto-detected chip */}
                  {autoCategory && (
                    <button
                      type="button"
                      onClick={applyAutoCategory}
                      title="Click to apply this category"
                      style={{
                        position: 'absolute', right: '-4px', top: '-10px',
                        background: '#dbeafe', color: '#1d4ed8', border: '1px solid #93c5fd',
                        borderRadius: '20px', padding: '1px 8px', fontSize: '0.7rem',
                        cursor: 'pointer', whiteSpace: 'nowrap',
                      }}
                    >
                      ✨ Auto: {autoCategory.category} ({Math.round(autoCategory.confidence * 100)}%)
                    </button>
                  )}
                  {classifying && (
                    <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      detecting...
                    </span>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="priority-select">Priority</label>
                <select id="priority-select" value={form.priority} onChange={e => set('priority', e.target.value)}>
                  {['low', 'medium', 'high', 'urgent'].map(p =>
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  )}
                </select>
              </div>
            </div>

            {/* Screenshot Upload */}
            <div className="form-group">
              <label>Screenshot (optional)</label>
              {!screenshot ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <label htmlFor="screenshot-upload" className="btn btn-ghost" style={{ cursor: 'pointer' }}>
                    📎 Attach Screenshot
                  </label>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>jpg, png, gif, webp — max 5MB</span>
                  <input
                    id="screenshot-upload"
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img src={preview} alt="Screenshot preview"
                      style={{ height: '90px', borderRadius: '8px', border: '1px solid var(--border)', objectFit: 'cover' }} />
                    <button type="button" onClick={removeFile}
                      aria-label="Remove screenshot"
                      style={{ position: 'absolute', top: '-8px', right: '-8px', width: '22px', height: '22px', borderRadius: '50%', border: 'none', background: 'var(--danger)', color: 'white', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      ✕
                    </button>
                  </div>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{screenshot.name}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || submitting || clientErrors.length > 0 || !form.question.trim()}
            >
              {submitting ? 'Submitting...' : loading ? 'Submitting...' : 'Submit Query'}
            </button>
          </form>
        </div>
        <div className="card" style={{ alignSelf: 'start' }}>
          <h2 className="section-title">💡 Tips for a Good Query</h2>
          <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-muted)', lineHeight: '2', fontSize: '0.9rem' }}>
            <li>Search the FAQ page first to check if it's already answered</li>
            <li>Be specific and clear in your question (at least 20 characters)</li>
            <li>Add context that helps understand the problem</li>
            <li>Attach a screenshot if your issue is visual</li>
            <li>Check back on the Resolve page to see if someone solved it</li>
          </ul>
          <div style={{ marginTop: '1.5rem' }}>
            <a href="/resolve" className="btn btn-ghost">🔍 Browse Open Queries</a>
          </div>
        </div>
      </div>

      {/* ── Similar Questions Panel ── */}
      {showDuplicatePanel && similarResults && (
        <div className="modal-overlay" onClick={() => setShowDuplicatePanel(false)} role="dialog" aria-modal="true" aria-labelledby="dup-title">
          <div className="modal" style={{ maxWidth: '600px', maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }}>⚠️</span>
              <h2 id="dup-title" style={{ margin: 0, fontSize: '1.15rem' }}>Similar Questions Found</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              We found existing items that may match your question. Please review before submitting a duplicate.
            </p>

            {similarResults.similarFAQs?.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent)', marginBottom: '0.5rem' }}>
                  📖 Related FAQs ({similarResults.similarFAQs.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {similarResults.similarFAQs.map(faq => (
                    <div key={faq._id} style={{ padding: '0.75rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{faq.question}</div>
                          {faq.answer && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{faq.answer.substring(0, 120)}...</div>}
                        </div>
                        <SimilarityBar score={faq.similarity} />
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem', alignItems: 'center' }}>
                        {faq.category && <span className="tag" style={{ fontSize: '0.7rem' }}>{faq.category}</span>}
                        {faq.averageRating > 0 && <span style={{ fontSize: '0.75rem', color: '#f59e0b' }}>★ {faq.averageRating.toFixed(1)}</span>}
                        <a href={`/?faq=${faq._id}`} target="_blank" rel="noopener" className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', padding: '0.15rem 0.5rem', fontSize: '0.72rem' }}>View FAQ →</a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {similarResults.similarQueries?.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#f59e0b', marginBottom: '0.5rem' }}>
                  🔴 Similar Open Queries ({similarResults.similarQueries.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {similarResults.similarQueries.map(q => (
                    <div key={q._id} style={{ padding: '0.75rem', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{q.question}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            Raised by {typeof q.raisedBy === 'object' ? q.raisedBy?.name : 'Someone'} · {new Date(q.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <SimilarityBar score={q.similarity} />
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}>
                        {q.category && <span className="tag" style={{ fontSize: '0.7rem' }}>{q.category}</span>}
                        <span className={`status-badge status-pending`} style={{ fontSize: '0.7rem' }}>{q.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <button className="btn btn-ghost" onClick={() => setShowDuplicatePanel(false)}>← Go Back & Edit</button>
              <button className="btn btn-primary" onClick={forceSubmit}>🚀 Submit Anyway</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}