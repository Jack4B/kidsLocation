# Dziennik przekazań

Dopisuj nowe wpisy na górze. Każdy wpis: data, model, zadanie, co zrobiono, czego nie
zrobiono, co sprawdzono (i jak), co sprawdzono tylko przez czytanie, następny krok,
pytania do właściciela. Drugi model zaczyna od zera, więc pisz konkretnie.

---

## 2026-10-14, Claude, F1-7: relay rodziny i linki zaproszeń bez starlingmap.app

Zrobiono:

- Domyślny relay z budowania, nie z gita. `starling/app/js/build-config.js` w repo ma pusty
  `BUILD_RELAY`; Gradle (`syncWebAssets`) nadpisuje go w `build/webassets` wartością z
  `RELAY_URL` i ustawia z niej host App Links (`manifestPlaceholders["relayHost"]`) oraz
  `BuildConfig.RELAY_HOST` (używane przez `MainActivity.APP_HOST`). Bez `RELAY_URL`
  host to zarezerwowany `relay.invalid`, a aplikacja przy pierwszym uruchomieniu prosi o
  adres relaya (nowy arkusz „Connect to your family relay”) i blokuje tworzenie kręgu oraz
  dołączanie z linku bez relaya. `tools/gen-build-config.mjs` robi to samo dla innych
  budowań; ta sama reguła walidacji co w Gradle (test pilnuje zgodności).
- `env.js`: zamiast stałej `https://starlingmap.app` jest `defaultRelay` z build config;
  linki zaproszeń w aplikacji budowane na originie relaya rodziny (dwuczęściowe, gdy
  relay to ten wbudowany; trzyczęściowe z relayem, gdy ktoś wpisał inny).
- Usunięto link „What Starling is and how it works” do starlingmap.app ze startu w
  aplikacji i placeholder `https://starlingmap.app` w ustawieniach.
- Relay: `assetlinks.json` z `ANDROID_PACKAGE` i `ANDROID_CERT_SHA256` (domyślnie dane
  upstreamu, błędna lub połowiczna konfiguracja daje 500). Gdy `ANDROID_PACKAGE` jest
  ustawione, `GET /` zwraca statyczną polską stronę dla zaproszenia otwartego w
  przeglądarce. `relay/server.mjs` przekazuje obie zmienne ze środowiska. Logiki podpisów
  nie dotykano.
- CI: `RELAY_URL` z sekretów tylko do kroku budowania APK (adres nie jest wypisywany);
  krok podpisu wypisuje `ANDROID_CERT_SHA256=...` (też w Summary).
- `docs/WDROZENIE-CT8.md`: kroki dla właściciela.
- Testy: `test/family-build.test.mjs` (nowy), zmienione `test/env.test.mjs` (stare testy
  zakładały starlingmap.app jako domyślny relay w aplikacji; teraz sprawdzają relay z
  build config i brak relaya), nowy przypadek w `test/main-guards.test.mjs`. Skrypty e2e
  (`e2e_wrapper`, `e2e_share_resume`, `e2e_qrscan`) używają `RELAY_URL=https://relay.e2e.test`
  przez `serve_local.mjs`.

Sprawdzono: wynik bazowy przed zmianą 1118 testów, 1084 przeszło, 34 pominięto, 0 błędów.
Po zmianie: 1140, 1106 przeszło, 34 pominięto, 0 błędów. `check-clean.sh` czysty.
E2E w Chromium: `e2e_wrapper`, `e2e_share_resume`, `e2e_qrscan` przechodzą (w tym dołączenie
skanem QR). Zrzut ekranu arkusza pierwszego uruchomienia bez relaya obejrzany.

Sprawdzono tylko przez czytanie: zmiany Gradle, manifestu i Kotlina (brak SDK; pierwsze
prawdziwe sprawdzenie to CI), weryfikacja App Links na telefonie, krok CI z odciskiem.

Nie zrobiono: strona `/help` (link pomocy awaryjnej dla osób bez aplikacji) nie jest
serwowana przez relay na Node; iOS bez zmian; `privacy.html` i metadane `<head>` w
`index.html` nadal opisują starlingmap.app (to tekst, nic nie jest pobierane). Teksty
nowego arkusza są po angielsku jako klucze i przetłumaczone na es/de/fr/pt; polskie
tłumaczenie należy do F2-6 (test pokrycia go wymusi). Propozycja:
„Połącz z relayem rodziny”, „Wpisz adres relaya rodziny.”, „Ta aplikacja nie ma
wbudowanego adresu relaya. Wpisz adres relaya rodziny, na przykład
https://relay.example.org. Cała rodzina używa tego samego, a do czasu jego ustawienia nic
nie jest nigdzie wysyłane.” Klucz „What Starling is and how it works &#8599;” zniknął z
aplikacji, więc nie trzeba go tłumaczyć.

Następny krok: właściciel dodaje sekret `RELAY_URL`, po budowie przepisuje odcisk z logu do
`~/start-relay.sh` (`ANDROID_PACKAGE=app.kidslocation`, `ANDROID_CERT_SHA256=...`) i
restartuje relay; potem F1-4 (dwa telefony, link i QR).

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

---

## 2026-10-14, Claude, F3 czat (gałąź `zadanie/F3-czat`)

Wynik bazowy przed zmianą (z `origin/wydanie/1.0`, po `npm ci` i `tools/sync-vendor.sh`):
1118 testów, 1084 przeszło, 34 pominięto, 0 nie przeszło.

Zrobiono:

- Czat rodzinny według ADR-001, wariant A: typ `t:"chat"` w strumieniu członka, koperta
  `{v:2, ts, t:"chat", k, q, x}`, budżet 402 B na tekst, miękkie 280 znaków. Bez zmian
  w `crypto.js`, `wire.js`, `PROTOCOL.md` i relayu.
- `app/js/chat.js` (format, budżet, archiwum, luki, kolejka FIFO, kontroler),
  `app/js/chatview.js` (`mountChat`), `app/css/chat.css`, gałąź odbioru w `net.js`,
  podpięcie w `main.js` (przycisk w narzędziach arkusza, archiwum przez `atRestForm`,
  wipe, powiadomienia, linie miejsc w osi).
- Android: kanał „Wiadomości” (`events_chat`), ogólny tekst na ekranie blokady.
- Testy: `test/chat*.test.mjs` (59 nowych), w tym dwóch członków przez prawdziwy kod
  relaya. Zaktualizowane istniejące testy (zmiana zamierzona): `detail-alerts`,
  `notify-kinds`, `sw-manifest`, lista plików w `i18n`.
- E2E w przeglądarce: `test/e2e_chat.mjs` (dwa konteksty Playwright, lokalny relay przez
  `test/serve_local.mjs`); zrzuty w `/mnt/project-files/wydanie-1.0/czat/`.
- Dokumentacja: `docs/adr/ADR-001-czat.md` (przyjęty, sekcja decyzji i opis protokołu),
  `starling/docs/CHAT.md`, `docs/nowe-teksty-F3.md`.

Wynik po zmianie: 1178 testów, 1144 przeszło, 34 pominięto, 0 nie przeszło.
`check-clean.sh` i `check-notification-privacy.sh` przechodzą.

Nie zrobiono lub nie sprawdzono:

- Build Androida, prawdziwy telefon, iOS, dwa konteksty JS na Androidzie.
- F3-7 (pole możliwości w `loc`).
- Dopisek do `PROTOCOL.md` (plik zamrożony; wymaga zgody właściciela).
- Czat na kanale poprzedniej generacji w czasie re-key jest pomijany (widać lukę).
- Interfejs czatu po angielsku do czasu polskiego katalogu (F2-6); teksty
  w `docs/nowe-teksty-F3.md`.

Następny krok: recenzja i scalenie przez prowadzącego; decyzje do ewentualnej zmiany przez
właściciela są w sekcji „Decyzje przyjęte 2026-10-14” w ADR-001.
