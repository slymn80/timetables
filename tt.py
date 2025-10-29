#!/usr/bin/env python3
import argparse
from pathlib import Path
from typing import Iterable

from db import get_conn, init_db, seed_basic, DB_PATH, fmt_minute, day_name


def cmd_init(args):
    conn = get_conn(args.db)
    init_db(conn)
    print(f"DB ready at {Path(args.db or DB_PATH)}")


def cmd_seed(args):
    conn = get_conn(args.db)
    init_db(conn)
    seed_basic(conn)
    print("Seeded example data.")


def cmd_add(args):
    conn = get_conn(args.db)
    cur = conn.cursor()
    if args.entity == "teacher":
        cur.execute("INSERT INTO teacher(name) VALUES (?)", (args.name,))
    elif args.entity == "class":
        cur.execute("INSERT INTO school_class(name) VALUES (?)", (args.name,))
    elif args.entity == "room":
        cur.execute("INSERT INTO room(name, capacity) VALUES (?,?)", (args.name, args.capacity))
    elif args.entity == "subject":
        cur.execute("INSERT INTO subject(name) VALUES (?)", (args.name,))
    elif args.entity == "offer":
        # offer ekle ve öğretmen ilişkilerini oluştur
        class_id = fetch_id(conn, "school_class", args.class_name)
        subject_id = fetch_id(conn, "subject", args.subject)
        cur.execute(
            "INSERT INTO offer(class_id, subject_id, groups, hours_per_week) VALUES (?,?,?,?)",
            (class_id, subject_id, args.groups, args.hours),
        )
        offer_id = cur.lastrowid
        for t in split_csv(args.teachers or ""):
            tid = fetch_id(conn, "teacher", t)
            cur.execute("INSERT INTO offer_teacher(offer_id, teacher_id) VALUES (?,?)", (offer_id, tid))
    else:
        raise SystemExit("Unknown entity")
    conn.commit()
    print("Added.")


def cmd_list(args):
    conn = get_conn(args.db)
    cur = conn.cursor()
    if args.entity == "teachers":
        for row in cur.execute("SELECT id, name FROM teacher ORDER BY name"):
            print(row[0], row[1])
    elif args.entity == "classes":
        for row in cur.execute("SELECT id, name FROM school_class ORDER BY name"):
            print(row[0], row[1])
    elif args.entity == "rooms":
        for row in cur.execute("SELECT id, name, IFNULL(capacity,'') FROM room ORDER BY name"):
            print(row[0], row[1], row[2])
    elif args.entity == "subjects":
        for row in cur.execute("SELECT id, name FROM subject ORDER BY name"):
            print(row[0], row[1])
    elif args.entity == "offers":
        q = (
            "SELECT o.id, c.name, s.name, o.groups, o.hours_per_week, "
            "GROUP_CONCAT(t.name, ', ') "
            "FROM offer o JOIN school_class c ON c.id=o.class_id "
            "JOIN subject s ON s.id=o.subject_id "
            "LEFT JOIN offer_teacher ot ON ot.offer_id=o.id "
            "LEFT JOIN teacher t ON t.id=ot.teacher_id "
            "GROUP BY o.id ORDER BY c.name, s.name"
        )
        for row in cur.execute(q):
            oid, cls, subj, groups, hrs, ts = row
            print(f"#{oid}: {cls} - {subj} | gr:{groups} hr:{hrs} | teachers:{ts or '-'}")
    elif args.entity == "slots":
        for row in cur.execute("SELECT id, day, start_min, end_min FROM timeslot ORDER BY day, start_min"):
            print(row[0], row[1], f"{fmt_minute(row[2])}-{fmt_minute(row[3])}")
    else:
        raise SystemExit("Unknown list entity")


def cmd_clear_sessions(args):
    conn = get_conn(args.db)
    conn.execute("DELETE FROM session")
    conn.commit()
    print("All sessions cleared.")


def cmd_schedule(args):
    conn = get_conn(args.db)
    cur = conn.cursor()
    if args.clear:
        conn.execute("DELETE FROM session")
        conn.commit()

    # Preload reference data
    rooms = [tuple(r) for r in cur.execute("SELECT id, name FROM room ORDER BY id")]  # [(id,name),...]
    slots = [tuple(r) for r in cur.execute("SELECT id, day, start_min, end_min FROM timeslot ORDER BY day, start_min")]

    # iterate offers
    offers = list(cur.execute(
        "SELECT o.id, o.class_id, o.subject_id, o.groups, o.hours_per_week, c.name, s.name "
        "FROM offer o JOIN school_class c ON c.id=o.class_id JOIN subject s ON s.id=o.subject_id "
        "ORDER BY c.name, s.name"
    ))

    def teacher_candidates(offer_id: int) -> list[int]:
        return [r[0] for r in cur.execute("SELECT teacher_id FROM offer_teacher WHERE offer_id=?", (offer_id,))]

    scheduled = 0
    for oid, class_id, subj_id, groups, hpw, class_name, subject_name in offers:
        teachers = teacher_candidates(oid)
        if not teachers:
            print(f"[skip] Offer #{oid} {class_name}-{subject_name}: no teachers")
            continue
        # schedule for each group and hour
        for g in range(1, groups + 1):
            hours = hpw
            h = 0
            for sid, day, st, en in slots:
                if h >= hours:
                    break
                # can we put session here? choose first available teacher and room
                # class constraint: this timeslot must not be used by other offers of same class (except same offer groups)
                clash = cur.execute(
                    "SELECT 1 FROM session s JOIN offer o ON o.id=s.offer_id "
                    "WHERE o.class_id=? AND s.timeslot_id=? AND s.offer_id<>? LIMIT 1",
                    (class_id, sid, oid),
                ).fetchone()
                if clash:
                    continue
                # find free teacher
                free_t = None
                for t in teachers:
                    r = cur.execute(
                        "SELECT 1 FROM session WHERE teacher_id=? AND timeslot_id=? LIMIT 1",
                        (t, sid),
                    ).fetchone()
                    if not r:
                        free_t = t
                        break
                if not free_t:
                    continue
                # find free room
                free_r = None
                for rid, _rn in rooms:
                    r = cur.execute(
                        "SELECT 1 FROM session WHERE room_id=? AND timeslot_id=? LIMIT 1",
                        (rid, sid),
                    ).fetchone()
                    if not r:
                        free_r = rid
                        break
                if not free_r:
                    continue
                # ok place session
                cur.execute(
                    "INSERT INTO session(offer_id, group_no, teacher_id, room_id, timeslot_id) VALUES (?,?,?,?,?)",
                    (oid, g, free_t, free_r, sid),
                )
                scheduled += 1
                h += 1
    conn.commit()
    print(f"Scheduled sessions: {scheduled}")


def cmd_timetable(args):
    conn = get_conn(args.db)
    cur = conn.cursor()
    if args.scope == "class":
        class_id = fetch_id(conn, "school_class", args.name)
        # build grid day -> list of slots
        slots = list(cur.execute("SELECT id, day, start_min, end_min FROM timeslot ORDER BY day, start_min"))
        header = {}
        for sid, day, st, en in slots:
            header.setdefault(day, []).append((sid, st, en))
        print(f"== Ders Programı | Sınıf: {args.name}")
        for day in sorted(header):
            print(f"\n{day_name(day)}")
            for sid, st, en in header[day]:
                rows = cur.execute(
                    "SELECT s.group_no, sub.name, t.name, r.name FROM session s "
                    "JOIN offer o ON o.id=s.offer_id "
                    "JOIN subject sub ON sub.id=o.subject_id "
                    "JOIN teacher t ON t.id=s.teacher_id "
                    "JOIN room r ON r.id=s.room_id "
                    "WHERE o.class_id=? AND s.timeslot_id=? ORDER BY s.group_no",
                    (class_id, sid),
                ).fetchall()
                label = f"{fmt_minute(st)}-{fmt_minute(en)}"
                if not rows:
                    print(f"  {label}: —")
                else:
                    info = " | ".join([f"G{g} {sub} ({teach}, {room})" for g, sub, teach, room in rows])
                    print(f"  {label}: {info}")
    else:
        raise SystemExit("Only 'class' timetable supported for now")


def fetch_id(conn, table: str, name: str) -> int:
    cur = conn.cursor()
    col = "name"
    cur.execute(f"SELECT id FROM {table} WHERE {col}=?", (name,))
    r = cur.fetchone()
    if not r:
        raise SystemExit(f"Not found in {table}: {name}")
    return int(r[0])


def split_csv(s: str) -> Iterable[str]:
    return [x.strip() for x in s.split(",") if x.strip()]


def build_parser():
    p = argparse.ArgumentParser(description="Timetables CLI")
    p.add_argument("--db", help="SQLite dosya yolu", default=str(DB_PATH))

    sp = p.add_subparsers(dest="cmd", required=True)

    sp_init = sp.add_parser("init", help="Şemayı oluştur")
    sp_init.set_defaults(func=cmd_init)

    sp_seed = sp.add_parser("seed", help="Örnek veri ekle")
    sp_seed.set_defaults(func=cmd_seed)

    sp_add = sp.add_parser("add", help="Varlık ekle")
    sp_add.add_argument("entity", choices=["teacher", "class", "room", "subject", "offer"]) 
    sp_add.add_argument("name", nargs="?", help="İsim (teacher/class/room/subject için)")
    sp_add.add_argument("--capacity", type=int, default=None, help="Oda kapasitesi")
    sp_add.add_argument("--class", dest="class_name", help="Sınıf adı (offer)")
    sp_add.add_argument("--subject", help="Ders adı (offer)")
    sp_add.add_argument("--groups", type=int, default=1, help="Grup sayısı (offer)")
    sp_add.add_argument("--hours", type=int, default=1, help="Haftalık saat (offer)")
    sp_add.add_argument("--teachers", help="Öğretmenler CSV (offer)")
    sp_add.set_defaults(func=cmd_add)

    sp_list = sp.add_parser("list", help="Listele")
    sp_list.add_argument("entity", choices=["teachers", "classes", "rooms", "subjects", "offers", "slots"]) 
    sp_list.set_defaults(func=cmd_list)

    sp_clear = sp.add_parser("clear-sessions", help="Tüm oturum atamalarını sil")
    sp_clear.set_defaults(func=cmd_clear_sessions)

    sp_sched = sp.add_parser("schedule", help="Basit planlama (greedy)")
    sp_sched.add_argument("--clear", action="store_true", help="Önce tüm atamaları sil")
    sp_sched.set_defaults(func=cmd_schedule)

    sp_tt = sp.add_parser("timetable", help="Program yazdır")
    sp_tt.add_argument("scope", choices=["class"], help="Kapsam")
    sp_tt.add_argument("name", help="Sınıf adı (ör. 9A)")
    sp_tt.set_defaults(func=cmd_timetable)

    return p


def main():
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
