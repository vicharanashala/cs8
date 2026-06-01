import { useState, useEffect, useRef } from 'react';
import DiscussionThread from '../components/DiscussionThread';

function getToken() {
  return localStorage.getItem('faq_access_token');
}

function parseUser() {
  try {
    const raw = localStorage.getItem('faq_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const STATUS_LABEL = {
  open: '🟡 Open',
  assigned: '🟣 Assigned',
  pending_approval: '🔵 Under Review',
  resolved: '✅ Resolved',
  rejected: '❌ Rejected',
  closed: '⚫ Closed',
};

const STATUS_CLASS = {
  open: 'status-pending',
  assigned: 'status-pending',
  pending_approval: 'tag-pending',
  resolved: 'status-solved',
  rejected: 'status-rejected',
};

export default function QueryResolvePage() {
  const [queries, setQueries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filter, setFilter] = useState('open');
  const [solvingId, setSolvingId] = useState(null);
  const [solution, setSolution] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [preview, setPreview] = useState(null);
  const [msg, setMsg] = useState(null);
  const [openDiscussions, setOpenDiscussions] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    const user = parseUser();
    setCurrentUser(user);
    fetch('/api/categories')
      .then(r => r.json())
      .then(data => { if (data.success) setCategories(data.data || []); })
      .catch(() => {});
  }, []);

  useEffect(() => { fetchQueries(); }, [filter]);

  const categoryLabel = (name) => {
    if (!name) return 'Other';
    const c = categories.find(x => x.name === name);
    return c ? `${c.icon || ''} ${c.displayName}`.trim() : name;
  };

  const fetchQueries = async () => {
    const token = getToken();
    const params = new URLSearchParams({ scope: 'community' });
    if (filter !== 'all') params.set('status', filter);
    const res = await fetch(`/api/queries?${params}`, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
    const data = await res.json();
    if (res.ok) setQueries(data.data || []);
  };

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

  const toggleDiscussions = (queryId) => {
    setOpenDiscussions(prev => ({ ...prev, [queryId]: !prev[queryId] }));
  };

  const handleSubmitSolution = async (id) => {
    if (!solution.trim()) return;
    setMsg(null);
    const token = getToken();
    const formData = new FormData();
    formData.append('solution', solution);
    if (screenshot) formData.append('solutionScreenshot', screenshot);
    const res = await fetch(`/api/queries/${id}/solution`, {
      method: 'PUT',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formData,
    });
    const data = await res.json();
    if (res.ok) {
      setMsg({ type: 'success', text: '✅ Solution submitted! Sent to admin for review.' });
      setSolvingId(null);
      setSolution('');
      removeFile();
      fetchQueries();
    } else {
      setMsg({ type: 'error', text: data.message || data.error || 'Failed to submit solution' });
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>🔧 Community Query Board</h1>
        <p>Browse open queries, submit solutions, and discuss with the community</p>
      </div>

      {msg && (
        <div className={`alert alert-${msg.type === 'success' ? 'success' : 'error'}`}>
          {msg.text}
        </div>
      )}

      <div className="flex flex-between flex-wrap flex-gap" style={{ marginBottom: '1.5rem' }}>
        <div className="flex flex-gap">
          {['open', 'pending_approval', 'resolved', 'rejected', 'all'].map(f => (
            <button
              key={f}
              onClick={() => { setFilter(f); setMsg(null); }}
              className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
            >
              {f === 'all' ? 'All' : STATUS_LABEL[f]}
            </button>
          ))}
        </div>
        <a href="/raise" className="btn btn-accent btn-sm">+ Raise New Query</a>
      </div>

      {queries.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🫥</div>
          <p>No {filter === 'all' ? '' : filter.replace('_', ' ')} queries found.</p>
        </div>
      ) : (
        <div className="card-grid">
          {queries.map(q => (
            <div key={q._id} className="card">
              {/* Query info */}
              <div className="flex flex-between flex-wrap flex-gap">
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '1.05rem', marginBottom: '0.3rem' }}>
                    {q.question}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    By <strong>{typeof q.raisedBy === 'object' ? q.raisedBy?.name : (q.raisedBy || 'Anonymous')}</strong>
                    {' · '}{new Date(q.createdAt).toLocaleDateString()}
                    <span className="tag" style={{ marginLeft: '0.4rem', fontSize: '0.7rem' }}>{categoryLabel(q.category)}</span>
                  </div>
                  <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className={`status-badge ${STATUS_CLASS[q.status] || ''}`}>
                      {STATUS_LABEL[q.status] || q.status}
                    </span>
                    {q.addedToFAQ && <span className="tag" style={{ fontSize: '0.7rem' }}>📖 Added to FAQ</span>}
                    {q.priority && q.priority !== 'medium' && (
                      <span className={`tag ${q.priority === 'urgent' ? 'tag-pending' : ''}`} style={{ fontSize: '0.7rem' }}>
                        {q.priority === 'urgent' ? '🔥 Urgent' : q.priority}
                      </span>
                    )}
                  </div>
                </div>
                {/* Discussion toggle */}
                <button
                  onClick={() => toggleDiscussions(q._id)}
                  className="btn btn-ghost btn-sm"
                  aria-expanded={!!openDiscussions[q._id]}
                  aria-label={`${openDiscussions[q._id] ? 'Hide' : 'Show'} discussion`}
                >
                  💬 {openDiscussions[q._id] ? 'Hide Discussion' : 'Discussion'}
                </button>
              </div>

              {q.description && (
                <div style={{ marginTop: '0.75rem', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  {q.description}
                </div>
              )}

              {/* Screenshot from query raiser */}
              {q.screenshot && (
                <div style={{ marginTop: '0.75rem' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginRight: '0.4rem' }}>📷 Screenshot:</span>
                  <img
                    src={q.screenshot} alt="Query screenshot"
                    style={{ height: '80px', borderRadius: '6px', border: '1px solid var(--border)', objectFit: 'cover', display: 'block', marginTop: '0.3rem', maxWidth: '200px' }}
                    onError={e => e.target.style.display = 'none'}
                  />
                </div>
              )}

              {/* Community solution (pending approval) */}
              {q.status === 'pending_approval' && q.communitySolution && (
                <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#eff6ff', borderRadius: '8px', borderLeft: '3px solid #3b82f6' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1e40af' }}>💬 Community Solution</div>
                  <div style={{ marginTop: '0.5rem', color: 'var(--text)', lineHeight: 1.6, fontSize: '0.9rem' }}>
                    {q.communitySolution}
                  </div>
                  {q.solutionScreenshot && (
                    <img src={q.solutionScreenshot} alt="Solution screenshot"
                      style={{ height: '80px', borderRadius: '6px', border: '1px solid var(--border)', objectFit: 'cover', marginTop: '0.5rem', maxWidth: '180px', display: 'block' }}
                      onError={e => e.target.style.display = 'none'} />
                  )}
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                    by <strong>{typeof q.solutionBy === 'object' ? q.solutionBy?.name : 'Someone'}</strong> · awaiting admin review
                  </div>
                </div>
              )}

              {/* Resolved final answer */}
              {q.status === 'resolved' && q.finalAnswer && (
                <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#f0fdf4', borderRadius: '8px', borderLeft: '3px solid #10b981' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#065f46' }}>✅ Final Answer</div>
                  <div style={{ marginTop: '0.5rem', color: 'var(--text)', lineHeight: 1.6, fontSize: '0.9rem' }}>{q.finalAnswer}</div>
                </div>
              )}

              {/* Admin note */}
              {q.status === 'rejected' && q.adminNote && (
                <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#fee2e2', borderRadius: '8px', fontSize: '0.88rem', color: '#991b1b' }}>
                  <strong>Admin note:</strong> {q.adminNote}
                </div>
              )}

              {/* Submit solution */}
              {(q.status === 'open' || q.status === 'rejected') && solvingId !== q._id && (
                <button className="btn btn-accent btn-sm" style={{ marginTop: '1rem' }}
                  onClick={() => { setSolvingId(q._id); setMsg(null); }}>
                  {q.status === 'rejected' ? '✍️ Submit Revised Solution' : '✍️ Submit Solution'}
                </button>
              )}

              {/* Solution form */}
              {(q.status === 'open' || q.status === 'rejected') && solvingId === q._id && (
                <div style={{ marginTop: '1rem' }}>
                  <div className="form-group">
                    <label>Your Solution *</label>
                    <textarea
                      value={solution}
                      onChange={e => setSolution(e.target.value)}
                      placeholder="Write the solution here. After submission, admin will review before adding to FAQ."
                      style={{ minHeight: '90px' }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Screenshot (optional)</label>
                    {!screenshot ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <label htmlFor={`ss-${q._id}`} className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
                          📎 Attach Screenshot
                        </label>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>max 5MB</span>
                        <input id={`ss-${q._id}`} ref={fileRef} type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          style={{ display: 'none' }} onChange={handleFileChange} />
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          <img src={preview} alt="Preview"
                            style={{ height: '70px', borderRadius: '6px', border: '1px solid var(--border)', objectFit: 'cover' }} />
                          <button type="button" onClick={removeFile}
                            style={{ position: 'absolute', top: '-7px', right: '-7px', width: '20px', height: '20px', borderRadius: '50%', border: 'none', background: 'var(--danger)', color: 'white', cursor: 'pointer', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            ✕
                          </button>
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{screenshot.name}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-gap">
                    <button className="btn btn-accent" onClick={() => handleSubmitSolution(q._id)} disabled={!solution.trim()}>
                      Submit for Review
                    </button>
                    <button className="btn btn-ghost" onClick={() => { setSolvingId(null); setSolution(''); removeFile(); }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Discussion Thread */}
              {openDiscussions[q._id] && (
                <DiscussionThread
                  queryId={q._id}
                  currentUserRole={currentUser?.role || null}
                  currentUserId={currentUser?._id || null}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}