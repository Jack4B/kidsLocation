# Dziennik przekazań

Dopisuj nowe wpisy na górze. Każdy wpis: data, model, zadanie, co zrobiono, czego nie
zrobiono, co sprawdzono (i jak), co sprawdzono tylko przez czytanie, następny krok,
pytania do właściciela. Drugi model zaczyna od zera, więc pisz konkretnie.

---

## 2026-10-14, Claude, F0-3 (automatyczna recenzja Groka)

Zrobiono: workflow `.github/workflows/code-review.yml` z akcją `tarmojussila/xai-code-review`
0.1.1 przypiętą do SHA `d86fe10`, minimalne uprawnienia (`contents: read`,
`pull-requests: write`), pomijanie PR z forków, prompt recenzenta po polsku według listy
kontrolnej z `AGENTS.md`, opis i wyjątek prywatności w `docs/PODLACZENIE-AGENTOW.md`.

Sprawdzono: kod akcji (`src/index.js`, 211 linii) i to, że `dist/index.js` odpowiada źródłu;
akcja łączy się tylko z API GitHuba i `api.x.ai`. Sam workflow uruchomi się dopiero na tym PR.

Nie zrobiono: recenzji przez Gemini (osobna konfiguracja właściciela).

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
