# Relay na Cloudflare Workers: instrukcja dla właściciela (F1-2)

Stan na 2026-10-14, fork `Jack4B/starling` 0.21.0. Właściciel wybrał Cloudflare Workers
(opcja B z D1). Instrukcję napisano na podstawie `relay/deploy.sh`, `relay/wrangler.toml` i
`docs/SELF-HOSTING.md` w forku; samego wdrożenia nikt jeszcze nie wykonał. Adresu relaya nie
wpisujemy do żadnego repozytorium (`AGENTS.md`), dlatego niżej jest tylko wzór
`https://starling.TWOJA-SUBDOMENA.workers.dev`.

## 0. Zanim zaczniesz: plan Cloudflare

- Konto na cloudflare.com wystarczy darmowe, żeby zacząć i sprawdzić, że wszystko działa.
- Na co dzień zalecany jest **Workers Paid** (według cennika Cloudflare około 5 USD
  miesięcznie, sprawdź aktualną cenę). Powód w `docs/OBCIAZENIE-RELAYA.md` (F1-1): krąg 7 osób
  robi od około 69 000 do kilkuset tysięcy zapisów D1 na dobę, a darmowy limit to 100 000. Po
  jego przekroczeniu zapisy są odrzucane do północy UTC i rodzina przestaje się widzieć.
- Cloudflare widzi adresy IP telefonów i czas ich połączeń, ale nie treść ani pozycje
  (wszystko jest zaszyfrowane end to end).

## 1. Przygotuj komputer

Potrzebne: Git, Node 22 lub nowszy, Python 3 (używa go skrypt wdrożenia). Linux, macOS albo
Windows z WSL. Termux na Androidzie może zadziałać, ale nie był sprawdzany.

```
git clone https://github.com/Jack4B/starling
cd starling
npm ci
bash tools/sync-vendor.sh
```

Ostatnia komenda ma wypisać `vendor synced: leaflet 1.9.4`. Bez niej skrypt wdrożenia odmówi
pracy.

## 2. Dostosuj `relay/wrangler.toml` (tylko lokalnie, nie commituj)

Fork jest publiczny, więc tych zmian **nie wypychaj** na GitHub. Zmień w pliku:

1. **Usuń cały blok `[[routes]]`** (trzy linie z `pattern = "starlingmap.app"`). To domena
   autora upstreamu; Cloudflare odmówi wdrożenia na cudzą domenę. Bez tego bloku relay dostanie
   adres `starling.TWOJA-SUBDOMENA.workers.dev` z gotowym HTTPS. Jeśli masz własną domenę w
   Cloudflare, możesz zamiast usuwać wpisać ją w `pattern`.
2. Opcjonalnie zmień `name = "starling"` na własną nazwę (wtedy zmieni się też początek adresu).
   Skrypt sprawdzający na końcu zakłada nazwę `starling`, więc przy innej nazwie sprawdź
   adres ręcznie (krok 4).
3. Na darmowym planie: jeśli wdrożenie zgłosi błąd dotyczący `cpu_ms`, usuń blok `[limits]`.
   To wniosek z komentarza w pliku (limit jest pomyślany dla planu płatnego), nie sprawdzony
   fakt. Na planie płatnym zostaw go: chroni przed rachunkiem przy błędzie lub ataku.
4. Zostaw `[observability] enabled = false` (brak logów żądań) i wartości `RATE_POST_MIN = 256`,
   `RATE_GET_MIN = 240`; według F1-1 wystarczą dla 7 osób.

Linii `database_id` nie ruszaj: skrypt sam wpisze tam identyfikator Twojej bazy.

## 3. Zaloguj się i wdroż

```
npx wrangler login          # otworzy przeglądarkę, zaloguj się do Cloudflare
bash relay/deploy.sh
```

Skrypt (`relay/deploy.sh`) po kolei:

1. tworzy bazę D1 o nazwie `starling` (albo używa istniejącej) i wpisuje jej identyfikator do
   `wrangler.toml`,
2. zakłada tabele z `relay/schema.sql` (bezpiecznie przy każdym ponownym uruchomieniu),
3. wdraża Workera razem ze statyczną wersją aplikacji. Przy okazji pobiera APK autora upstreamu
   i wystawia je pod `/starling.apk`. Rodzinie to niepotrzebne i nieszkodliwe; telefony używają
   tylko ścieżek `/api/`.
4. sprawdza `GET /api/v2/health`.

Zamiast `wrangler login` możesz ustawić `CLOUDFLARE_API_TOKEN` (token z uprawnieniami Workers
Scripts:Edit, D1:Edit, Account Settings:Read). Tokena nie zapisuj w żadnym pliku repozytorium.

## 4. Sprawdź, że działa

W przeglądarce otwórz `https://starling.TWOJA-SUBDOMENA.workers.dev/api/v2/health`. Ma się
pokazać `{"ok":true}`. Nowa subdomena potrzebuje czasem kilku minut na certyfikat.

## 5. Podłącz telefony

- Na telefonie, który **tworzy krąg**, zanim go utworzysz: na pierwszym ekranie wybierz
  „Use your own relay" (polskie teksty przyjdą z F2-6) i wpisz adres relaya, na przykład
  `https://starling.TWOJA-SUBDOMENA.workers.dev`. Na telefonie, który ma już krąg, ten sam adres
  wpisuje się w Ustawieniach i uruchamia aplikację ponownie.
- Pozostałe osoby **dołączają z zaproszenia**. Zaproszenie z telefonu na własnym relayu niesie
  jego adres, a telefon bez kręgu sam się na niego przełącza (`docs/SELF-HOSTING.md` w forku,
  sekcja „Pointing the app at it"). Nikt nie musi niczego wpisywać.
- Wszyscy w kręgu muszą używać tego samego relaya.

## 6. Utrzymanie

- Raz na jakiś czas zajrzyj w panelu Cloudflare do użycia D1 (Rows written). Gdy dzienne zapisy
  zbliżają się do 100 000, przejdź na plan płatny.
- Aktualizacja relaya: `git pull` w forku, ponownie krok 2 (jeśli `wrangler.toml` się zmienił)
  i `bash relay/deploy.sh`. Dane w D1 i tak żyją tylko 24 godziny.
- Usunięcie wszystkiego: w panelu usuń Workera `starling` i bazę D1 `starling`.

## Czego ta instrukcja nie sprawdziła

- Nie wdrażano niczego na Cloudflare; liczby i limity planów pochodzą z cennika i z F1-1.
- Nie sprawdzono zachowania `[limits]` na darmowym planie ani działania w Termuksie.
- Test na dwóch telefonach to osobne zadanie F1-4.
