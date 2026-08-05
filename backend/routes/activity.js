const express = require('express');
const { pool } = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.page_size, 10) || 20));
    const offset = (page - 1) * pageSize;

    const total = (await pool.query('SELECT COUNT(*)::int AS c FROM activity_log')).rows[0].c;
    const rows = (
      await pool.query('SELECT * FROM activity_log ORDER BY created_at DESC, id DESC LIMIT $1 OFFSET $2', [pageSize, offset])
    ).rows;

    res.json({
      data: rows.map((r) => ({
        id: r.id,
        action: r.action,
        entity_type: r.entity_type,
        entity_id: r.entity_id,
        person_name: r.person_name,
        performed_by_name: r.performed_by_name,
        details: r.details ? JSON.parse(r.details) : null,
        total_records_after: r.total_records_after,
        created_at: r.created_at,
      })),
      pagination: { page, page_size: pageSize, total, total_pages: Math.max(1, Math.ceil(total / pageSize)) },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
