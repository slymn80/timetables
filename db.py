import sqlite3
from pathlib import Path


DB_PATH = Path(__file__).with_name("timetables.db")


def get_conn(db_path: Path | str | None = None) -> sqlite3.Connection:
    path = Path(db_path) if db_path else DB_PATH
    conn = sqlite3.connect(path)
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


SCHEMA_SQL = r"""
CREATE TABLE IF NOT EXISTS teacher (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS school_class (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS room (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  capacity INTEGER
);

CREATE TABLE IF NOT EXISTS subject (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

-- Dakika cinsinden saatler; day: 1=Mon .. 7=Sun
CREATE TABLE IF NOT EXISTS timeslot (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day INTEGER NOT NULL CHECK(day BETWEEN 1 AND 7),
  start_min INTEGER NOT NULL,
  end_min INTEGER NOT NULL,
  UNIQUE(day, start_min, end_min)
);

-- Bir sınıf için bir ders açma: gruplara bölünebilir ve haftalık saat verilir
CREATE TABLE IF NOT EXISTS offer (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL REFERENCES school_class(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subject(id) ON DELETE CASCADE,
  groups INTEGER NOT NULL DEFAULT 1 CHECK(groups >= 1),
  hours_per_week INTEGER NOT NULL CHECK(hours_per_week >= 1),
  UNIQUE(class_id, subject_id)
);

-- Açılan dersin öğretmen adayları (birden fazla olabilir)
CREATE TABLE IF NOT EXISTS offer_teacher (
  offer_id INTEGER NOT NULL REFERENCES offer(id) ON DELETE CASCADE,
  teacher_id INTEGER NOT NULL REFERENCES teacher(id) ON DELETE CASCADE,
  PRIMARY KEY (offer_id, teacher_id)
);

-- Planlanan oturum/slot ataması (çıktı)
CREATE TABLE IF NOT EXISTS session (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  offer_id INTEGER NOT NULL REFERENCES offer(id) ON DELETE CASCADE,
  group_no INTEGER NOT NULL DEFAULT 1,
  teacher_id INTEGER NOT NULL REFERENCES teacher(id),
  room_id INTEGER NOT NULL REFERENCES room(id),
  timeslot_id INTEGER NOT NULL REFERENCES timeslot(id),
  -- Çakışma önlemleri için eşsiz kısıtlar (ileride programlı kontrol edeceğiz)
  UNIQUE(teacher_id, timeslot_id),
  UNIQUE(room_id, timeslot_id),
  UNIQUE(offer_id, group_no, timeslot_id)
);
"""


def init_db(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA_SQL)
    conn.commit()


def seed_basic(conn: sqlite3.Connection) -> None:
    # Basit örnek veriler
    teachers = ["Ali Veli", "Fatma Demir", "Ayşe Kaya", "Mehmet Yılmaz"]
    classes = ["9A", "9B", "10A"]
    rooms = [("Fen Lab", 24), ("Matematik-1", 30), ("Dil-1", 28)]
    subjects = ["Matematik", "Fizik", "Türkçe", "İngilizce"]

    conn.executemany("INSERT OR IGNORE INTO teacher(name) VALUES (?)", [(t,) for t in teachers])
    conn.executemany("INSERT OR IGNORE INTO school_class(name) VALUES (?)", [(c,) for c in classes])
    conn.executemany("INSERT OR IGNORE INTO room(name, capacity) VALUES (?,?)", rooms)
    conn.executemany("INSERT OR IGNORE INTO subject(name) VALUES (?)", [(s,) for s in subjects])

    # 5 gün x 8 slot (40dk) 09:00'dan başlayarak örnek
    base_start = 9 * 60
    duration = 40
    for day in range(1, 6):
        for i in range(8):
            start = base_start + i * duration
            end = start + duration
            conn.execute(
                "INSERT OR IGNORE INTO timeslot(day, start_min, end_min) VALUES (?,?,?)",
                (day, start, end),
            )

    # 9A Matematik dersi: 2 grup, haftalık 4 saat, öğretmen adayları: Ali, Fatma
    cur = conn.cursor()
    cur.execute("SELECT id FROM school_class WHERE name=?", ("9A",))
    class_id = cur.fetchone()[0]
    cur.execute("SELECT id FROM subject WHERE name=?", ("Matematik",))
    subject_id = cur.fetchone()[0]
    cur.execute(
        "INSERT OR IGNORE INTO offer(class_id, subject_id, groups, hours_per_week) VALUES (?,?,?,?)",
        (class_id, subject_id, 2, 4),
    )
    conn.commit()

    # offer id'sini al
    cur.execute("SELECT id FROM offer WHERE class_id=? AND subject_id=?", (class_id, subject_id))
    offer_id = cur.fetchone()[0]
    # öğretmen bağlantıları
    for tname in ("Ali Veli", "Fatma Demir"):
        cur.execute("SELECT id FROM teacher WHERE name=?", (tname,))
        tid = cur.fetchone()[0]
        conn.execute("INSERT OR IGNORE INTO offer_teacher(offer_id, teacher_id) VALUES (?,?)", (offer_id, tid))

    conn.commit()


def fmt_minute(m: int) -> str:
    return f"{m//60:02d}:{m%60:02d}"


def day_name(day: int) -> str:
    names = {1: "Pzt", 2: "Sal", 3: "Çar", 4: "Per", 5: "Cum", 6: "Cts", 7: "Paz"}
    return names.get(day, str(day))

