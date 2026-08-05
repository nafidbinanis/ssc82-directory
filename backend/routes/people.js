const express = require('express');
const { pool } = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

const SEARCHABLE_COLUMNS = [
  'p.name',
  'p.school_name_district',
  'p.home_district_raw',
  'p.profession',
  'p.current_location',
  'p.phone_primary',
  'p.phone_secondary',
  'p.blood_group',
  'p.email',
  'd.name',
];

const SORTABLE_COLUMNS = {
  name: 'p.name',
  district: 'd.name',
  profession: 'p.profession',
  blood_group: 'p.blood_group',
  created_at: 'p.created_at',
};

async function logActivity({ action, entityId, personName, user, details }) {
  const totalRes = await pool.query('SELECT COUNT(*)::int AS c FROM people');
  const total = totalRes.rows[0].c;
  await pool.query(
    `INSERT INTO activity_log (action, entity_type, entity_id, person_name, performed_by, performed_by_name, details, total_records_after)
     VALUES ($1, 'person', $2, $3, $4, $5, $6, $7)`,
    [action, entityId || null, personName || null, user ? user.id : null, user ? user.name : 'Unknown', JSON.stringify(details || {}), total]
  );
}

function validatePayload(body, { partial = false } = {}) {
  const errors = [];
  const clean = {};

  const req = (key, label) => {
    if (!partial || body[key] !== undefined) {
      if (body[key] === undefined || String(body[key]).trim() === '') {
        errors.push(`${label} is required`);
      }
    }
  };

  req('name', 'Name');
  req('district', 'District');

  if (body.name !== undefined) clean.name = String(body.name).trim();
  if (body.district !== undefined) clean.district = String(body.district).trim();
  if (body.school_name_district !== undefined) clean.school_name_district = body.school_name_district ? String(body.school_name_district).trim() : null;
  if (body.home_district_raw !== undefined) clean.home_district_raw = body.home_district_raw ? String(body.home_district_raw).trim() : null;
  if (body.profession !== undefined) clean.profession = body.profession ? String(body.profession).trim() : null;
  if (body.current_location !== undefined) clean.current_location = body.current_location ? String(body.current_location).trim() : null;
  if (body.blood_group !== undefined) clean.blood_group = body.blood_group ? String(body.blood_group).trim() : null;

  if (body.phone_primary !== undefined) {
    const phone = body.phone_primary ? String(body.phone_primary).trim() : '';
    if (phone && !/^(\+?\d[\d\s()-]{6,})$/.test(phone)) {
      errors.push('Phone number format looks invalid');
    }
    clean.phone_primary = phone || null;
  } else if (!partial) {
    errors.push('Phone number is required');
  }
  if (body.phone_secondary !== undefined) {
    clean.phone_secondary = body.phone_secondary ? String(body.phone_secondary).trim() : null;
  }

  if (body.email !== undefined) {
    const email = body.email ? String(body.email).trim().toLowerCase() : '';
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      errors.push('Email format is invalid');
    }
    clean.email = email || null;
    clean.email_valid = email ? true : null;
  }

  const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  if (clean.blood_group && !validBloodGroups.includes(clean.blood_group)) {
    errors.push(`Blood group must be one of: ${validBloodGroups.join(', ')}`);
  }

  return { errors, clean };
}

async function getOrCreateDistrictId(name) {
  const existing = await pool.query('SELECT id FROM districts WHERE name = $1', [name]);
  if (existing.rows[0]) return existing.rows[0].id;
  const info = await pool.query('INSERT INTO districts (name) VALUES ($1) RETURNING id', [name]);
  return info.rows[0].id;
}

function rowToPerson(row) {
  return {
    id: row.id,
    district: row.district_name,
    name: row.name,
    school_name_district: row.school_name_district,
    home_district_raw: row.home_district_raw,
    profession: row.profession,
    current_location: row.current_location,
    phone_primary: row.phone_primary,
    phone_secondary: row.phone_secondary,
    blood_group: row.blood_group,
    email: row.email,
    email_valid: row.email_valid === null ? null : !!row.email_valid,
    is_duplicate_of: row.is_duplicate_of,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ---------------------------------------------------------------
// GET /api/people  (search + filter + sort + paginate)
// ---------------------------------------------------------------
router.get('/', async (req, res, next) => {
  try {
    const {
      q = '',
      district,
      profession,
      blood_group: bloodGroup,
      duplicates_only: duplicatesOnly,
      sort = 'name',
      order = 'asc',
      page = '1',
      page_size: pageSizeRaw = '25',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(pageSizeRaw, 10) || 25));
    const offset = (pageNum - 1) * pageSize;

    const where = [];
    const params = [];

    if (q && String(q).trim()) {
      const like = `%${String(q).trim()}%`;
      const orClauses = SEARCHABLE_COLUMNS.map((col) => {
        params.push(like);
        return `${col} ILIKE $${params.length}`;
      });
      where.push(`(${orClauses.join(' OR ')})`);
    }
    if (district) {
      params.push(district);
      where.push(`d.name = $${params.length}`);
    }
    if (profession) {
      params.push(`%${profession}%`);
      where.push(`p.profession ILIKE $${params.length}`);
    }
    if (bloodGroup) {
      params.push(bloodGroup);
      where.push(`p.blood_group = $${params.length}`);
    }
    if (duplicatesOnly === 'true') {
      where.push('p.is_duplicate_of IS NOT NULL');
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const sortCol = SORTABLE_COLUMNS[sort] || SORTABLE_COLUMNS.name;
    const sortDir = String(order).toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    const baseFrom = `FROM people p JOIN districts d ON d.id = p.district_id ${whereSql}`;

    const totalRes = await pool.query(`SELECT COUNT(*)::int AS c ${baseFrom}`, params);
    const total = totalRes.rows[0].c;

    const dataParams = [...params, pageSize, offset];
    const rowsRes = await pool.query(
      `SELECT p.*, d.name AS district_name ${baseFrom}
       ORDER BY ${sortCol} COLLATE "C" ${sortDir}
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    );

    res.json({
      data: rowsRes.rows.map(rowToPerson),
      pagination: {
        page: pageNum,
        page_size: pageSize,
        total,
        total_pages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------
// GET /api/people/meta/options  (must be defined before /:id)
// ---------------------------------------------------------------
router.get('/meta/options', async (req, res, next) => {
  try {
    const districts = (await pool.query('SELECT name FROM districts ORDER BY name')).rows.map((r) => r.name);
    const bloodGroups = (
      await pool.query("SELECT DISTINCT blood_group FROM people WHERE blood_group IS NOT NULL ORDER BY blood_group")
    ).rows.map((r) => r.blood_group);
    const professions = (
      await pool.query("SELECT DISTINCT profession FROM people WHERE profession IS NOT NULL ORDER BY profession")
    ).rows.map((r) => r.profession);
    res.json({ districts, blood_groups: bloodGroups, professions });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------
// GET /api/people/:id
// ---------------------------------------------------------------
router.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT p.*, d.name AS district_name FROM people p JOIN districts d ON d.id = p.district_id WHERE p.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Person not found' });
    res.json({ data: rowToPerson(result.rows[0]) });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------
// POST /api/people  (admin only)
// ---------------------------------------------------------------
router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const { errors, clean } = validatePayload(req.body || {});
    if (errors.length) return res.status(400).json({ errors });

    const existing = await pool.query(
      'SELECT id FROM people WHERE lower(name) = lower($1) AND phone_primary = $2',
      [clean.name, clean.phone_primary]
    );
    if (existing.rows[0]) {
      return res.status(409).json({ error: 'A person with this exact name and phone number already exists', existing_id: existing.rows[0].id });
    }

    const districtId = await getOrCreateDistrictId(clean.district);

    const inserted = await pool.query(
      `INSERT INTO people (district_id, name, school_name_district, home_district_raw, profession,
                            current_location, phone_primary, phone_secondary, blood_group, email, email_valid, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [
        districtId,
        clean.name,
        clean.school_name_district || null,
        clean.home_district_raw || clean.district,
        clean.profession || null,
        clean.current_location || null,
        clean.phone_primary,
        clean.phone_secondary || null,
        clean.blood_group || null,
        clean.email || null,
        clean.email_valid ?? null,
        req.user.id,
      ]
    );

    await logActivity({ action: 'CREATE', entityId: inserted.rows[0].id, personName: clean.name, user: req.user, details: { name: clean.name, district: clean.district } });

    const row = await pool.query(
      `SELECT p.*, d.name AS district_name FROM people p JOIN districts d ON d.id = p.district_id WHERE p.id = $1`,
      [inserted.rows[0].id]
    );
    res.status(201).json({ data: rowToPerson(row.rows[0]) });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------
// PUT /api/people/:id  (admin only)
// ---------------------------------------------------------------
router.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const existingRes = await pool.query('SELECT * FROM people WHERE id = $1', [req.params.id]);
    const existing = existingRes.rows[0];
    if (!existing) return res.status(404).json({ error: 'Person not found' });

    const { errors, clean } = validatePayload(req.body || {}, { partial: true });
    if (errors.length) return res.status(400).json({ errors });

    const districtId = clean.district ? await getOrCreateDistrictId(clean.district) : existing.district_id;

    const merged = {
      districtId,
      name: clean.name ?? existing.name,
      school_name_district: clean.school_name_district !== undefined ? clean.school_name_district : existing.school_name_district,
      home_district_raw: clean.home_district_raw !== undefined ? clean.home_district_raw : existing.home_district_raw,
      profession: clean.profession !== undefined ? clean.profession : existing.profession,
      current_location: clean.current_location !== undefined ? clean.current_location : existing.current_location,
      phone_primary: clean.phone_primary !== undefined ? clean.phone_primary : existing.phone_primary,
      phone_secondary: clean.phone_secondary !== undefined ? clean.phone_secondary : existing.phone_secondary,
      blood_group: clean.blood_group !== undefined ? clean.blood_group : existing.blood_group,
      email: clean.email !== undefined ? clean.email : existing.email,
      email_valid: clean.email_valid !== undefined ? clean.email_valid : existing.email_valid,
    };

    await pool.query(
      `UPDATE people SET
         district_id = $1, name = $2, school_name_district = $3,
         home_district_raw = $4, profession = $5, current_location = $6,
         phone_primary = $7, phone_secondary = $8, blood_group = $9,
         email = $10, email_valid = $11, updated_at = now()
       WHERE id = $12`,
      [
        merged.districtId, merged.name, merged.school_name_district,
        merged.home_district_raw, merged.profession, merged.current_location,
        merged.phone_primary, merged.phone_secondary, merged.blood_group,
        merged.email, merged.email_valid, req.params.id,
      ]
    );

    await logActivity({
      action: 'UPDATE',
      entityId: Number(req.params.id),
      personName: merged.name,
      user: req.user,
      details: { changed_fields: Object.keys(clean) },
    });

    const row = await pool.query(
      `SELECT p.*, d.name AS district_name FROM people p JOIN districts d ON d.id = p.district_id WHERE p.id = $1`,
      [req.params.id]
    );
    res.json({ data: rowToPerson(row.rows[0]) });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------
// DELETE /api/people/:id  (admin only)
// ---------------------------------------------------------------
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const existingRes = await pool.query('SELECT * FROM people WHERE id = $1', [req.params.id]);
    const existing = existingRes.rows[0];
    if (!existing) return res.status(404).json({ error: 'Person not found' });

    await pool.query('DELETE FROM people WHERE id = $1', [req.params.id]);

    await logActivity({ action: 'DELETE', entityId: existing.id, personName: existing.name, user: req.user, details: {} });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
