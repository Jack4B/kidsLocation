# Podłączenie modeli do repozytorium (dla właściciela)

Lista rzeczy do zrobienia ręcznie. Informacje o produktach innych firm mogą być
nieaktualne; przy każdym punkcie oznaczonym „sprawdź" zweryfikuj w dokumentacji
dostawcy, zanim cokolwiek zapłacisz lub zainstalujesz.

## 1. Repozytorium

- Repozytorium `Jack4B/kidsLocation` istnieje i ma wgrany początkowy plan. Upewnij się, że jest **prywatne**.
- Włącz ochronę gałęzi `main`: wymagany PR, brak bezpośrednich pushy i force-pushy.
  Jeśli kod trafi do tego repozytorium (D4), dodaj plik `CODEOWNERS`, który wskazuje Ciebie
  jako właściciela `app/js/crypto.js`, `app/js/wire.js` i `docs/PROTOCOL.md`.

## 2. Claude

- Dołącz repozytorium do sesji z prawem zapisu (zgoda w aplikacji), żeby Claude mógł
  pushować gałęzie i otwierać PR. Bez tego Claude pracuje tylko na odczycie.
- Claude czyta `CLAUDE.md` i `AGENTS.md`.

## 3. Gemini

- Sprawdź, czy Twój abonament obejmuje recenzje PR na GitHubie. Dostępne są dwie drogi,
  obie do zweryfikowania: aplikacja GitHub od Google do automatycznych recenzji oraz
  narzędzie wiersza poleceń z akcją GitHub Actions.
- Jeśli instalujesz aplikację GitHub, daj jej dostęp tylko do tego jednego repozytorium.
- Zasady dla Gemini: `GEMINI.md`. Jeśli narzędzie pozwala wskazać plik z instrukcjami
  dla recenzenta, wskaż `AGENTS.md`.
- Nigdy nie wklejaj tokenów do plików w repozytorium. Sekrety trzymaj w ustawieniach
  repozytorium (Secrets), jeśli akcja ich potrzebuje.

## 4. Grok

- Nie znam oficjalnej integracji Groka z GitHubem w abonamencie, sprawdź. Jeśli jej nie ma,
  pracujcie ręcznie: kopiujesz do rozmowy opis zadania, diff i odpowiednie fragmenty
  `docs/`, a odpowiedź wklejasz jako komentarz do PR.
- Przydatna komenda w Termuksie lub terminalu: `git diff main...zadanie/F2-3-opis > pr.diff`
  i wklejenie zawartości pliku.
- Dostęp do API xAI jest zwykle rozliczany osobno od abonamentu aplikacji; nie zakładaj,
  że jest wliczony.
- Zasady dla Groka: `GROK.md`.

## 5. Zasady bezpieczeństwa współpracy

- Każdy model pracuje na własnej gałęzi i otwiera PR. Scalasz Ty.
- Żaden model nie dostaje dostępu do Twojego konta GitHub, tylko do tego repozytorium.
- Prywatny adres relaya i klucze nie trafiają do repozytorium. Jeśli model o nie prosi,
  to znak, że coś poszło źle.
- Przed pierwszym scaleniem kodu przeczytaj PR sam albo poproś o drugą recenzję innego
  modelu; kodu dotykającego kryptografii nie scalaj bez recenzji.
