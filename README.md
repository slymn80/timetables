Timetables — Basit Ders Programı Planlayıcı (Python + SQLite)

Amaç
- Öğretmen, sınıf (şube), mekan (oda), zaman (slot) gibi parametrelerle ders programı verisini tutmak.
- Bir dersin grup(lar)a bölünebilmesi ve farklı öğretmen/odalar tarafından paralel verilebilmesi.
- İlk adımda: veri modeli + CLI ile kurulum/ekleme/listeme.
- Sonraki adımda: kısıtlı atama ve takvim üretimi (heuristik/ILP vb. ilerletebiliriz).

Kurulum
- Yerleşik Python modülleri dışında bağımlılık yoktur. SQLite dosyası `timetables.db` olarak klasörde tutulur.
- Hızlı başlangıç:
  - `python timetables/tt.py init`
  - `python timetables/tt.py seed`
  - `python timetables/tt.py list offers`

Komutlar (hızlı bakış)
- `python timetables/tt.py init` — Veritabanını oluşturur (yoksa) ve şemayı kurar.
- `python timetables/tt.py seed` — Örnek veri ekler (öğretmen, sınıf, ders, oda, slot).
- `python timetables/tt.py add teacher "Ad Soyad"` — Öğretmen ekler.
- `python timetables/tt.py add class "9A"` — Sınıf/şube ekler.
- `python timetables/tt.py add room "Lab-1"` — Oda ekler.
- `python timetables/tt.py add subject "Matematik"` — Ders adı ekler.
- `python timetables/tt.py offer --class 9A --subject Matematik --groups 2 --hours 4 --teachers "Ali Veli,Fatma Demir"` — Bir dönemlik ders açar, grup bölünmesini ve aday öğretmenleri belirtir.
- `python timetables/tt.py list teachers|classes|rooms|subjects|offers|slots` — Listeleme.

Model Özeti
- `teacher(id, name)`
- `school_class(id, name)` — ör. 9A
- `room(id, name, capacity)`
- `subject(id, name)`
- `timeslot(id, day, start_min, end_min)` — ör. Pazartesi 09:00–09:40 (dakika cinsinden)
- `offer(id, class_id, subject_id, groups, hours_per_week)` — bir sınıfta bir dersin dönemlik açılması
- `offer_teacher(offer_id, teacher_id)` — bu açılan ders için olası/atanmış öğretmenler
- `session(id, offer_id, group_no, teacher_id, room_id, timeslot_id)` — plan çıktısı (atamalar); ilk adımda boş kalır

Notlar
- Zaman slottarını sabit çerçeve (örn. 40dk) veya esnek tanımla tutuyoruz. `seed` örnek 5 gün x 8 saatlik standart aralık oluşturur.
- Gerçek atama/çakışma denetimi bir sonraki aşamada eklenecek: öğretmen, sınıf ve oda aynı anda birden fazla yerde olamaz; teacher ve room kapasite/kısıtları, grup sayısı kadar paralel slot gereksinimi vb.
