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

### Automatyczna recenzja Groka przez API xAI

- Workflow `.github/workflows/code-review.yml` uruchamia się przy każdym PR (otwarcie,
  nowy commit, wznowienie, przejście ze szkicu) i dodaje jeden komentarz „Grok (recenzja)",
  aktualizowany przy kolejnych commitach.
- Klucz: sekret repozytorium `XAI_API_KEY` (ustawiony przez właściciela). Model domyślnie
  `grok-3`; inny ustawisz zmienną repozytorium `XAI_MODEL` (Settings, Secrets and variables,
  Actions, Variables).
- Akcja `tarmojussila/xai-code-review` jest przypięta do pełnego SHA commitu (wersja 0.1.1),
  a nie do tagu, żeby nikt nie podmienił jej kodu pod tym samym numerem. Kod przeczytano:
  pobiera listę zmienionych plików PR, wysyła ich łatki do `api.x.ai` i dodaje komentarz.
  Aktualizacja wersji to świadoma zmiana SHA w osobnym PR.
- **Wyjątek od zasady prywatności z `AGENTS.md`:** diff każdego PR trafia do xAI. W
  repozytorium nie ma kodu aplikacji ani danych rodziny, a `AGENTS.md` i tak zabrania
  wpisywania sekretów, adresu relaya i danych osobowych. Pliki PNG, SVG i wygenerowane
  makiety HTML są pomijane, diff jest ucięty do 120 000 znaków. Wyjątek obowiązuje po
  scaleniu tego PR przez właściciela.
- PR z forków nie dostają sekretów, więc workflow je pomija. Recenzja Groka nie zastępuje
  recenzji z tabeli w `docs/PLAN.md`, jeśli recenzentem ma być Gemini.

## 5. Zasady bezpieczeństwa współpracy

- Każdy model pracuje na własnej gałęzi i otwiera PR. Scalasz Ty.
- Żaden model nie dostaje dostępu do Twojego konta GitHub, tylko do tego repozytorium.
- Prywatny adres relaya i klucze nie trafiają do repozytorium. Jeśli model o nie prosi,
  to znak, że coś poszło źle.
- Przed pierwszym scaleniem kodu przeczytaj PR sam albo poproś o drugą recenzję innego
  modelu; kodu dotykającego kryptografii nie scalaj bez recenzji.
