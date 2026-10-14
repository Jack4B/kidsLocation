# Otwarte decyzje

Każda decyzja ma opcje, rekomendację i status. Zamykając decyzję, wpisz datę, wybór
i krótkie uzasadnienie. Modele nie rozstrzygają za właściciela.

## D1. Gdzie działa relay

Status: **otwarta**, zależy od F0-1 i F1-1.

Fakty: relay to jeden plik (`relay/src/index.js`, około 450 linii) plus adapter
`relay/server.mjs` uruchamiający ten sam kod pod Node z plikową bazą SQLite. Wymaga
Node 24 lub nowszego (używa `node:sqlite`) i długo działającego procesu za serwerem
HTTPS (Apache lub nginx). Wersja chmurowa to Cloudflare Worker z bazą D1, a autor
zaznacza, że darmowy limit zapisów D1 jest ciasny.

| Opcja | Zalety | Wady |
|---|---|---|
| A. Node na CT8 | Własny serwer, brak zależności od chmury, brak limitów D1 | Nieznane, czy CT8 pozwala na Node 24 i stały proces; po stronie hostingu mogą być limity procesów |
| B. Cloudflare Worker + D1 | Gotowy skrypt wdrożenia, zero zmian w kodzie | Cloudflare widzi adresy IP i czas; możliwy limit zapisów przy 6 do 7 osobach |
| C. Port relaya na PHP + SQLite | Pasuje do tego, co już działa na CT8 | Druga implementacja do utrzymania; trzeba zweryfikować podpisy (Ed25519 i P-256) lub świadomie je uprościć |
| D. Mały VPS | Pełna kontrola | Koszt i administracja |

Rekomendacja: najpierw F0-1. Jeśli CT8 obsługuje Node 24 i stały proces, wybierz A. Jeśli nie,
zacznij od B (najszybciej do działającego systemu) i ewentualnie wróć do C. Wybór D tylko, gdy
żadna z pozostałych nie zadziała.

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

Status: **zamknięta 2026-10-14: B.** Właściciel wybrał kod w tym (prywatnym) repozytorium.
Kod forka zaimportowano z pełną historią do katalogu `starling/` (`git subtree add`),
upstream dociągamy `git subtree pull`. Fork `Jack4B/starling` zostaje jako archiwum,
nowe zmiany kodu idą tylko tutaj.

Opcje rozważane: A) kod zostaje w forku `Jack4B/starling`, a to repozytorium trzyma tylko plan i
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

## D7. Wspólne miejsca w kręgu

Status: **otwarta**, rozstrzyga F6-0. Właściciel zlecił rozpisanie 2026-10-14.

Fakty: miejsca żyją dziś tylko na telefonie (`starling/app/js/places.js`), najwyżej 10, promień
100, 250 lub 500 m. Relay nie wie, że istnieją. Czat pokazał, że nowy typ wiadomości w strumieniu
członka działa bez zmian w kryptografii i relayu, ale wiadomość znika z relaya po 24 godzinach
albo wcześniej, gdy nadawca w ruchu wypełni 240 wpisów.

Pytania do właściciela (w nawiasie rekomendacja):

1. Kto może zmienić lub usunąć miejsce dodane przez kogoś innego? (każdy w kręgu)
2. Czy zostawić też miejsca prywatne, widoczne tylko na jednym telefonie? (tak, przełącznik
   „Tylko u mnie”, domyślnie miejsce jest wspólne)
3. Co z miejscami dodanymi przed aktualizacją? (zostają prywatne, można je udostępnić jednym
   dotknięciem)
4. Czy alert „Kuba dotarł do Szkoły” ma przychodzić każdemu w kręgu? (tak, z tymi samymi
   zasadami prywatności powiadomień co dziś)

