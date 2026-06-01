import { useState, useEffect } from 'react';
import { useAuth } from './LoginPage';

function getToken() {
  return localStorage.getItem('faq_access_token');
}

async function apiFetch(path, opts = {}) {
  const token = getToken();
  const isFormData = opts.body instanceof FormData;
  const headers = isFormData
    ? { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    : { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  if (!isFormData && opts.body && typeof opts.body === 'object') opts.body = JSON.stringify(opts.body);
  const res = await fetch(path, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.message || data.error || 'Request failed'), { status: res.status, data });
  return data;
}

// ── FAQ Management ───────────────────────────────────────────────────────────
function FAQSection() {
  const [faqs, setFaqs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ question: '', answer: '', category: 'other', tags: '', status: 'published' });
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [msg, setMsg] = useState(null);

  useEffect(() => { fetchFaqs(); fetchCategories(); }, []);

  const fetchFaqs = async () => {
    try {
      const data = await apiFetch('/api/faqs/all');
      setFaqs(data.data || []);
    } catch { setMsg({ type: 'error', text: 'Failed to load FAQs' }); }
  };

  const fetchCategories = async () => {
    try {
      const data = await apiFetch('/api/categories');
      setCategories(data.data || []);
    } catch { /* silent */ }
  };

  const resetForm = () => {
    setForm({ question: '', answer: '', category: 'other', tags: '', status: 'published' });
    setScreenshotFile(null);
    setScreenshotPreview(null);
    setEditId(null);
    setShowForm(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setScreenshotFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setScreenshotPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const removeScreenshot = () => {
    setScreenshotFile(null);
    setScreenshotPreview(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    const formData = new FormData();
    formData.append('question', form.question);
    formData.append('answer', form.answer);
    formData.append('category', form.category);
    formData.append('status', form.status);
    formData.append('tags', JSON.stringify(tags));
    if (screenshotFile) formData.append('screenshot', screenshotFile);

    const url = editId ? `/api/faqs/${editId}` : '/api/faqs';
    const method = editId ? 'PUT' : 'POST';
    try {
      await apiFetch(url, { method, body: formData });
      setMsg({ type: 'success', text: editId ? 'FAQ updated!' : 'FAQ added!' });
      fetchFaqs();
      resetForm();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this FAQ?')) return;
    await apiFetch(`/api/faqs/${id}`, { method: 'DELETE' });
    fetchFaqs();
  };

  const startEdit = (faq) => {
    setForm({
      question: faq.question,
      answer: faq.answer,
      category: faq.category || 'other',
      tags: (faq.tags || []).join(', '),
      status: faq.status || 'published',
    });
    setScreenshotFile(null);
    setScreenshotPreview(faq.screenshot || null);
    setEditId(faq._id);
    setShowForm(true);
  };

  return (
    <div className="card" style={{ marginBottom: '2rem' }}>
      <div className="flex flex-between" style={{ marginBottom: '1rem' }}>
        <h2 className="section-title" style={{ marginBottom: 0 }}>📋 FAQ Database</h2>
        <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setShowForm(true); }}>
          + Add FAQ
        </button>
      </div>

      {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

      {showForm && (
        <div style={{ background: 'var(--bg)', padding: '1.5rem', borderRadius: '10px', marginBottom: '1rem', border: '1px solid var(--border)' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>{editId ? '✏️ Edit FAQ' : '➕ Add New FAQ'}</h3>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label>Question *</label>
              <input value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} required placeholder="What is the question?" />
            </div>
            <div className="form-group">
              <label>Answer *</label>
              <textarea value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))} required placeholder="Write the full answer..." style={{ minHeight: '100px' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
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
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Tags (comma-separated)</label>
              <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="account, security, password" />
            </div>
            <div className="form-group">
              <label>Screenshot (optional)</label>
              <div className="screenshot-upload">
                {screenshotPreview ? (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img
                      src={screenshotPreview}
                      alt="Screenshot preview"
                      style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: '8px', border: '1px solid var(--border)', objectFit: 'contain' }}
                    />
                    <button
                      type="button"
                      onClick={removeScreenshot}
                      className="btn btn-danger btn-sm"
                      style={{ position: 'absolute', top: '6px', right: '6px', padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                    >
                      ✕ Remove
                    </button>
                  </div>
                ) : (
                  <label className="file-upload-label">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                    <span className="file-upload-icon">🖼️</span>
                    <span>Click to upload screenshot</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>JPG, PNG, GIF, WEBP (max 5MB)</span>
                  </label>
                )}
              </div>
            </div>
            <div className="flex flex-gap">
              <button type="submit" className="btn btn-primary">{editId ? 'Update FAQ' : 'Add FAQ'}</button>
              <button type="button" className="btn btn-ghost" onClick={resetForm}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {faqs.length === 0 ? (
        <div className="empty-state" style={{ padding: '2rem' }}><div className="icon">🔭</div><p>No FAQs yet</p></div>
      ) : (
        <table className="admin-table">
          <thead><tr><th>#</th><th>Question</th><th>Category</th><th>Status</th><th>Photo</th><th>Views</th><th>Helpful</th><th>Actions</th></tr></thead>
          <tbody>
            {faqs.map((f, i) => (
              <tr key={f._id}>
                <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                <td style={{ fontWeight: 500, maxWidth: '200px' }} className="truncate">{f.question}</td>
                <td><span className="tag">{f.category || 'other'}</span></td>
                <td><span className={`tag tag-${f.status === 'published' ? 'solved' : f.status === 'archived' ? 'rejected' : ''}`}>{f.status}</span></td>
                <td>{f.screenshot ? '🖼️' : '—'}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{f.viewCount || 0}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>👍 {f.helpful || 0}</td>
                <td className="actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => startEdit(f)}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(f._id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Query Review ─────────────────────────────────────────────────────────────
function QueryReviewSection() {
  const [queries, setQueries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [msg, setMsg] = useState(null);
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectNote, setRejectNote] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [faqTags, setFaqTags] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [mergeModal, setMergeModal] = useState(null);
  const [mergeTarget, setMergeTarget] = useState(null);
  const [similarQueries, setSimilarQueries] = useState([]);
  const [findingSimilar, setFindingSimilar] = useState(false);

  useEffect(() => {
    fetchQueries();
    apiFetch('/api/categories').then(data => setCategories(data.data || [])).catch(() => {});
  }, []);

  const categoryLabel = (name) => {
    if (!name) return 'Other';
    const c = categories.find(x => x.name === name);
    return c ? `${c.icon || ''} ${c.displayName}`.trim() : name;
  };

  const fetchQueries = async () => {
    try {
      const data = await apiFetch('/api/queries?scope=community');
      setQueries(data.data || data || []);
    } catch { setMsg({ type: 'error', text: 'Failed to load queries' }); }
  };

  const handleApprove = async (id, addToFAQ = false) => {
    try {
      const body = { addToFAQ, adminNote };
      if (addToFAQ && faqTags) body.faqTags = faqTags;
      await apiFetch(`/api/queries/${id}/approve`, { method: 'PUT', body });
      setMsg({ type: 'success', text: addToFAQ ? '✅ Approved and added to FAQ!' : '✅ Solution approved' });
      setApprovingId(null); setFaqTags(''); setAdminNote('');
      fetchQueries();
    } catch (err) { setMsg({ type: 'error', text: err.message }); }
  };

  const startReject = (id) => {
    setRejectingId(id);
    setRejectNote('');
    setApprovingId(null);
    setFaqTags('');
    setAdminNote('');
  };

  const handleReject = async (id) => {
    setRejecting(true);
    try {
      await apiFetch(`/api/queries/${id}/reject`, {
        method: 'PUT',
        body: { adminNote: rejectNote.trim() },
      });
      setMsg({ type: 'success', text: '❌ Solution rejected. Query moved to Rejected.' });
      setRejectingId(null);
      setRejectNote('');
      fetchQueries();
    } catch (err) {
      setMsg({ type: 'error', text: err.message || err.data?.message || 'Failed to reject solution' });
    } finally {
      setRejecting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this query permanently?')) return;
    await apiFetch(`/api/queries/${id}`, { method: 'DELETE' });
    fetchQueries();
  };

  const findSimilar = async (query) => {
    setFindingSimilar(true);
    setMergeModal(query);
    setSimilarQueries([]);
    setMergeTarget(null);
    try {
      const data = await apiFetch(`/api/duplicates/similar/${query._id}`);
      setSimilarQueries(data.data || []);
    } catch { setMsg({ type: 'error', text: 'Failed to find similar queries' }); }
    finally { setFindingSimilar(false); }
  };

  const handleMerge = async () => {
    if (!mergeModal || !mergeTarget) return;
    if (!confirm(`Merge "${mergeModal.question.substring(0, 40)}..." into "${mergeTarget.question.substring(0, 40)}..."?`)) return;
    try {
      await apiFetch('/api/duplicates/merge', {
        method: 'POST',
        body: { sourceId: mergeModal._id, targetId: mergeTarget._id, adminNote: 'Merged by admin' },
      });
      setMsg({ type: 'success', text: '✅ Queries merged successfully' });
      setMergeModal(null);
      fetchQueries();
    } catch (err) { setMsg({ type: 'error', text: err.message }); }
  };

  const matchesCategory = (q) => categoryFilter === 'all' || q.category === categoryFilter;

  const pendingApproval = queries.filter(q => q.status === 'pending_approval' && matchesCategory(q));
  const rejectedQueries = queries.filter(q => q.status === 'rejected' && matchesCategory(q));
  const other = queries.filter(q => !['pending_approval', 'rejected'].includes(q.status) && matchesCategory(q));

  const pendingCountByCategory = (catName) =>
    queries.filter(q => q.status === 'pending_approval' && (catName === 'all' || q.category === catName)).length;

  const STATUS_BADGE = (s) => {
    const map = { open: 'status-pending', assigned: 'status-pending', pending_approval: 'tag-pending', resolved: 'status-solved', rejected: 'status-rejected' };
    return `status-badge ${map[s] || ''}`;
  };
  const STATUS_LABEL = (s) => ({ open: '🟡 Open', assigned: '🟣 Assigned', pending_approval: '🔵 Under Review', resolved: '✅ Resolved', rejected: '❌ Rejected', closed: '⚫ Closed' }[s] || s);

  const SimilarityBar = ({ score }) => {
    const pct = Math.round(score * 100);
    const color = pct >= 70 ? '#ef4444' : pct >= 45 ? '#f59e0b' : '#10b981';
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <div style={{ width: '50px', height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '3px' }} />
        </div>
        <span style={{ fontSize: '0.7rem', fontWeight: 600, color }}>{pct}%</span>
      </div>
    );
  };

  return (
    <div className="card">
      <h2 className="section-title">🔬 Query Review Queue</h2>
      {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          Filter by category
        </div>
        <div className="flex flex-gap flex-wrap">
          <button
            type="button"
            className={`btn btn-sm ${categoryFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setCategoryFilter('all')}
          >
            All ({pendingCountByCategory('all')})
          </button>
          {categories.map(c => (
            <button
              key={c._id}
              type="button"
              className={`btn btn-sm ${categoryFilter === c.name ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setCategoryFilter(c.name)}
            >
              {c.icon} {c.displayName} ({pendingCountByCategory(c.name)})
            </button>
          ))}
        </div>
      </div>

      <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
        🔵 Awaiting Your Review — {categoryFilter === 'all' ? 'All categories' : categoryLabel(categoryFilter)} ({pendingApproval.length})
      </h3>

      {pendingApproval.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>No solutions pending review 🎉</p>
      ) : (
        <div className="card-grid" style={{ marginBottom: '1.5rem' }}>
          {pendingApproval.map(q => (
            <div key={q._id} className="card" style={{ border: '1px solid #bfdbfe', background: '#f0f9ff' }}>
              <div style={{ fontWeight: 600, fontSize: '1.05rem', marginBottom: '0.4rem' }}>{q.question}</div>
              {q.description && <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{q.description}</div>}
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                <span>
                  Raised by <strong>{typeof q.raisedBy === 'object' ? q.raisedBy?.name : (q.raisedBy || 'Unknown')}</strong>
                  {' · '}{new Date(q.createdAt).toLocaleDateString()}
                </span>
                <span className="tag">{categoryLabel(q.category)}</span>
              </div>

              {q.communitySolution && (
                <div style={{ padding: '0.85rem', background: '#dbeafe', borderRadius: '8px', borderLeft: '3px solid var(--primary)', marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#1e40af', marginBottom: '0.3rem' }}>
                    💬 Community Solution by {typeof q.solutionBy === 'object' ? q.solutionBy?.name : (q.solutionBy || 'Someone')}
                  </div>
                  <div style={{ color: 'var(--text)', lineHeight: 1.6, fontSize: '0.9rem' }}>{q.communitySolution}</div>
                </div>
              )}

              {approvingId === q._id ? (
                <div>
                  <div className="form-group">
                    <label>Tags for FAQ (comma-separated, optional)</label>
                    <input value={faqTags} onChange={e => setFaqTags(e.target.value)} placeholder="e.g. account, password, login" />
                  </div>
                  <div className="form-group">
                    <label>Admin Note (optional)</label>
                    <input value={adminNote} onChange={e => setAdminNote(e.target.value)} placeholder="Internal note..." />
                  </div>
                  <div className="flex flex-gap flex-wrap">
                    <button className="btn btn-accent" onClick={() => handleApprove(q._id, true)}>✅ Approve + Add to FAQ</button>
                    <button className="btn btn-primary" onClick={() => handleApprove(q._id, false)}>✅ Approve Only</button>
                    <button className="btn btn-ghost" onClick={() => { setApprovingId(null); setFaqTags(''); setAdminNote(''); }}>Cancel</button>
                  </div>
                </div>
              ) : rejectingId === q._id ? (
                <div>
                  <div className="form-group">
                    <label>Reason for rejection (optional)</label>
                    <textarea
                      value={rejectNote}
                      onChange={e => setRejectNote(e.target.value)}
                      placeholder="Explain what needs to be improved..."
                      style={{ minHeight: '72px' }}
                    />
                  </div>
                  <div className="flex flex-gap flex-wrap">
                    <button
                      type="button"
                      className="btn btn-danger"
                      disabled={rejecting}
                      onClick={() => handleReject(q._id)}
                    >
                      {rejecting ? 'Rejecting…' : '❌ Confirm Reject'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={rejecting}
                      onClick={() => { setRejectingId(null); setRejectNote(''); }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-gap flex-wrap">
                  <button className="btn btn-accent btn-sm" onClick={() => { setApprovingId(q._id); setRejectingId(null); }}>✅ Approve</button>
                  <button className="btn btn-danger btn-sm" onClick={() => startReject(q._id)}>❌ Reject</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => findSimilar(q)}>🔗 Find Duplicates</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(q._id)}>Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#991b1b', marginBottom: '0.75rem', marginTop: '1.5rem' }}>
        ❌ Rejected ({rejectedQueries.length})
      </h3>
      {rejectedQueries.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>No rejected queries in this category.</p>
      ) : (
        <table className="admin-table" style={{ marginBottom: '1.5rem' }}>
          <thead><tr><th>Question</th><th>Category</th><th>Raised By</th><th>Admin Note</th><th>Actions</th></tr></thead>
          <tbody>
            {rejectedQueries.map(q => (
              <tr key={q._id}>
                <td style={{ fontWeight: 500, maxWidth: '200px' }} className="truncate">{q.question}</td>
                <td><span className="tag">{categoryLabel(q.category)}</span></td>
                <td>{typeof q.raisedBy === 'object' ? q.raisedBy?.name : (q.raisedBy || '—')}</td>
                <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{q.adminNote || '—'}</td>
                <td className="actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => findSimilar(q)}>🔗</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(q._id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
        All Other Queries ({other.length})
      </h3>
      {other.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No other queries.</p>
      ) : (
        <table className="admin-table">
          <thead><tr><th>Question</th><th>Category</th><th>Raised By</th><th>Status</th><th>Added to FAQ</th><th>Actions</th></tr></thead>
          <tbody>
            {other.map(q => (
              <tr key={q._id}>
                <td style={{ fontWeight: 500, maxWidth: '200px' }} className="truncate">{q.question}</td>
                <td><span className="tag">{categoryLabel(q.category)}</span></td>
                <td>{typeof q.raisedBy === 'object' ? q.raisedBy?.name : (q.raisedBy || '—')}</td>
                <td><span className={STATUS_BADGE(q.status)}>{STATUS_LABEL(q.status)}</span></td>
                <td>{q.addedToFAQ ? '✅' : '❌'}</td>
                <td className="actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => findSimilar(q)}>🔗</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(q._id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ── Merge Modal ── */}
      {mergeModal && (
        <div className="modal-overlay" onClick={() => setMergeModal(null)}>
          <div className="modal" style={{ maxWidth: '600px', maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.3rem' }}>🔗</span>
              <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Find Duplicates</h2>
            </div>

            <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '1rem' }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{mergeModal.question}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Status: <span className={`status-badge ${STATUS_BADGE(mergeModal.status)}`} style={{ fontSize: '0.7rem' }}>{STATUS_LABEL(mergeModal.status)}</span>
              </div>
            </div>

            {findingSimilar ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>⏳ Searching for similar queries...</div>
            ) : similarQueries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>✅ No similar queries found</div>
            ) : (
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  Select a query to merge <strong>into</strong> (the selected query will be kept, this one will be closed):
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflow: 'auto' }}>
                  {similarQueries.map(q => (
                    <label
                      key={q._id}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: '0.6rem', padding: '0.75rem',
                        borderRadius: '8px', cursor: 'pointer', fontSize: '0.88rem',
                        background: mergeTarget?._id === q._id ? '#eef2ff' : 'var(--bg)',
                        border: mergeTarget?._id === q._id ? '2px solid var(--primary)' : '1px solid var(--border)',
                        transition: 'all 0.1s',
                      }}
                    >
                      <input
                        type="radio"
                        name="merge-target"
                        checked={mergeTarget?._id === q._id}
                        onChange={() => setMergeTarget(q)}
                        style={{ accentColor: 'var(--primary)', marginTop: '3px' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{q.question}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          Raised by {typeof q.raisedBy === 'object' ? q.raisedBy?.name : 'Someone'} · {new Date(q.createdAt).toLocaleDateString()}
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.3rem' }}>
                          {q.category && <span className="tag" style={{ fontSize: '0.7rem' }}>{q.category}</span>}
                          <span className={`status-badge ${STATUS_BADGE(q.status)}`} style={{ fontSize: '0.7rem' }}>{STATUS_LABEL(q.status)}</span>
                        </div>
                      </div>
                      <SimilarityBar score={q.similarity} />
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <button className="btn btn-ghost" onClick={() => setMergeModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleMerge} disabled={!mergeTarget}>
                🔗 Merge Into Selected
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Announcements ─────────────────────────────────────────────────────────────
function AnnouncementsSection() {
  const [announcements, setAnnouncements] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', priority: 'info' });
  const [msg, setMsg] = useState(null);

  useEffect(() => { fetchAnnouncements(); }, []);

  const fetchAnnouncements = async () => {
    try {
      const data = await apiFetch('/api/announcements');
      setAnnouncements(data.data || data || []);
    } catch { /* silent */ }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiFetch('/api/announcements', { method: 'POST', body: form });
      setMsg({ type: 'success', text: 'Announcement published!' });
      setForm({ title: '', content: '', priority: 'info' });
      setShowForm(false);
      fetchAnnouncements();
    } catch (err) { setMsg({ type: 'error', text: err.message }); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this announcement?')) return;
    await apiFetch(`/api/announcements/${id}`, { method: 'DELETE' });
    fetchAnnouncements();
  };

  const PRIORITY_STYLE = { info: 'var(--primary)', warning: 'var(--warning)', urgent: 'var(--danger)' };

  return (
    <div className="card">
      <div className="flex flex-between" style={{ marginBottom: '1rem' }}>
        <h2 className="section-title" style={{ marginBottom: 0 }}>📢 Announcements</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(s => !s)}>
          {showForm ? 'Cancel' : '+ New'}
        </button>
      </div>

      {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: 'var(--bg)', padding: '1.25rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid var(--border)' }}>
          <div className="form-group">
            <label>Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required placeholder="Announcement title..." />
          </div>
          <div className="form-group">
            <label>Content *</label>
            <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} required placeholder="Full text..." style={{ minHeight: '90px' }} />
          </div>
          <div className="form-group">
            <label>Priority</label>
            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={{ width: 'auto' }}>
              <option value="info">ℹ️ Info</option>
              <option value="warning">⚠️ Warning</option>
              <option value="urgent">🚨 Urgent</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary">Publish</button>
        </form>
      )}

      {announcements.length === 0 ? (
        <div className="empty-state"><div className="icon">📢</div><p>No announcements yet</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {announcements.map(a => (
            <div key={a._id} style={{ padding: '1rem', background: 'var(--bg)', borderRadius: '8px', borderLeft: `4px solid ${PRIORITY_STYLE[a.priority] || 'var(--primary)'}` }}>
              <div className="flex flex-between">
                <strong>{a.title}</strong>
                <div className="flex flex-gap">
                  <span className="tag">{a.priority}</span>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(a._id)}>Delete</button>
                </div>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '0.4rem', lineHeight: 1.6 }}>{a.content}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.4rem' }}>
                By {typeof a.createdBy === 'object' ? a.createdBy?.name : 'Admin'} · {new Date(a.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Categories Management ─────────────────────────────────────────────────────
function CategoriesSection() {
  const [categories, setCategories] = useState([]);
  const [allFaqs, setAllFaqs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', displayName: '', description: '', icon: '📁', order: 0 });
  const [msg, setMsg] = useState(null);
  const [managingCategory, setManagingCategory] = useState(null);
  const [selectedFaqs, setSelectedFaqs] = useState([]);
  const [faqSearch, setFaqSearch] = useState('');

  useEffect(() => { fetchCategories(); fetchAllFaqs(); }, []);

  const fetchCategories = async () => {
    try {
      const data = await apiFetch('/api/categories');
      setCategories(data.data || []);
    } catch { setMsg({ type: 'error', text: 'Failed to load categories' }); }
  };

  const fetchAllFaqs = async () => {
    try {
      const data = await apiFetch('/api/faqs/all');
      setAllFaqs(data.data || []);
    } catch { /* silent */ }
  };

  const resetForm = () => {
    setForm({ name: '', displayName: '', description: '', icon: '📁', order: 0 });
    setEditId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await apiFetch(`/api/categories/${editId}`, { method: 'PUT', body: form });
        setMsg({ type: 'success', text: 'Category updated!' });
      } else {
        await apiFetch('/api/categories', { method: 'POST', body: form });
        setMsg({ type: 'success', text: 'Category created!' });
      }
      fetchCategories();
      resetForm();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete category "${name}"?`)) return;
    try {
      await apiFetch(`/api/categories/${id}`, { method: 'DELETE' });
      setMsg({ type: 'success', text: 'Category deleted' });
      fetchCategories();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const startEdit = (cat) => {
    setForm({ name: cat.name, displayName: cat.displayName, description: cat.description || '', icon: cat.icon || '📁', order: cat.order || 0 });
    setEditId(cat._id);
    setShowForm(true);
  };

  const openManageFAQs = (cat) => {
    setManagingCategory(cat);
    setSelectedFaqs([]);
    setFaqSearch('');
  };

  const toggleFaqSelection = (faqId) => {
    setSelectedFaqs(prev => prev.includes(faqId) ? prev.filter(id => id !== faqId) : [...prev, faqId]);
  };

  const selectAllVisible = () => {
    const visibleIds = filteredUnassigned.map(f => f._id);
    setSelectedFaqs(visibleIds);
  };

  const deselectAll = () => setSelectedFaqs([]);

  const assignToCategory = async () => {
    if (!managingCategory || selectedFaqs.length === 0) return;
    try {
      await apiFetch('/api/faqs/assign-category', {
        method: 'POST',
        body: { category: managingCategory.name, faqIds: selectedFaqs },
      });
      setMsg({ type: 'success', text: `${selectedFaqs.length} FAQ(s) assigned to "${managingCategory.displayName}"` });
      setSelectedFaqs([]);
      fetchAllFaqs();
      fetchCategories();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const removeFromCategory = async (faqId) => {
    if (!managingCategory) return;
    try {
      await apiFetch(`/api/faqs/${faqId}`, {
        method: 'PUT',
        body: { category: 'other' },
      });
      setMsg({ type: 'success', text: 'FAQ moved to "Other"' });
      fetchAllFaqs();
      fetchCategories();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const faqsInCategory = allFaqs.filter(f => f.category === managingCategory?.name);
  const filteredUnassigned = allFaqs
    .filter(f => f.category !== managingCategory?.name && f.status !== 'archived')
    .filter(f =>
      !faqSearch || f.question.toLowerCase().includes(faqSearch.toLowerCase())
    );

  const EMOJI_PRESETS = ['📚', '🎓', '💰', '💼', '🏢', '🛠️', '📁', '🎯', '🔬', '🎨', '🏥', '🌐'];

  return (
    <div className="card" style={{ marginBottom: '2rem' }}>
      <div className="flex flex-between" style={{ marginBottom: '1rem' }}>
        <h2 className="section-title" style={{ marginBottom: 0 }}>🏷️ Categories</h2>
        <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setShowForm(true); }}>
          + Add Category
        </button>
      </div>

      {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

      {showForm && (
        <div style={{ background: 'var(--bg)', padding: '1.5rem', borderRadius: '10px', marginBottom: '1rem', border: '1px solid var(--border)' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>{editId ? '✏️ Edit Category' : '➕ Add New Category'}</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Internal Name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                  placeholder="e.g. academics"
                  disabled={!!editId}
                  style={editId ? { opacity: 0.6 } : {}}
                />
                <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Used in URLs (lowercase, underscores)</small>
              </div>
              <div className="form-group">
                <label>Display Name *</label>
                <input
                  value={form.displayName}
                  onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                  required
                  placeholder="e.g. Academics"
                />
              </div>
            </div>
            <div className="form-group">
              <label>Description (optional)</label>
              <input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Brief description of this category"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Icon</label>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                  {EMOJI_PRESETS.map(em => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, icon: em }))}
                      style={{
                        fontSize: '1.1rem', padding: '0.3rem 0.5rem', borderRadius: '6px',
                        border: form.icon === em ? '2px solid var(--primary)' : '1px solid var(--border)',
                        background: form.icon === em ? 'var(--primary-light, #eef2ff)' : 'var(--surface)',
                        cursor: 'pointer',
                      }}
                    >
                      {em}
                    </button>
                  ))}
                </div>
                <input
                  value={form.icon}
                  onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                  placeholder="Or type any emoji"
                  style={{ width: '100px' }}
                />
              </div>
              <div className="form-group">
                <label>Sort Order</label>
                <input
                  type="number"
                  value={form.order}
                  onChange={e => setForm(f => ({ ...f, order: Number(e.target.value) }))}
                  min="0"
                  style={{ width: '100px' }}
                />
                <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Lower = shown first</small>
              </div>
            </div>
            <div className="flex flex-gap">
              <button type="submit" className="btn btn-primary">{editId ? 'Update Category' : 'Create Category'}</button>
              <button type="button" className="btn btn-ghost" onClick={resetForm}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {categories.length === 0 ? (
        <div className="empty-state" style={{ padding: '2rem' }}><div className="icon">🏷️</div><p>No categories yet. Create one to organize your FAQs.</p></div>
      ) : (
        <table className="admin-table">
          <thead><tr><th>Icon</th><th>Name</th><th>Display Name</th><th>FAQs</th><th>Order</th><th>Actions</th></tr></thead>
          <tbody>
            {categories.map(c => (
              <tr key={c._id}>
                <td style={{ fontSize: '1.2rem' }}>{c.icon}</td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{c.name}</td>
                <td style={{ fontWeight: 600 }}>{c.displayName}</td>
                <td><span className="tag tag-solved">{c.faqCount || 0}</span></td>
                <td style={{ color: 'var(--text-muted)' }}>{c.order}</td>
                <td className="actions">
                  <button className="btn btn-accent btn-sm" onClick={() => openManageFAQs(c)}>📋 Manage FAQs</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => startEdit(c)}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c._id, c.displayName)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ── Manage FAQs Modal ── */}
      {managingCategory && (
        <div className="modal-overlay" onClick={() => setManagingCategory(null)}>
          <div className="modal" style={{ maxWidth: '720px', maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="flex flex-between" style={{ marginBottom: '1rem' }}>
              <h2 style={{ margin: 0 }}>{managingCategory.icon} {managingCategory.displayName} — Manage FAQs</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setManagingCategory(null)}>✕ Close</button>
            </div>

            {/* FAQs currently in this category */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                ✅ FAQs in this category ({faqsInCategory.length})
              </h3>
              {faqsInCategory.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No FAQs in this category yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '200px', overflow: 'auto' }}>
                  {faqsInCategory.map(f => (
                    <div key={f._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                      <span style={{ fontSize: '0.88rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.question}</span>
                      <button className="btn btn-danger btn-sm" style={{ marginLeft: '0.5rem', padding: '0.2rem 0.5rem', fontSize: '0.72rem' }} onClick={() => removeFromCategory(f._id)}>✕ Remove</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assign FAQs to this category */}
            <div>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                📋 Assign FAQs to "{managingCategory.displayName}"
              </h3>

              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'center' }}>
                <input
                  type="search"
                  placeholder="🔍 Search FAQs to assign..."
                  value={faqSearch}
                  onChange={e => setFaqSearch(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button className="btn btn-ghost btn-sm" onClick={selectAllVisible}>Select All</button>
                <button className="btn btn-ghost btn-sm" onClick={deselectAll}>Deselect</button>
              </div>

              {selectedFaqs.length > 0 && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <button className="btn btn-primary btn-sm" onClick={assignToCategory}>
                    ➕ Assign {selectedFaqs.length} FAQ(s) to "{managingCategory.displayName}"
                  </button>
                </div>
              )}

              {filteredUnassigned.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No other FAQs available to assign.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '250px', overflow: 'auto' }}>
                  {filteredUnassigned.map(f => (
                    <label
                      key={f._id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.75rem',
                        borderRadius: '6px', cursor: 'pointer', fontSize: '0.88rem',
                        background: selectedFaqs.includes(f._id) ? '#eef2ff' : 'var(--bg)',
                        border: selectedFaqs.includes(f._id) ? '1px solid var(--primary)' : '1px solid var(--border)',
                        transition: 'all 0.1s',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedFaqs.includes(f._id)}
                        onChange={() => toggleFaqSelection(f._id)}
                        style={{ accentColor: 'var(--primary)' }}
                      />
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.question}</span>
                      <span className="tag" style={{ fontSize: '0.7rem' }}>{f.category || 'other'}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main AdminPage with tabs ───────────────────────────────────────────────────
export default function AdminPage() {
  const [tab, setTab] = useState('queries');
  const { admin } = useAuth();

  if (!admin) return (
    <div className="page">
      <div className="empty-state"><div className="icon">🔒</div><p>Admin access only</p></div>
    </div>
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1>⚙️ Admin Panel</h1>
        <p>Manage FAQs, review community solutions, and post announcements</p>
      </div>

      <div className="tabs" style={{ marginBottom: '1.5rem' }}>
        {['queries', 'faqs', 'categories', 'announcements'].map(t => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {{ queries: '🔬 Query Review', faqs: '📋 FAQ Database', categories: '🏷️ Categories', announcements: '📢 Announcements' }[t]}
          </button>
        ))}
      </div>

      {tab === 'queries' && <QueryReviewSection />}
      {tab === 'faqs' && <FAQSection />}
      {tab === 'categories' && <CategoriesSection />}
      {tab === 'announcements' && <AnnouncementsSection />}
    </div>
  );
}
