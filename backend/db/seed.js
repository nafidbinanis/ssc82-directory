/**
 * Seeds the Postgres database from data/people_seed.json (produced by the
 * one-time Excel -> JSON cleaning script, see /docs in the project root).
 *
 * Safe to re-run: it wipes and rebuilds the `people` and `districts` tables.
 * Pass --full to also reset `users` and `activity_log`.
 */
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { pool, initSchema } = require('./index');

const SEED_FILE = path.join(__dirname, '..', 'data', 'people_seed.json');

async function run() {
  const fullReset = process.argv.includes('--full');
  const records = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));

  await initSchema();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query('DELETE FROM people');
    await client.query('DELETE FROM districts');
    if (fullReset) {
      await client.query('DELETE FROM activity_log');
      await client.query('DELETE FROM users');
    }

    // --- districts -------------------------------------------------
    const districtNames = [...new Set(records.map((r) => r.district))].sort();
    const districtIdByName = {};
    for (const name of districtNames) {
      const res = await client.query('INSERT INTO districts (name) VALUES ($1) RETURNING id', [name]);
      districtIdByName[name] = res.rows[0].id;
    }

    // --- default users ----------------------------------------------
    const userCountRes = await client.query('SELECT COUNT(*)::int AS c FROM users');
    let adminId = null;
    if (userCountRes.rows[0].c === 0) {
      const adminHash = bcrypt.hashSync('admin123', 10);
      const userHash = bcrypt.hashSync('user123', 10);
      const adminRes = await client.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id',
        ['Batch Admin', 'admin@ssc82.local', adminHash, 'admin']
      );
      adminId = adminRes.rows[0].id;
      await client.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,$4)',
        ['Guest Viewer', 'viewer@ssc82.local', userHash, 'user']
      );
    } else {
      const adminRes = await client.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
      adminId = adminRes.rows[0] ? adminRes.rows[0].id : null;
    }

    // --- duplicate detection (by email) for is_duplicate_of --------
    const byEmail = {};
    for (const r of records) {
      if (r.email) {
        byEmail[r.email] = byEmail[r.email] || [];
        byEmail[r.email].push(r.id);
      }
    }

    // --- people -------------------------------------------------------
    // Preserve original numeric ids from the seed file so is_duplicate_of
    // links (also based on those ids) stay valid, then reset the sequence.
    const insertText = `
      INSERT INTO people (
        id, district_id, name, school_name_district, home_district_raw,
        profession, current_location, phone_primary, phone_secondary, phone_raw,
        blood_group, email, email_valid, photo_note, is_duplicate_of, source_row_id, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
    `;

    for (const r of records) {
      let dupOf = null;
      if (r.email && byEmail[r.email].length > 1 && byEmail[r.email][0] !== r.id) {
        dupOf = byEmail[r.email][0];
      }
      await client.query(insertText, [
        r.id,
        districtIdByName[r.district],
        r.name,
        r.school_name_district,
        r.home_district_raw,
        r.profession,
        r.current_location,
        r.phone_primary,
        r.phone_secondary,
        r.phone_raw,
        r.blood_group,
        r.email,
        r.email_valid === null ? null : Boolean(r.email_valid),
        null,
        dupOf,
        r.id,
        adminId,
      ]);
    }

    // Realign the SERIAL sequence so future inserts don't collide with seeded ids
    await client.query(`SELECT setval(pg_get_serial_sequence('people', 'id'), (SELECT MAX(id) FROM people))`);

    const totalRes = await client.query('SELECT COUNT(*)::int AS c FROM people');
    const total = totalRes.rows[0].c;

    await client.query(
      `INSERT INTO activity_log (action, entity_type, entity_id, person_name, performed_by, performed_by_name, details, total_records_after)
       VALUES ('IMPORT', 'person', NULL, NULL, $1, 'System Import', $2, $3)`,
      [adminId, JSON.stringify({ message: `Initial import of ${records.length} records from SSC_1982_Telephone_Directory.xlsx` }), total]
    );

    await client.query('COMMIT');

    console.log(`Seeded ${records.length} people across ${districtNames.length} districts.`);
    console.log('Default login -> admin@ssc82.local / admin123 (Admin)');
    console.log('Default login -> viewer@ssc82.local / user123 (General User)');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
