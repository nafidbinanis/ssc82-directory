const express = require('express');
const { pool } = require('../db');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const total = (await pool.query('SELECT COUNT(*)::int AS c FROM people')).rows[0].c;

    const byDistrict = (
      await pool.query(
        `SELECT d.name AS district, COUNT(*)::int AS count
         FROM people p JOIN districts d ON d.id = p.district_id
         GROUP BY d.name ORDER BY count DESC`
      )
    ).rows;

    const byProfession = (
      await pool.query(
        `SELECT COALESCE(profession, 'Unspecified') AS profession, COUNT(*)::int AS count
         FROM people GROUP BY profession ORDER BY count DESC LIMIT 15`
      )
    ).rows;

    const byBloodGroup = (
      await pool.query(
        `SELECT COALESCE(blood_group, 'Unknown') AS blood_group, COUNT(*)::int AS count
         FROM people GROUP BY blood_group ORDER BY count DESC`
      )
    ).rows;

    const missingEmail = (await pool.query(`SELECT COUNT(*)::int AS c FROM people WHERE email IS NULL`)).rows[0].c;
    const missingPhone = (await pool.query(`SELECT COUNT(*)::int AS c FROM people WHERE phone_primary IS NULL`)).rows[0].c;
    const missingBloodGroup = (await pool.query(`SELECT COUNT(*)::int AS c FROM people WHERE blood_group IS NULL`)).rows[0].c;
    const invalidEmails = (await pool.query(`SELECT COUNT(*)::int AS c FROM people WHERE email_valid = false`)).rows[0].c;
    const duplicates = (await pool.query(`SELECT COUNT(*)::int AS c FROM people WHERE is_duplicate_of IS NOT NULL`)).rows[0].c;

    const recentlyAdded = (
      await pool.query(
        `SELECT p.id, p.name, d.name AS district, p.profession, p.created_at
         FROM people p JOIN districts d ON d.id = p.district_id
         ORDER BY p.created_at DESC, p.id DESC LIMIT 10`
      )
    ).rows;

    const districtCount = (await pool.query('SELECT COUNT(*)::int AS c FROM districts')).rows[0].c;

    res.json({
      total_people: total,
      total_districts: districtCount,
      by_district: byDistrict,
      by_profession: byProfession,
      by_blood_group: byBloodGroup,
      data_quality: {
        missing_email: missingEmail,
        missing_phone: missingPhone,
        missing_blood_group: missingBloodGroup,
        invalid_emails: invalidEmails,
        probable_duplicates: duplicates,
      },
      recently_added: recentlyAdded,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
