# Dziennik przekazań

Dopisuj nowe wpisy na górze. Każdy wpis: data, model, zadanie, co zrobiono, czego nie
zrobiono, co sprawdzono (i jak), co sprawdzono tylko przez czytanie, następny krok,
pytania do właściciela. Drugi model zaczyna od zera, więc pisz konkretnie.

---

## 2026-10-14, Claude, F1-8b: wydanie także z ręcznego uruchomienia

Klucz rodziny dodany przez właściciela. Ręczny przebieg „Aplikacja CI” na `main`
(run 38579655710) podpisał APK (krok podpisu: success, artefakt `kidslocation-signed`), ale
wydania nie utworzył, bo warunek wymagał zdarzenia `push`. Poprawka: wydanie powstaje na
`main` przy każdym zdarzeniu poza `pull_request`. Po scaleniu tego PR pierwsze wydanie
powstanie samo (zmiana dotyka pliku workflow, więc uruchamia CI na `main`).

---

## 2026-10-14, Claude, F1-8: własne APK z aktualizacjami

Zrobiono:

- `starling/android/app/build.gradle.kts`: `applicationId` = `app.kidslocation` (namespace
  Kotlina bez zmian, żeby nie ruszać kodu), `versionCode` = 2100 * 1000 + `FAMILY_BUILD`
  (numer przebiegu CI). Podbicie wersji w upstreamie podnosi część wysoką, więc numer
  zawsze rośnie.
- CI (`.github/workflows/aplikacja.yml`, zadanie `android`): jeśli istnieją sekrety
  `ANDROID_KEYSTORE_B64` i `ANDROID_KEYSTORE_PASSWORD`, podpisuje APK (`apksigner`, alias
  `rodzina`), wrzuca je jako artefakt, a na `main` tworzy wydanie `apk-<wersja>-<numer>`
  (dla Obtainium). Bez sekretów wszystko działa jak dotąd, krok podpisu jest pomijany.
- `.github/workflows/klucz-podpisu.yml`: jednorazowe, ręczne utworzenie klucza i hasła,
  oddane jako prywatny artefakt na 1 dzień. Klucz nie trafia do repo ani do rozmowy.
- `docs/PODPIS-APK.md`: kroki dla właściciela i Obtainium.

Sprawdzono: składnia YAML obu workflow (parser). Budowy Androida lokalnie nie ma (brak
SDK w kontenerze), więc pierwszym sprawdzeniem jest CI na tym PR.

Nie zrobiono (osobne zadania): linki zaproszeń i App Links nadal wskazują
`starlingmap.app` (`AndroidManifest.xml` linia 69, `relay/src/index.js` linia 374 ma
`package_name` `app.starlingmap`); to F1-7. Nazwa aplikacji na ekranie nadal „Starling”
(F2-6). iOS bez zmian (D3 otwarta).

Uwaga dla rodziny: to nowa aplikacja obok ewentualnie zainstalowanego Starlinga, krąg
trzeba w niej założyć od nowa.

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
## 2026-10-14, Claude, F0-6 (przegląd zgodności, nowe zadanie)

Zrobiono: przegląd forka 0.21.0 względem zasad prywatności z `AGENTS.md`, wynik w
`docs/PRZEGLAD-ZGODNOSCI.md`. Najważniejsze: kafelki OSM są domyślnie włączone (wymagają
świadomego wyjątku albo pośrednika), a aplikacja bez ustawionego relaya rozmawia z
`starlingmap.app` i tam kieruje linki zaproszeń. Zaproponowano zadania F0-6, F1-6, F1-7 na końcu
`docs/PLAN.md`; to propozycja, właściciel je przyjmuje albo odrzuca.

Sprawdzono tylko przez czytanie kodu i `grep`; nie podglądano ruchu sieciowego telefonu.

Pytanie do właściciela: kafelki OSM, opcja A (wyjątek, rekomendacja), B (domyślnie bez mapy
ulic) czy C (pośrednik na serwerze)?

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
