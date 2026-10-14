# Zasady dla wszystkich modeli (AGENTS.md)

Ten plik obowiązuje Claude, Gemini, Groka i każdego innego agenta. Wersje per model
(`CLAUDE.md`, `GEMINI.md`, `GROK.md`) tylko go uzupełniają i nigdy mu nie przeczą.

## Kontekst w pięciu zdaniach

Budujemy prywatną rodzinną aplikację do udostępniania lokalizacji na bazie forka
Starling (kod aplikacji to HTML/CSS/JS uruchamiany w WebView na Androidzie, relay to
mały serwer z jedną tabelą SQLite). Użytkownicy: kilka osób z jednej rodziny, w tym
dzieci. Dane są wrażliwe, więc prywatność wygrywa z wygodą i z funkcjami. Właściciel
projektu zatwierdza i scala zmiany. Nikt poza nim nie decyduje o protokole i kryptografii.
Pracujemy małymi krokami: jedno zadanie, jedna gałąź, jeden pull request.

## Zanim zaczniesz

1. Przeczytaj `docs/PLAN.md`, `docs/ARCHITEKTURA.md`, `docs/DECYZJE.md` i ostatnie wpisy
   w `docs/HANDOFF.md`.
2. Weź jedno zadanie z `docs/PLAN.md` (identyfikator w rodzaju `F2-3`). Nie zaczynaj
   zadania, którego zależności nie są ukończone ani zadania przypisanego komu innemu
   bez zgody właściciela.
3. Jeśli zadanie wymaga decyzji z `docs/DECYZJE.md`, która jest otwarta, zatrzymaj się
   i zapisz pytanie w HANDOFF zamiast zgadywać.

## Zasady pracy

- **Gałąź na zadanie:** `zadanie/<id>-krotki-opis`. Nigdy nie pushuj na `main`.
- **Autor nie recenzuje sam siebie.** Zmianę napisaną przez jeden model recenzuje inny
  (patrz tabela w `docs/PLAN.md`). Scala właściciel.
- **Pliki zamrożone.** Bez zgody właściciela nie zmieniaj: `app/js/crypto.js`,
  `app/js/wire.js`, logiki podpisów i przypinania kluczy w relayu, `docs/PROTOCOL.md`
  (ścieżki dotyczą kodu forka). Zmiana protokołu wymaga: opisu w ADR, podbicia wersji,
  regeneracji wektorów testowych (`node tools/gen-vectors.mjs`) i recenzji drugiego modelu.
- **Testy.** Node 24 lub nowszy, najpierw `bash tools/sync-vendor.sh`, potem
  `node --test test/*.test.mjs`. Nowe zachowanie dostaje test. Nie pisz, że testy
  przeszły, jeśli ich nie uruchomiłeś; wklej komendę i wynik do PR.
- **Zero nowych zależności uruchomieniowych.** Aplikacja i relay używają tylko bibliotek
  standardowych i API platformy. Wyjątek wymaga uzasadnienia w PR.
- **Prywatność.** Żadnej analityki, żadnych żądań do usług firm trzecich (czcionki i
  kafelki map pakujemy lokalnie albo świadomie opisujemy wyjątek). Odszyfrowane pola od
  innych osób trafiają do DOM wyłącznie przez `textContent` i `createElement`, nigdy
  przez `innerHTML`. Do repozytorium nie trafiają klucze, tokeny, adresy prywatnego
  relaya ani dane osobowe rodziny.
- **Uczciwość.** Interfejs i dokumentacja mówią wprost, czego aplikacja nie robi
  (limit historii, 24 godziny na serwerze, brak działania w tle na iOS). Nie obiecuj
  więcej, niż kod robi.
- **Interfejs.** Trzymaj się `docs/DESIGN.md`: motyw jasny i ciemny, pola dotyku co
  najmniej 48 dp, kontrast tekstu 4,5 do 1, kolor nigdy sam bez ikony lub słowa.
  Teksty w interfejsie po polsku, zwykłe czasowniki, zdania z wielką literą na początku.
- **Języki.** Dokumenty i rozmowa z właścicielem po polsku. Kod, nazwy i komunikaty
  commitów po angielsku, jak w upstreamie. (Domyślne ustawienie; właściciel może zmienić.)
- **Upstream.** Fork ma skrypt `tools/check-clean.sh`, który odrzuca półpauzy i dywizy
  długie oraz ślady AI w drzewie plików. Jeśli kod trafia do forka, stosuj się do niego
  albo zaproponuj jego zmianę (decyzja D4).

## Po zakończeniu zadania

1. Otwórz PR z wypełnionym szablonem (`.github/pull_request_template.md`).
2. Dopisz wpis w `docs/HANDOFF.md`: co zrobiono, czego nie zrobiono, co sprawdzono,
   a czego nie, i co jest następnym krokiem. Pisz konkretnie, drugi model zaczyna od zera.
3. Zaktualizuj status zadania w `docs/PLAN.md`.

## Lista kontrolna recenzenta

- Czy zmiana robi dokładnie to, co mówi zadanie, i nic poza tym?
- Czy ruszono pliki zamrożone? Czy to uzasadnione i zatwierdzone?
- Czy są testy, czy zostały uruchomione, czy wynik pokrywa się z opisem?
- Czy pojawiły się nowe żądania sieciowe, zależności, logowanie danych lokalizacji?
- Czy nowe pole lub typ wiadomości mieści się w limicie 512 B po zakodowaniu w UTF-8
  (polskie znaki to 2 bajty)?
- Czy interfejs działa w obu motywach, czy kontrast i rozmiar celów dotyku są zachowane?
- Czy dokumentacja i opis zgadzają się z kodem?
