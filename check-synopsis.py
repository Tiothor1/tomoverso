import sqlite3

conn = sqlite3.connect('data/tomoverso.db')
conn.text_factory = str
c = conn.cursor()

c.execute("SELECT id, title, synopsis FROM novels LIMIT 10")
rows = c.fetchall()

for r in rows:
    id_, title, synopsis = r
    print(f"{id_}: {title}")
    s = synopsis or "(null)"
    print(f"  length={len(s)}, first 200={s[:200]}")
    print()

# Check for patterns
c.execute("SELECT id, title, synopsis FROM novels WHERE synopsis IS NOT NULL")
rows = c.fetchall()
count_match = 0
for r in rows:
    s = r[2]
    if any(x in s.lower() for x in ['classificação', 'classificacao', 'avisos', 'classificação indicativa']):
        count_match += 1
        if count_match <= 5:
            print(f"MATCH: {r[0]}: {r[1]}")
            print(f"  {s[:300]}")
            print()

print(f"\nTotal with classification/avisos: {count_match}")

conn.close()
