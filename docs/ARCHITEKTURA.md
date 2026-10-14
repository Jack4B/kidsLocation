# Architektura: ustalenia z analizy kodu

Źródło: przegląd forka `Jack4B/starling`, wersja 0.21.0, commit `8ec6dad` z 2026-10-12.
To są **fakty ze stanu na ten dzień**, nie plany. Numery linii zmienią się wraz z kodem.
Gdy kod i ten plik się rozjeżdżają, wygrywa kod i trzeba poprawić plik.

## Z czego składa się aplikacja

| Część | Rozmiar | Uwagi |
|---|---|---|
| `app/` (HTML, CSS, JS) | około 28 tys. linii JS | Cała logika i interfejs; działa w WebView na Androidzie i iOS |
| `app/js/main.js` | 7907 linii | Główny orkiestrator; przyjmowanie wiadomości około linii 2300, SOS około 6750 |
| `app/js/ui.js` | 3585 linii | Widoki i komponenty |
| `app/css/app.css` | 2833 linie | Style; tu żyje motyw |
| `app/js/map.js` | 352 linie | Mapa na Leaflet; start na widoku świata (`setView([20, 0], 3)` około linii 42) |
| `app/js/crypto.js`, `ratchet.js`, `wire.js` | 332, 325, 206 linii | Szyfrowanie, łańcuch kluczy, stałe protokołu; `crypto.js` i `wire.js` zamrożone |
| `relay/src/index.js` | 453 linie | Serwer pośredniczący; ten sam kod działa w Cloudflare i pod Node |
| `relay/server.mjs` | 183 linie | Adapter Node z plikową bazą SQLite; wymaga Node 24 |
| `android/` | około 4,7 tys. linii Kotlina | Cienka otoczka WebView: usługa lokalizacji w tle, most do JS, powiadomienia |
| `ios/` | 252 linie Swifta | Otoczka WKWebView bez działania w tle |
| `test/` | około 26,5 tys. linii | 1118 testów jednostkowych, wektory testowe, testy e2e w przeglądarce |

Zależności: brak zależności uruchomieniowych. Jedyna zależność deweloperska to Leaflet 1.9.4,
dociągany skryptem `tools/sync-vendor.sh`. Bez niego dwa testy padają (sprawdzają, że pliki
Leaflet istnieją na dysku). Po `npm ci` i `bash tools/sync-vendor.sh` na Node 24.21.0 i na
Node 22.22.0 przechodzi 1084 testy, 34 jest pominiętych, 0 błędów (F0-5).

## Protokół w skrócie (szczegóły: `docs/PROTOCOL.md` w forku)

- Klucze treści są wyprowadzane z łańcucha, który przesuwa się co 10 minut i niszczy
  poprzedni klucz. Każdy członek ma własny klucz nadawcy.
- Wiadomości są dopełniane do 512 B, szyfrowane AES-256-GCM i podpisane kluczem członka
  (Ed25519, w razie potrzeby ECDSA P-256).
- Zaproszenie to jednorazowy sekret w fragmencie adresu; dołączenie wymaga, żeby zapraszający
  był online i zaakceptował numer bezpieczeństwa. Usunięcie członka to ponowne wygenerowanie
  kluczy bez niego.
- Relay przechowuje wyłącznie szyfrogram, przypięte klucze publiczne i czasy; wiersze wygasają
  po 24 godzinach.
- Odbiorca ignoruje nieznane pola i nieznane typy wiadomości. Wersje do 0.17.1 traktowały
  jednak nieznany typ jak pozycję, dlatego upstream wprowadza nowe funkcje jako pola.

Stałe (z `wire.js` i `PROTOCOL.md`): `PAD_LEN` 512 B, `PAD_RESERVE` 24 B, `MEMBER_CAP` 16,
`TRAIL_CAP` 240, `TTL_MS` 24 h, `MAX_BODY` 2048 B, `EPOCH_MS` 10 min, domyślna historia
1 godzina (ustawialna od 10 minut do 24 godzin).

Tabela relaya `points_v3` ma klucz główny `(channel, member, ts)`. Relay odrzuca post z czasem
niewiększym niż ostatni zapisany dla tego członka (409).

## Android

- Udostępnianie działa w usłudze pierwszoplanowej typu lokalizacja, więc przeżywa wygaszony
  ekran. Przesunięcie aplikacji z listy ostatnich kończy udostępnianie, chyba że włączono
  osobne ustawienie „Utrzymaj udostępnianie po zamknięciu aplikacji" (domyślnie wyłączone).
- Powiadomienia (SOS, wejście do miejsca, niski poziom baterii) buduje aplikacja lokalnie;
  nie ma Firebase ani serwisów Google. Tytuł i treść domyślnie nie trafiają do powiadomienia
  (tylko tekst ogólny); wyjątek to opcjonalne `notifyDetail`.
- Obsługa Androida 9 wymaga WebView w wersji 137 lub nowszej (weryfikacja podpisów Ed25519).

## iOS

- Tylko otoczka WKWebView, bez działania w tle: udostępnianie i powiadomienia pracują,
  gdy aplikacja jest otwarta. Brak mostu do magazynu kluczy systemu. W `Info.plist` jest
  wyłącznie uprawnienie lokalizacji „podczas używania".
- Instalacja bez płatnego konta Apple wygasa co 7 dni. Katalog `ios/` generuje się
  narzędziem `xcodegen`; projekt Xcode nie jest w repozytorium.

## Kontrola jakości w forku

- `node --test test/*.test.mjs` uruchamia testy, w tym replay wektorów z `test/vectors/`.
- `tools/check-clean.sh` odrzuca półpauzy i dywizy długie oraz ślady AI w drzewie plików.
- Testy e2e wymagają prawdziwego Firefoksa i nie są uruchamiane w CI.
- Upstream deklaruje brak niezależnego audytu bezpieczeństwa. Własny przegląd to F5-1.

## Co z tego wynika dla naszych zadań

- Czat: ograniczenie 240 wpisów i ścisły wzrost znaku czasu są głównym ryzykiem projektowym (D2).
- Interfejs: motyw i układ mieszczą się w CSS i `ui.js`; `main.js` ruszamy minimalnie.
- iOS: działanie w tle wymaga przeniesienia szyfrowania do kodu natywnego (D3).
- Brak katalogu polskiego: upstream ma de, es, fr, pt; polski trzeba dodać (F2-6).
