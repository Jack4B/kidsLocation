# Pomiary do ADR-001 (czat)

Data: 2026-10-14. Autor: Claude. Środowisko: Node 22.22.0, Linux.
Kod: fork Starling 0.21.0, commit `8ec6dad`, katalog lokalny klon forka (zmienna `STARLING_DIR`).
Skrypty importują `app/js/wire.js`, `app/js/crypto.js` i `app/js/ratchet.js` wyłącznie do
odczytu; nic w repozytoriach nie zostało zmienione.

## 1. Komendy

```
cd <ten katalog>
node measure.mjs   > wynik-measure.txt
node measure2.mjs  > wynik-measure2.txt
```

`measure.mjs`:

- odtwarza `worstCase()` z `test/crypto.test.mjs:551-573` (najdłuższy obecny komunikat),
  z `漢` jako znakiem 3-bajtowym i `ts = Number.MAX_SAFE_INTEGER`, jak w teście;
- mierzy narzut kopert czatu E1 do E4 i pojemność tekstu wyszukiwaniem binarnym po
  długości (`cleanText`, potem `JSON.stringify` i `TextEncoder`);
- sprawdza 280 znaków dla kilku rodzajów tekstu;
- szyfruje prawdziwym `sealMessage` i buduje post prawdziwym `buildPost`, sprawdza
  `checkPostShape`, `openMessage` i porównuje rozmiar z pozycją;
- liczy rozmiar wiersza w odpowiedzi GET i koszt odczytu `since=0`;
- liczy horyzont 240 wpisów dla różnych rytmów publikowania.

`measure2.mjs`: koperty E5 (E2 plus `k` i `q`) i E6 (rekomendowana: `{v, ts, t, k, q, x}`).

Koperty:

| Nazwa | Pola |
|---|---|
| E1 | `v, ts, t:"chat", x` |
| E2 | E1 plus `name` (24 × 3 B), `emoji` (8 × 3 B), `hue` 359 |
| E3 | E1 plus `re` (8 hex, kropka, ts) |
| E4 | E2 plus `re` |
| E5 | E2 plus `k` (11 znaków b64u, 64 bity) i `q` (najgorszy przypadek: MAX_SAFE_INTEGER) |
| E6 | E1 plus `k` i `q` (rekomendacja ADR) |

## 2. Wyniki

### measure.mjs

```
== Stale z wire.js ==
{
  PAD_LEN: 512,
  PAD_RESERVE: 24,
  MAX_BODY: 2048,
  TRAIL_CAP: 240,
  TTL_h: 24,
  budget: 488
}

== Najwiekszy obecny komunikat (worstCase z testu) ==
bajty: 482 wolne do PAD_LEN: 30
wariant 'pole x na istniejacym komunikacie': narzut pola 7 B; miejsce na tekst do PAD_LEN-PAD_RESERVE: -1 B; do PAD_LEN: 23 B

== Koperty czatu (pusty tekst) ==
E1 minimalna {v,ts,t,x}                  narzut 47 B; na tekst: 441 B (z rezerwa), 465 B (bez rezerwy)
E2 + name/emoji/hue (najdluzsze)         narzut 174 B; na tekst: 314 B (z rezerwa), 338 B (bez rezerwy)
E3 = E1 + odpowiedz re (8 hex + ts)      narzut 80 B; na tekst: 408 B (z rezerwa), 432 B (bez rezerwy)
E4 = E2 + re                             narzut 207 B; na tekst: 281 B (z rezerwa), 305 B (bez rezerwy)

udzial liter z diakrytykami w probce: 7.3% bajtow/znak w probce: 1.073

== Pojemnosc (jednostki UTF-16 .length) dla E1 minimalna {v,ts,t,x} ==
ASCII (a)                            z rezerwa (488):  441   do PAD_LEN (512):  465
polskie same diakrytyki              z rezerwa (488):  220   do PAD_LEN (512):  232
typowy polski tekst (probka)         z rezerwa (488):  407   do PAD_LEN (512):  430
emoji (2 jednostki UTF-16, 4 B)      z rezerwa (488):  221   do PAD_LEN (512):  233
cudzyslow " (escape 2 B)             z rezerwa (488):  220   do PAD_LEN (512):  232
CJK 3 B                              z rezerwa (488):  147   do PAD_LEN (512):  155

== Pojemnosc (jednostki UTF-16 .length) dla E2 + name/emoji/hue (najdluzsze) ==
ASCII (a)                            z rezerwa (488):  314   do PAD_LEN (512):  338
polskie same diakrytyki              z rezerwa (488):  157   do PAD_LEN (512):  169
typowy polski tekst (probka)         z rezerwa (488):  289   do PAD_LEN (512):  312
emoji (2 jednostki UTF-16, 4 B)      z rezerwa (488):  157   do PAD_LEN (512):  169
cudzyslow " (escape 2 B)             z rezerwa (488):  157   do PAD_LEN (512):  169
CJK 3 B                              z rezerwa (488):  104   do PAD_LEN (512):  112

== Pojemnosc (jednostki UTF-16 .length) dla E3 = E1 + odpowiedz re (8 hex + ts) ==
ASCII (a)                            z rezerwa (488):  408   do PAD_LEN (512):  432
polskie same diakrytyki              z rezerwa (488):  204   do PAD_LEN (512):  216
typowy polski tekst (probka)         z rezerwa (488):  377   do PAD_LEN (512):  399
emoji (2 jednostki UTF-16, 4 B)      z rezerwa (488):  205   do PAD_LEN (512):  217
cudzyslow " (escape 2 B)             z rezerwa (488):  204   do PAD_LEN (512):  216
CJK 3 B                              z rezerwa (488):  136   do PAD_LEN (512):  144

== Pojemnosc (jednostki UTF-16 .length) dla E4 = E2 + re ==
ASCII (a)                            z rezerwa (488):  281   do PAD_LEN (512):  305
polskie same diakrytyki              z rezerwa (488):  140   do PAD_LEN (512):  152
typowy polski tekst (probka)         z rezerwa (488):  261   do PAD_LEN (512):  280
emoji (2 jednostki UTF-16, 4 B)      z rezerwa (488):  141   do PAD_LEN (512):  153
cudzyslow " (escape 2 B)             z rezerwa (488):  140   do PAD_LEN (512):  152
CJK 3 B                              z rezerwa (488):   93   do PAD_LEN (512):  101

== 280 znakow w kopercie E1 (ts realny 13 cyfr i MAX_SAFE 16 cyfr) ==
ASCII (a)                            len 280 bajty: 327 / 324 MIESCI SIE
polskie same diakrytyki              len 280 bajty: 607 / 604 NIE MIESCI SIE
typowy polski tekst (probka)         len 280 bajty: 351 / 348 MIESCI SIE
emoji (2 jednostki UTF-16, 4 B)      len 280 bajty: 607 / 604 NIE MIESCI SIE
cudzyslow " (escape 2 B)             len 280 bajty: 607 / 604 NIE MIESCI SIE
CJK 3 B                              len 280 bajty: 887 / 884 NIE MIESCI SIE

cleanText usuwa nowa linie: "ab"

== Szyfrowanie prawdziwym sealMessage/buildPost ==
alg ed25519 plaintext JSON 484 B; szyfrogram 528 B; c w b64u 704 znakow (limit checkPostShape 720); cialo POST 1063 B (MAX_BODY 2048)
checkPostShape przyjmuje: true ; klucze widoczne dla relaya: m,alg,pk,epk,e,ts,n,c,sig
openMessage odtwarza t: chat len x: 407
rozmiar szyfrogramu pozycji: 528 B, czatu: 528 B: relay nie odroznia typow po rozmiarze

== Koszt odczytu since=0 (wiersz w GET ~ 882 B) ==
czlonkow  4, cap  240: ~0.85 MB
czlonkow  4, cap  960: ~3.39 MB
czlonkow  4, cap 1440: ~5.08 MB
czlonkow  4, cap 5760: ~20.32 MB
czlonkow  6, cap  240: ~1.27 MB
czlonkow  6, cap  960: ~5.08 MB
czlonkow  6, cap 1440: ~7.62 MB
czlonkow  6, cap 5760: ~30.48 MB
czlonkow 16, cap  240: ~3.39 MB
czlonkow 16, cap  960: ~13.55 MB
czlonkow 16, cap 1440: ~20.32 MB
czlonkow 16, cap 5760: ~81.29 MB

== Ile czasu trwa 240 wpisow nadawcy na relayu ==
samochod/rower, 1 wpis co 3 s (dolny prog sendLoc)            12 min (0.20 h)
rower ~5 m/s: 25 m co 5 s + timer 15 s (~16/min)              15 min (0.25 h)
pieszo ~1,4 m/s: 25 m co ~18 s + timer 15 s (~7/min)          33 min (0.55 h)
kadencja 15 s (domyslna, takze w bezruchu bez stillSave)      60 min (1.00 h)
kadencja 60 s                                                240 min (4.00 h)
kadencja 300 s / tryb bezruchu Androida                     1200 min (20.00 h)
TRIM_EVERY=16: trim co ~16 postow (losowo); po trimie zostaje dokladnie 240 najnowszych, wiec czat moze przezyc srednio do ~16 wpisow dluzej, ale nie wolno na tym polegac.
```

### measure2.mjs

```
E5 = E2 + k(11 b64u, 64 bity) + q narzut 213 B, na tekst 275 B
   typowy polski    max dlugosc z rezerwa: 256
   same diakrytyki  max dlugosc z rezerwa: 137
   ASCII            max dlugosc z rezerwa: 275
   CJK 3 B          max dlugosc z rezerwa: 91
   emoji 4 B        max dlugosc z rezerwa: 137
   cudzyslow        max dlugosc z rezerwa: 137
E6 = E1 + k + q (bez nazwy) narzut 86 B, na tekst 402 B
   typowy polski    max dlugosc z rezerwa: 371
   same diakrytyki  max dlugosc z rezerwa: 201
   ASCII            max dlugosc z rezerwa: 402
   CJK 3 B          max dlugosc z rezerwa: 134
   emoji 4 B        max dlugosc z rezerwa: 201
   cudzyslow        max dlugosc z rezerwa: 201
```

### Jak czytać wyniki

- „Pojemność" to `.length` tekstu w jednostkach UTF-16 (tak liczy `cleanText` i tak
  liczyłby licznik w polu wpisywania). Emoji spoza BMP to 2 jednostki i 4 bajty.
- Budżet „z rezerwą" to 488 B (`PAD_LEN - PAD_RESERVE`), ten sam, który test trzyma dla
  pozycji. „Do PAD_LEN" pokazuje, co dałoby zużycie rezerwy; ADR tego nie rekomenduje.
- Próbka „typowy polski tekst" jest sztuczna (wiadomość rodzica do dziecka, 7,3% liter
  z diakrytykami, jedno emoji). Prawdziwy rozkład warto sprawdzić na wiadomościach
  z testów rodzinnych (lokalnie, bez wysyłania gdziekolwiek).
- Horyzonty w ruchu są wyliczone z progów w kodzie (25 m: `app/js/main.js:6277-6281`,
  3 s: `:6404`, timer kadencji: `:5385`), nie zmierzone na telefonie. Prędkości przyjęte:
  pieszo 1,4 m/s, rower 5 m/s, samochód powyżej 8,3 m/s (25 m szybciej niż co 3 s).
- Rozmiar wiersza GET (882 B) to JSON jednego punktu z `e, ts, srv, n, c, sig`; koszt
  `since=0` nie wlicza nagłówków członków (pomijalne).

## 3. Plan pomiarów na żywo (do wykonania po F3, nie wykonane)

Zasada: zero telemetrii, nic nie wychodzi poza nasz relay i telefony. Relay „nigdy nie
loguje danych żądań" (`relay/src/index.js:1-5`); poniższe zapytania uruchamia ręcznie
właściciel na pliku bazy relaya (`relay/server.mjs`, SQLite) i zapisuje tylko wynik
zagregowany. Kanał i identyfikatory członków to pseudonimy, ale i tak nie wklejamy ich
do repozytorium.

M1. Horyzont relaya na członka (jak długo leży najstarszy wpis każdego nadawcy),
uruchamiane co godzinę, na przykład z crona na serwerze:

```sql
SELECT substr(member, 1, 4)                     AS czlonek,
       COUNT(*)                                 AS wierszy,
       ROUND((MAX(srv) - MIN(srv)) / 60000.0)   AS horyzont_min
FROM points_v3
GROUP BY channel, member;
```

M2. Przerwy w publikowaniu (jak długo telefon nie wysłał niczego; to górne
oszacowanie braku sieci, bo przy kadencji 300 s przerwa 5 min jest normalna):

```sql
SELECT substr(member, 1, 4) AS czlonek,
       ROUND(gap / 60000.0) AS przerwa_min
FROM (
  SELECT member, srv - LAG(srv) OVER (PARTITION BY channel, member ORDER BY srv) AS gap
  FROM points_v3
)
WHERE gap > 15 * 60000
ORDER BY gap DESC;
```

Uwaga: relay trzyma tylko 240 wpisów na członka i 24 h, więc M2 trzeba zbierać
regularnie (co godzinę), inaczej przerwy wypadną razem z wierszami.

M3 do M5 wymagają liczników po stronie klienta, dodanych w F3 do istniejącego raportu
udostępniania (`shareStats` w `app/js/main.js`), tylko w pamięci lub w archiwum
szyfrowanym przez `atRestForm`:

- M3: luki w `q` na nadawcę oraz liczba wpisów odrzuconych z powodu braku klucza
  (`app/js/net.js:236-237`; przed odszyfrowaniem nie wiadomo, czy to czat, więc to
  wskaźnik pośredni) i liczba luk przy obecnym kluczu (wiadomość wyparta z relaya);
- M4: rozkład `czas_odbioru - ts` dla przyjętych wiadomości czatu;
- M5: liczba wysłanych i odebranych wiadomości na dzień.

Reguła decyzji jest w ADR, część 7.
