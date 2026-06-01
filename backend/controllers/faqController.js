const FAQ = require('../models/FAQ');
const FAQVote = require('../models/FAQVote');
const Category = require('../models/Category');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { awardPoints } = require('../utils/reputation');

// ─── In-memory cache for top FAQs (2-minute TTL) ───────────────────────────
const topFaqsCache = { data: null, updatedAt: 0 };
const CACHE_TTL_MS = 2 * 60 * 1000;

// ─── GET /faqs ───────────────────────────────────────────────────────────────
exports.getFAQs = asyncHandler(async (req, res) => {
  const { search, category, sort } = req.query;
  const filter = { status: 'published' };
  if (category) filter.category = category;

  let query;
  if (search) {
    query = FAQ.find({
      ...filter,
      $or: [
        { question: { $regex: search, $options: 'i' } },
        { answer: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ],
    });
  } else {
    query = FAQ.find(filter);
  }

  const sortKey = sort === 'useful' ? 'helpful' : sort;
  const sortMap = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    helpful: { helpful: -1, viewCount: -1, createdAt: -1 },
    views: { viewCount: -1, helpful: -1 },
    rated: { averageRating: -1, ratingCount: -1, helpful: -1 },
  };
  query = query.sort(sortMap[sortKey] || sortMap.newest);
  const faqs = await query;
  res.json({ success: true, count: faqs.length, data: faqs });
});

// ─── GET /faqs/all ───────────────────────────────────────────────────────────
exports.getAllFAQs = asyncHandler(async (req, res) => {
  const { status, category } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (category) filter.category = category;
  const faqs = await FAQ.find(filter)
    .populate('createdBy', 'name')
    .populate('reviewedBy', 'name')
    .sort({ createdAt: -1 });
  res.json({ success: true, count: faqs.length, data: faqs });
});

// ─── GET /faqs/:id ───────────────────────────────────────────────────────────
exports.getFAQById = asyncHandler(async (req, res) => {
  const faq = await FAQ.findById(req.params.id)
    .populate('createdBy', 'name')
    .populate('reviewedBy', 'name');
  if (!faq) throw ApiError.notFound('FAQ not found');
  if (faq.status === 'published') {
    faq.viewCount += 1;
    await faq.save();
  }
  res.json({ success: true, data: faq });
});

// ─── POST /faqs ──────────────────────────────────────────────────────────────
exports.createFAQ = asyncHandler(async (req, res) => {
  const { question, answer, category, tags, status } = req.body;
  let parsedTags = [];
  if (tags) {
    try { parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags; } catch { parsedTags = []; }
  }
  const screenshot = req.file ? `/uploads/${req.file.filename}` : null;
  const faq = await FAQ.create({
    question, answer,
    category: category || 'other',
    tags: parsedTags,
    status: status || 'published',
    screenshot,
    createdBy: req.user._id,
    publishedAt: status === 'published' ? new Date() : null,
  });

  res.status(201).json({ success: true, data: faq });
});

// ─── PUT /faqs/:id ───────────────────────────────────────────────────────────
exports.updateFAQ = asyncHandler(async (req, res) => {
  const faq = await FAQ.findById(req.params.id);
  if (!faq) throw ApiError.notFound('FAQ not found');

  const { question, answer, category, tags, status } = req.body;
  if (question) faq.question = question;
  if (answer) faq.answer = answer;
  if (category) faq.category = category;
  if (tags) {
    try { faq.tags = typeof tags === 'string' ? JSON.parse(tags) : tags; } catch { /* keep existing */ }
  }
  if (status) {
    faq.status = status;
    if (status === 'published' && !faq.publishedAt) faq.publishedAt = new Date();
  }
  if (req.file) faq.screenshot = `/uploads/${req.file.filename}`;
  faq.reviewedBy = req.user._id;

  await faq.save();
  res.json({ success: true, data: faq });
});

// ─── DELETE /faqs/:id ────────────────────────────────────────────────────────
exports.deleteFAQ = asyncHandler(async (req, res) => {
  const faq = await FAQ.findById(req.params.id);
  if (!faq) throw ApiError.notFound('FAQ not found');
  faq.status = 'archived';
  await faq.save();
  res.json({ success: true, message: 'FAQ archived' });
});

// ─── POST /faqs/:id/vote ─────────────────────────────────────────────────────
exports.voteFAQ = asyncHandler(async (req, res) => {
  const { vote } = req.body;
  if (!['helpful', 'not_helpful'].includes(vote)) {
    throw ApiError.badRequest('Vote must be "helpful" or "not_helpful"');
  }

  const faq = await FAQ.findById(req.params.id);
  if (!faq) throw ApiError.notFound('FAQ not found');
  if (faq.status !== 'published') throw ApiError.badRequest('Can only vote on published FAQs');

  const existingVote = await FAQVote.findOne({ faqId: faq._id, userId: req.user._id });

  if (existingVote) {
    if (existingVote.vote === vote) {
      // Toggle off
      await FAQVote.deleteOne({ _id: existingVote._id });
      if (vote === 'helpful') faq.helpful = Math.max(0, faq.helpful - 1);
      else faq.notHelpful = Math.max(0, faq.notHelpful - 1);
    } else {
      // Switch vote
      if (existingVote.vote === 'helpful') {
        faq.helpful = Math.max(0, faq.helpful - 1);
        faq.notHelpful += 1;
      } else {
        faq.notHelpful = Math.max(0, faq.notHelpful - 1);
        faq.helpful += 1;
      }
      existingVote.vote = vote;
      await existingVote.save();
    }
  } else {
    // New vote
    await FAQVote.create({ faqId: faq._id, userId: req.user._id, vote });
    if (vote === 'helpful') faq.helpful += 1;
    else faq.notHelpful += 1;
  }

  await faq.save();

  // Invalidate top FAQs cache whenever a vote changes
  topFaqsCache.data = null;

  // Award points to FAQ author
  if (vote === 'helpful' && faq.createdBy) {
    await awardPoints(await User.findById(faq.createdBy), 'FAQ_HELPFUL_VOTE');
  }

  const myVote = await FAQVote.findOne({ faqId: faq._id, userId: req.user._id });
  res.json({
    success: true,
    data: { helpful: faq.helpful, notHelpful: faq.notHelpful, myVote: myVote ? myVote.vote : null },
  });
});

// ─── DELETE /faqs/:id/vote ───────────────────────────────────────────────────
exports.removeVote = asyncHandler(async (req, res) => {
  const faq = await FAQ.findById(req.params.id);
  if (!faq) throw ApiError.notFound('FAQ not found');

  const existingVote = await FAQVote.findOne({ faqId: faq._id, userId: req.user._id });
  if (!existingVote) throw ApiError.notFound('You have not voted on this FAQ');

  if (existingVote.vote === 'helpful') faq.helpful = Math.max(0, faq.helpful - 1);
  else faq.notHelpful = Math.max(0, faq.notHelpful - 1);

  await FAQVote.deleteOne({ _id: existingVote._id });
  await faq.save();
  topFaqsCache.data = null;

  res.json({ success: true, data: { helpful: faq.helpful, notHelpful: faq.notHelpful, myVote: null } });
});

// ─── GET /faqs/:id/my-vote ───────────────────────────────────────────────────
exports.getMyVote = asyncHandler(async (req, res) => {
  const faq = await FAQ.findById(req.params.id);
  if (!faq) throw ApiError.notFound('FAQ not found');

  const myVote = await FAQVote.findOne({ faqId: faq._id, userId: req.user._id });
  res.json({ success: true, data: { myVote: myVote ? myVote.vote : null } });
});

// ─── GET /faqs/top ───────────────────────────────────────────────────────────
exports.getTopFAQs = asyncHandler(async (req, res) => {
  const now = Date.now();

  if (topFaqsCache.data && now - topFaqsCache.updatedAt < CACHE_TTL_MS) {
    return res.json(topFaqsCache.data);
  }

  const limit = Math.min(parseInt(req.query.limit) || 10, 10);
  const category = req.query.category;

  const filter = { status: 'published' };
  if (category && category !== 'all') filter.category = category;

  const faqs = await FAQ.find(filter)
    .select('question answer category tags helpful notHelpful viewCount')
    .sort({ helpful: -1, viewCount: -1 })
    .limit(limit * 3)
    .lean();

  const ranked = faqs
    .map(f => ({
      ...f,
      helpfulRatio: f.helpful / (f.helpful + f.notHelpful + 1),
    }))
    .sort((a, b) =>
      b.helpful !== a.helpful
        ? b.helpful - a.helpful
        : b.helpfulRatio - a.helpfulRatio
    )
    .slice(0, limit)
    .map((f, i) => ({ ...f, rank: i + 1 }));

  const payload = { count: ranked.length, faqs: ranked };

  topFaqsCache.data = payload;
  topFaqsCache.updatedAt = now;

  res.json(payload);
});

// ─── POST /faqs/:id/rate ─────────────────────────────────────────────────────
exports.rateFAQ = asyncHandler(async (req, res) => {
  const { score } = req.body;
  if (!score || score < 1 || score > 5) throw ApiError.badRequest('Rating must be between 1 and 5');

  const faq = await FAQ.findById(req.params.id);
  if (!faq) throw ApiError.notFound('FAQ not found');
  if (faq.status !== 'published') throw ApiError.badRequest('Can only rate published FAQs');

  const existingIndex = faq.ratings.findIndex(r => r.user.toString() === req.user._id.toString());
  if (existingIndex >= 0) {
    faq.ratings[existingIndex].score = score;
  } else {
    faq.ratings.push({ user: req.user._id, score });
  }

  const total = faq.ratings.reduce((sum, r) => sum + r.score, 0);
  faq.averageRating = Math.round((total / faq.ratings.length) * 10) / 10;
  faq.ratingCount = faq.ratings.length;

  await faq.save();
  res.json({ success: true, data: { averageRating: faq.averageRating, ratingCount: faq.ratingCount } });
});

// ─── GET /faqs/top-rated ─────────────────────────────────────────────────────
exports.getTopRated = asyncHandler(async (req, res) => {
  const faqs = await FAQ.find({ status: 'published', ratingCount: { $gt: 0 } })
    .sort({ averageRating: -1, ratingCount: -1 })
    .limit(10);
  res.json({ success: true, count: faqs.length, data: faqs });
});

// ─── GET /faqs/categories/list ───────────────────────────────────────────────
exports.getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ order: 1, name: 1 });
  const withCounts = await Promise.all(
    categories.map(async (cat) => {
      const count = await FAQ.countDocuments({ category: cat.name, status: 'published' });
      return { ...cat.toObject(), faqCount: count };
    })
  );
  res.json({ success: true, data: withCounts });
});

// ─── POST /faqs/assign-category ──────────────────────────────────────────────
exports.assignFAQsToCategory = asyncHandler(async (req, res) => {
  const { category } = req.body;
  const { faqIds } = req.body;
  if (!category) throw ApiError.badRequest('Category is required');
  if (!Array.isArray(faqIds)) throw ApiError.badRequest('faqIds must be an array');

  const result = await FAQ.updateMany({ _id: { $in: faqIds } }, { $set: { category } });

  res.json({
    success: true,
    message: `${result.modifiedCount} FAQ(s) assigned to "${category}"`,
    data: { modifiedCount: result.modifiedCount },
  });
});
