# Obciążenie relaya dla rodziny (F1-1)

Stan na 2026-10-14. Źródło: fork `Jack4B/starling` 0.21.0 (commit `8ec6dad`). To szacunek z
czytania kodu i prostego modelu, nie pomiar z działającego relaya. Liczby do sprawdzenia
po F1-2 (prawdziwy ruch) i do recenzji Groka.

## Co robi relay przy jednym poście

`handlePost` w `relay/src/index.js` (około linii 185 do 320):

| Krok | Zapytanie | Zapis w tabeli | Indeksy dotknięte zapisem |
|---|---|---|---|
| Odczyt przypięcia | `SELECT ... FROM members_v3` (linia około 245) | 0 | 0 |
| Upsert członka | `INSERT ... ON CONFLICT DO UPDATE SET last_ts, srv` (około 278) | 1 | `idx_members_v3_srv` (kolumna `srv` zmienia się co post) |
| Wstawienie punktu | `INSERT INTO points_v3` (około 292) | 1 | `idx_points_v3_srv`, `idx_points_v3_channel_srv` |
| Przycinanie do `TRAIL_CAP` | `DELETE ... ts < (... OFFSET 239)` tylko w 1 na 16 postów (`TRIM_EVERY`, około 303) | usuwa nadmiar | jak przy wstawieniu |
| Czyszczenie po 24 h | `DELETE ... WHERE srv < now - TTL` przy każdym poście i odczycie (około 102) | usuwa wygasłe | jak przy wstawieniu |

Każdy punkt jest raz wstawiony i raz usunięty (przycięciem albo po 24 godzinach). Cloudflare
liczy zapis w indeksie jako dodatkowy zapisany wiersz (cennik D1, sprawdzony 2026-10-14). Stąd:

- wstawienie punktu: 3 wiersze (tabela i 2 indeksy),
- późniejsze usunięcie tego punktu: 3 wiersze,
- aktualizacja członka: 2 wiersze (tabela i indeks `srv`).

**Około 8 zapisanych wierszy na jeden post.** Komentarz w `relay/schema.sql` sam ostrzega, że
drugi indeks na `points_v3` „kosztuje jeszcze jeden zapis na punkt, na który darmowego limitu
nie stać".

Odczyt (`handleGet`, około linii 323) nie zapisuje nic poza usuwaniem wygasłych wierszy, które
jest już policzone wyżej.

## Ile postów i odczytów robi jeden telefon

Wartości z kodu aplikacji:

- Kadencja w ruchu: 15 s (`activeCadence`, `app/js/main.js` około linii 299).
- W bezruchu: 300 s, bo `stillSave` jest domyślnie włączone (`main.js` linia 218,
  `STILL_CADENCE_S` linia 305), chyba że ktoś włączy „steady".
- Dodatkowy post po przesunięciu o ponad 25 m (`main.js` około linii 6280). Android w ruchu
  podaje pozycję co 3 s z progiem 5 m (`LocationPlanTest.kt` linie 21 do 23), więc w samochodzie
  przy 50 km/h post wychodzi mniej więcej co 3 s, czyli około 20 na minutę. Pieszo około 4 na
  minutę, tyle co kadencja.
- Odpytywanie relaya (`app/js/net.js` linie 30 do 47): co 10 s przy otwartej aplikacji, co 30 s
  w tle, co 60 s w tle w bezruchu.

## Model dnia dla kręgu 7 osób (wszyscy na Androidzie, udostępnianie cały dzień)

| Dzień | Na osobę: bezruch / pieszo / auto (h) | Posty kręgu | Odczyty kręgu | Zapisane wiersze | Żądania HTTP |
|---|---|---|---|---|---|
| Spokojny | 22 / 1,5 / 0,5 | 8 568 | 12 180 | około 69 000 | około 21 000 |
| Ruchliwy | 18 / 3 / 3 | 31 752 | 13 860 | około 254 000 | około 46 000 |
| Podróż | 14 / 2 / 8 | 71 736 | 15 540 | około 574 000 | około 87 000 |
| Tryb „steady" (post co 15 s cały dzień) | nie dotyczy | 40 320 | podobnie | około 323 000 | około 54 000 |

Założenia: pół godziny dziennie z otwartą aplikacją (odczyt co 10 s), reszta w tle; auto
liczone jako 20 postów na minutę. Rachunek: posty razy 8 wierszy; żądania to posty plus odczyty.
Zaproszenia, SOS, check-in i ponowne generowanie kluczy raz na dobę są pomijalne wobec pozycji.

## Wnioski dla D1

1. **Opcja B na darmowym planie Cloudflare (100 000 zapisanych wierszy D1 na dobę) wystarcza
   tylko na spokojny dzień.** Jeden dzień z dłuższą jazdą samochodem przekracza limit 2,5 do 6
   razy. Po wyczerpaniu limitu zapisy są odrzucane do resetu o północy UTC, a rodzina przestaje
   się widzieć. Dla aplikacji bezpieczeństwa dziecka to nie do przyjęcia. B ma sens tylko na
   płatnym planie Workers (według cennika Cloudflare to około 5 USD miesięcznie; sprawdzić
   aktualną cenę przed wyborem).
2. Liczba żądań HTTP (do około 87 000 na dobę) mieści się w typowych darmowych limitach
   Workers, ale z niewielkim zapasem w dniu podróży.
3. **Opcja A (Node na CT8) nie ma limitu zapisów.** Plik SQLite przy takim ruchu to kilka MB
   (najwyżej 7 osób razy 240 punktów razy około 1 KB plus indeksy, wiersze żyją dobę).
   Ograniczeniem są wyłącznie limity procesu na CT8 (F0-1).
4. Domyślne limity szybkości relaya (`RATE_POST_MIN` = 16 osób razy 4 posty razy 4 = 256 na
   minutę na kanał, `RATE_GET_MIN` = 240 na minutę na adres IP) wystarczą dla 7 osób nawet w
   samochodzie (7 razy 20 = 140 postów na minutę). Zmiana nie jest potrzebna, do potwierdzenia w
   F1-3.

## Czego ten dokument nie sprawdził

- Nie uruchamiano relaya pod prawdziwym ruchem ani na Cloudflare. Liczba 8 wierszy na post to
  rachunek z zapytań i cennika, nie odczyt z panelu Cloudflare.
- Kadencja w samochodzie zależy od tego, jak często Android naprawdę podaje pozycję (oszczędzanie
  baterii producenta może to zmienić). Pomiar w F1-4.
- iOS w obecnej wersji nie wysyła nic w tle, więc telefon syna generuje ruch tylko przy otwartej
  aplikacji (D3).
