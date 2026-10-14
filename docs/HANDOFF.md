# Dziennik przekazań

Dopisuj nowe wpisy na górze. Każdy wpis: data, model, zadanie, co zrobiono, czego nie
zrobiono, co sprawdzono (i jak), co sprawdzono tylko przez czytanie, następny krok,
pytania do właściciela. Drugi model zaczyna od zera, więc pisz konkretnie.

---

## 2026-10-14, Claude, F0-4: kod aplikacji w tym repozytorium (D4 = B)

Zrobiono:

- Właściciel wybrał D4 = B i zdjął zakaz pisania kodu (karta decyzji w projekcie, 14.10).
- Zaimportowano `Jack4B/starling` (0.21.0, `8ec6dad`, 234 commity) do `starling/` przez
  `git subtree add`, z pełną historią. Licencja GPL-3.0-or-later zostaje w `starling/LICENSE`.
- Dodano `.github/workflows/aplikacja.yml`: testy na Ubuntu z Node 22 i 24, `check-clean`,
  kontrola prywatności powiadomień, budowa niepodpisanego APK z kontrolą uprawnień.
  Względem CI forka: bez macOS i Windows (minuty w prywatnym repo), iOS tylko ręcznie
  (`workflow_dispatch` z opcją `ios`), bez lustra GitLab. Uruchamia się tylko przy
  zmianach w `starling/`.
- Zaktualizowano `AGENTS.md` (ścieżki, testy, upstream), D4 w `DECYZJE.md`, F0-4 w `PLAN.md`.

Sprawdzono (uruchomione w `starling/` na Node 22.22.0, po `npm ci` i
`bash tools/sync-vendor.sh`): `node --test test/*.test.mjs` daje 1118 testów, 1084 przeszło,
34 pominięto, 0 nie przeszło (tak samo jak w forku). `bash tools/check-clean.sh`: czysto.

Nie sprawdzono: nowy workflow nie był jeszcze uruchomiony na GitHubie (pierwszy przebieg
na tym PR). Budowy Androida lokalnie nie uruchamiano.

Następny krok: F1-7 (własny applicationId, klucz podpisu, wersje, domyślny relay i linki
zaproszeń poza starlingmap.app), równolegle F1-4 (test dwóch Androidów na relayu CT8).
Otwarte PR-y z dokumentami (#1 do #6, #8) mają wpisy w HANDOFF i będą wymagały rebase.
## 2026-10-14, Claude, F2-9 (makiety brakujących ekranów)

Zrobiono: `docs/makiety/makiety-F2-9.html` (samodzielny plik, bez zasobów z sieci, otwiera się
w zwykłej przeglądarce), 13 ekranów w obu motywach: Miejsca (lista, edycja z promieniem,
wskazanie na mapie), aktywny SOS (u wysyłającego, u odbiorcy w aplikacji i na ekranie blokady),
zaproszenie (kod QR i link, skan lub wklejenie, prośba z numerem bezpieczeństwa), pierwsze
uruchomienie (powitanie, lokalizacja, utworzenie kręgu, czekanie). Zrzuty w `docs/makiety/png/`
(zrzut całej strony `png/calosc.png` generuje `node narzedzia/full.cjs`, nie jest w repozytorium),
generator i skrypty w `docs/makiety/narzedzia/`, opis i 12 pytań do właściciela w `DESIGN.md`.

Sprawdzono: kontrast wszystkich par tekstu wzorem WCAG (`docs/makiety/kontrast.txt`, najniższy
4,76 do 1; para akcent na powierzchni 2 w jasnym, 4,45, zakazana w DESIGN); render w Chromium
przez Playwright z automatyczną kontrolą przepełnień i celów dotyku; brak półpauz i pauz.

Nie sprawdzono: docelowych czcionek (w kontenerze ich nie ma, zrzuty używają zastępczej),
dużej czcionki systemowej, ekranów węższych niż 390, czytnika ekranu.

Ustalenia z forka ważne dla właściciela: miejsca są tylko lokalne (`places.js` linie 1 do 14,
co przeczy podpisowi na planszy Osoba); powiadomienie SOS na Androidzie nie ma imienia ani
miejsca (`Events.kt` linie 42 do 45); fork pyta o lokalizację dopiero przy pierwszym
udostępnianiu.

Następny krok: recenzja Gemini, odpowiedzi właściciela na pytania z sekcji „Do decyzji
właściciela" w `DESIGN.md`.

---

## 2026-10-14, Claude, przekazanie do nowej sesji

Dodano `docs/KONTEKST-ROZMOWY.md` (streszczenie rozmowy, ograniczenia, pytania) i źródła
makiet w `docs/makiety/zrodla/`. Kodu nie zmieniano. Nowa sesja zaczyna od
`docs/KONTEKST-ROZMOWY.md`.

---

## 2026-10-14, Claude, faza 0 (przygotowanie)

Zrobiono:

- Przeanalizowano fork `Jack4B/starling` w wersji 0.21.0 (commit `8ec6dad`): README,
  `SELF-HOSTING.md`, `IOS.md`, `PROTOCOL.md`, relay, strukturę `app/`, `android/`, `ios/`.
  Wyniki w `docs/ARCHITEKTURA.md`.
- Uruchomiono testy jednostkowe na Node 22.22: 1118 testów, 1082 przeszło, 34 pominięto,
  2 nie przeszły. Oba to kontrola istnienia plików Leaflet w `/vendor/` (brak
  `tools/sync-vendor.sh`), nie błąd kodu. Repo wymaga Node 24; nie sprawdzono, czy na 24
  jest tak samo.
- Przygotowano makiety interfejsu w motywie jasnym i ciemnym oraz tokeny (`docs/DESIGN.md`).
- Spisano plan (`docs/PLAN.md`), decyzje (`docs/DECYZJE.md`) i zasady dla modeli.

Nie zrobiono:

- Nie zmieniano kodu aplikacji. Nie uruchamiano relaya. Nie testowano na urządzeniach.
- Nie sprawdzano CT8 (wersja Node, długo działające procesy).
- Makiety nie były sprawdzane wizualnie ani na prawdziwym ekranie.

Repozytorium `Jack4B/kidsLocation` założył właściciel; Claude wgrał do niego tę zawartość
na `main` (commit `5ffc0c8`). F0-3 jest w połowie: zostaje podpięcie Gemini i Groka.

Następny krok: właściciel wykonuje F0-1 i F0-2 oraz podpina Gemini i Groka; potem F0-5 i F1-1.

Pytania do właściciela: wynik `node -v` na CT8; czy jest Mac; gdzie ma leżeć kod (D4).
