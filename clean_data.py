import openpyxl, json, re, unicodedata

wb = openpyxl.load_workbook('/mnt/user-data/uploads/SSC_1982_Telephone_Directory.xlsx', data_only=True)

CTRL_CHARS = ['\u202a','\u202b','\u202c','\u202d','\u202e','\xa0','\u200e','\u200f']

def clean_text(v):
    if v is None:
        return None
    s = str(v)
    for c in CTRL_CHARS:
        s = s.replace(c, ' ')
    s = s.replace('\n', ', ').replace('\r', ' ')
    s = re.sub(r'\s+', ' ', s).strip()
    if s in ('', '-', '--', 'N/A', 'n/a'):
        return None
    return s

def clean_phone_single(p):
    p = p.strip()
    for c in CTRL_CHARS:
        p = p.replace(c, '')
    p = p.strip()
    if not p:
        return None
    # international format kept as-is (has + or parentheses)
    if p.startswith('+') or '(+' in p:
        p = re.sub(r'\s+', ' ', p).strip()
        return p
    # digits only, Bangladeshi mobile missing leading 0 (11 digits total, e.g. 1819221833 -> 01819221833)
    digits = re.sub(r'[^\d]', '', p)
    if not digits:
        return None
    if len(digits) == 10 and digits.startswith('1'):
        digits = '0' + digits
    return digits

def clean_phone_field(raw):
    """Returns (primary, secondary, raw_display) """
    if raw is None:
        return None, None, None
    if isinstance(raw, (int, float)):
        digits = str(int(raw))
        if len(digits) == 10 and digits.startswith('1'):
            digits = '0' + digits
        return digits, None, digits
    s = str(raw)
    for c in CTRL_CHARS:
        s = s.replace(c, ' ')
    s = s.replace('\n', ',').replace('\r', ',')
    parts = re.split(r'[,/]', s)
    parts = [clean_phone_single(p) for p in parts]
    parts = [p for p in parts if p]
    if not parts:
        return None, None, None
    primary = parts[0]
    secondary = parts[1] if len(parts) > 1 else None
    raw_display = ', '.join(parts)
    return primary, secondary, raw_display

def valid_email(e):
    if not e:
        return False
    return bool(re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', e))

records = []
rid = 1
for sn in wb.sheetnames:
    district = sn.strip()
    ws = wb[sn]
    header = [c.value for c in next(ws.iter_rows(min_row=1, max_row=1))]
    for row in ws.iter_rows(min_row=2, values_only=True):
        name = row[0]
        if name is None or str(name).strip() == '':
            continue
        name_c = clean_text(row[0])
        school_district_c = clean_text(row[1])
        home_district_raw = clean_text(row[2])
        profession_c = clean_text(row[3])
        current_location_c = clean_text(row[4])
        phone_primary, phone_secondary, phone_raw = clean_phone_field(row[5])
        blood_group_c = clean_text(row[6])
        email_raw = clean_text(row[8]) if len(row) > 8 else None
        email_c = email_raw.lower() if email_raw else None
        email_valid = valid_email(email_c) if email_c else None

        rec = {
            "id": rid,
            "district": district,
            "name": name_c,
            "school_name_district": school_district_c,
            "home_district_raw": home_district_raw,
            "profession": profession_c,
            "current_location": current_location_c,
            "phone_primary": phone_primary,
            "phone_secondary": phone_secondary,
            "phone_raw": phone_raw,
            "blood_group": blood_group_c,
            "email": email_c,
            "email_valid": email_valid,
        }
        records.append(rec)
        rid += 1

print("Total records:", len(records))

# duplicate detection: same name + same primary phone (or same email)
from collections import defaultdict
dup_map = defaultdict(list)
for r in records:
    key = None
    if r['email']:
        key = ('email', r['email'])
    if key:
        dup_map[key].append(r['id'])

dupe_groups = {k: v for k, v in dup_map.items() if len(v) > 1}
print("Potential duplicate groups (by email):", len(dupe_groups))

with open('/home/claude/ssc82-directory/data/people_seed.json', 'w', encoding='utf-8') as f:
    json.dump(records, f, ensure_ascii=False, indent=2)

with open('/home/claude/ssc82-directory/data/duplicate_report.json', 'w', encoding='utf-8') as f:
    json.dump({str(k): v for k, v in dupe_groups.items()}, f, ensure_ascii=False, indent=2)

print("Done.")
