# Otwarte decyzje

Każda decyzja ma opcje, rekomendację i status. Zamykając decyzję, wpisz datę, wybór
i krótkie uzasadnienie. Modele nie rozstrzygają za właściciela.

## D1. Gdzie działa relay

Status: **otwarta**, zależy od F0-1 (wersja Node sprawdzona, zostaje stały proces i HTTPS) i F1-1.

Fakty: relay to jeden plik (`relay/src/index.js`, około 450 linii) plus adapter
`relay/server.mjs` uruchamiający ten sam kod pod Node z plikową bazą SQLite. Używa
`node:sqlite` (działa od Node 22.13; `package.json` deklaruje Node 24) i długo działającego procesu za serwerem
HTTPS (Apache lub nginx). Wersja chmurowa to Cloudflare Worker z bazą D1, a autor
zaznacza, że darmowy limit zapisów D1 jest ciasny.

| Opcja | Zalety | Wady |
|---|---|---|
| A. Node na CT8 | Własny serwer, brak zależności od chmury, brak limitów D1 | CT8 ma Node 22.22.2, relay na nim działa; nieznane, czy CT8 pozwala na stały proces; po stronie hostingu mogą być limity procesów |
| B. Cloudflare Worker + D1 | Gotowy skrypt wdrożenia, zero zmian w kodzie | Cloudflare widzi adresy IP i czas; możliwy limit zapisów przy 6 do 7 osobach |
| C. Port relaya na PHP + SQLite | Pasuje do tego, co już działa na CT8 | Druga implementacja do utrzymania; trzeba zweryfikować podpisy (Ed25519 i P-256) lub świadomie je uprościć |
| D. Mały VPS | Pełna kontrola | Koszt i administracja |

Rekomendacja: najpierw F0-1. Jeśli CT8 obsługuje Node 24 i stały proces, wybierz A. Jeśli nie,
zacznij od B (najszybciej do działającego systemu) i ewentualnie wróć do C. Wybór D tylko, gdy
żadna z pozostałych nie zadziała.

Wynik F0-1, część pierwsza (2026-10-14, właściciel i Claude):

- Na CT8 (serwer `s1`) `node -v` zwraca `v22.22.2`. Node 24 nie ma, ale nie jest potrzebny:
  `node:sqlite` działa bez flagi od Node 22.13, a relay używa tylko podstawowego API
  (`DatabaseSync`, `prepare`, `run`, `get`, `all`, `exec`; `relay/d1sqlite.mjs`). Jedyny skutek to
  ostrzeżenie `ExperimentalWarning` w logu przy starcie.
- Sprawdzone w kontenerze Claude na Node 22.22.0 (nie na samym CT8): `test/relay.test.mjs`
  61 z 61, `test/server.test.mjs` 13 z 13, cały zestaw 1084 przeszło, 34 pominięte, 0 błędów
  (po `bash tools/sync-vendor.sh`). `node relay/server.mjs` z plikową bazą odpowiada na
  `GET /api/v2/health` treścią `{"ok":true}`. Ten sam wynik na Node 24.21.0 (F0-5).
- `package.json` forka deklaruje `"engines": {"node": ">=24"}`, a `AGENTS.md` każe testować na
  Node 24. To wymóg formalny, nie techniczny dla relaya; zmiana obu to decyzja właściciela.

Zostaje do sprawdzenia na CT8 (właściciel, kilka minut):

1. `node -e "const {DatabaseSync}=require('node:sqlite');console.log(new DatabaseSync(':memory:').prepare('select sqlite_version() v').get())"`
   ma wypisać wersję SQLite (potwierdza, że kompilacja Node na serwerze ma SQLite).
2. Czy CT8 pozwala na stale działający proces Node i jak wystawia go na HTTPS przez domenę
   (panel lub `devil www`, typ strony Node.js, certyfikat Let's Encrypt). To wniosek z ogólnej
   wiedzy o panelu, nie sprawdzony fakt: strony Node.js na tego typu hostingu zwykle uruchamia
   Passenger, który sam startuje i usypia proces. Relay to znosi, bo baza jest w pliku, a
   czyszczenie po 24 godzinach i tak dzieje się przy każdym odczycie.
3. Czy proces przeżywa restart serwera i czy limity konta (procesy, pamięć) nie zabijają go.

Wniosek: wersja Node przestała blokować opcję A. Jeśli punkty 2 i 3 dadzą odpowiedź twierdzącą,
rekomendacja to A. Liczby obciążenia dla opcji B: F1-1.

## D2. Gdzie żyją wiadomości czatu i jak długo

Status: **otwarta**, rozstrzyga F3-0.

Fakty z kodu forka (wersja 0.21.0):

- Każdy członek ma na relayu najwyżej 240 ostatnich wpisów (`TRAIL_CAP`), wspólnych dla
  pozycji i wszystkiego, co publikuje. Przy kadencji 15 s w ruchu to około godziny.
- Wiersz ma klucz główny `(kanał, członek, czas)`, a czas musi rosnąć ściśle dla każdego
  członka (relay odpowiada 409 przy niższym lub równym).
- Wiadomość jest dopełniana do 512 B; największa wiadomość aplikacji zostawia 24 B zapasu.
- Odbiorca przyjmuje pozycje tylko z rosnącą parą `(epoka, czas)`; wiadomości kontrolne
  mają osobny, ograniczony zbiór deduplikacji.
- Klucze starsze niż okno historii (domyślnie 1 godzina) są niszczone, więc starsze
  wiadomości da się odczytać tylko z lokalnego archiwum.

| Opcja | Opis | Koszt |
|---|---|---|
| A | Nowy typ `t:"chat"` w istniejącym strumieniu, podniesiony limit wpisów lub osobne zliczanie | Mniejsza zmiana, ale czat konkuruje o miejsce z pozycjami |
| B | Osobna linia lub kanał wyprowadzony z łańcucha kluczy (nowa etykieta HKDF) | Czystsze, ale zmienia zamrożoną kryptografię i wymaga nowej wersji protokołu |
| C | Wariant A najpierw, B tylko jeśli pomiary pokażą problem | Pragmatyczne, wymaga mierzenia |

Rekomendacja robocza: C. Ostatecznie decyduje ADR z F3-0 po recenzji dwóch modeli.

## D3. iOS dla jednego członka rodziny

Status: **otwarta**, zależy od F0-2.

Fakty: iOS-owa wersja forka to WKWebView bez działania w tle. Udostępnianie lokalizacji i
powiadomienia (SOS, czat, wejście do miejsca) działają tylko przy otwartej aplikacji.
Aplikacja instalowana bez płatnego konta Apple wygasa co 7 dni. Skanowanie kodu
kamerą na iOS nie było testowane na urządzeniu.

Opcje: A) zostaje wrapper i akceptujemy ograniczenie, B) natywny Swift (F4), C) telefon z
Androidem dla dziecka. Rekomendacja: C lub B, nigdy A jako rozwiązanie docelowe dla telefonu
dziecka. Wybór B wymaga Maca i konta Apple.

## D4. Gdzie leży kod

Status: **otwarta**, rozstrzyga F0-4.

Opcje: A) kod zostaje w forku `Jack4B/starling`, a to repozytorium trzyma tylko plan i
zasady, B) kod trafia do tego repozytorium (łatwiejsze CODEOWNERS i ochrona gałęzi w
jednym miejscu, trudniejsze scalanie z upstreamem), C) fork z gałęzią `main` jako
lustrem upstreamu i osobną gałęzią rodzinną. Rekomendacja: A na start, bo scalanie z
upstreamem i historia forka zostają nietknięte. Prywatność: fork jest publiczny; jeśli w
kodzie miałyby się znaleźć dane rodziny lub adresy, repo powinno być prywatne.

## D5. Zakres funkcji w stylu Life360

Status: **proponowana** (do potwierdzenia przez właściciela).

W zakresie: lokalizacja na żywo, miejsca, SOS, check-in, bateria, aktywność (stoi, idzie,
jedzie), czat. Poza zakresem: wykrywanie wypadków, raporty jazdy, rankingi, reklamy.

## D6. Język

Status: **proponowana**. Aplikacja w całości po polsku (F2-6). Dokumenty projektu po polsku,
kod i commity po angielsku.
