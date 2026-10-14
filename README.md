# Starling Rodzina

Prywatna, rodzinna alternatywa dla Life360. Baza: fork `Jack4B/starling`
(upstream `munzzyy/starling`, licencja GPL-3.0-or-later).

Cel projektu:

- lokalizacja rodziny na żywo, SOS, check-in, miejsca (Dom, Szkoła), poziom baterii,
- szyfrowany end-to-end komunikator dla członków kręgu (krótkie wiadomości, powiadomienia),
- własny serwer pośredniczący (relay), bez kont, bez analityki, bez usług firm trzecich,
- przebudowany interfejs w motywie jasnym i ciemnym (makiety w `docs/DESIGN.md`),
- Android jako platforma główna; iOS po osobnej decyzji (`docs/DECYZJE.md`, D3).

To repozytorium jest centrum dowodzenia: plan, decyzje, zasady pracy modeli
(Claude, Gemini, Grok) i dziennik przekazań. Gdzie leży sam kod aplikacji, rozstrzyga
decyzja D4.

## Od czego zacząć

| Kto | Co przeczytać |
|---|---|
| Każdy model | `AGENTS.md`, potem `docs/PLAN.md`, `docs/ARCHITEKTURA.md`, `docs/DECYZJE.md` |
| Claude | dodatkowo `CLAUDE.md` |
| Gemini | dodatkowo `GEMINI.md` |
| Grok | dodatkowo `GROK.md` |
| Właściciel | `docs/PODLACZENIE-AGENTOW.md` (lista rzeczy do zrobienia ręcznie) |

## Układ

```
README.md                      ten plik
AGENTS.md                      wspólne zasady dla wszystkich modeli
CLAUDE.md  GEMINI.md  GROK.md  role i wskazówki per model
docs/PLAN.md                   fazy, zadania, kryteria ukończenia, podział pracy
docs/DECYZJE.md                otwarte decyzje z opcjami i rekomendacją
docs/ARCHITEKTURA.md           ustalenia z analizy kodu forka (fakty, nie plany)
docs/DESIGN.md                 tokeny, typografia, zasady interfejsu, mapa ekranów
docs/HANDOFF.md                dziennik przekazań między modelami
docs/PODLACZENIE-AGENTOW.md    jak podpiąć Gemini i Groka (dla właściciela)
docs/KONTEKST-ROZMOWY.md       streszczenie rozmowy początkowej, start nowej sesji
docs/makiety/zrodla/           źródła makiet (.dc.html, canvas.json)
.github/pull_request_template.md
```

## Status

Stan na 2026-10-14: faza 0 (przygotowanie). Wykonano analizę kodu i makiety interfejsu.
Kodu jeszcze nie zmieniano. Szczegóły i następne kroki: `docs/PLAN.md` i `docs/HANDOFF.md`.
