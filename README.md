# Blisko (kidsLocation)

Prywatna, rodzinna alternatywa dla Life360. Aplikacja nazywa się **Blisko**. Powstała na bazie
Starlinga (`munzzyy/starling`, licencja GPL-3.0-or-later), a jej kod leży w tym repozytorium,
w katalogu `starling/` (decyzja D4, wariant B).

Co już działa:

- lokalizacja rodziny na żywo, SOS (przytrzymanie), check-in, miejsca (Dom, Szkoła), poziom baterii,
- czat szyfrowany end-to-end, wspólny dla całego kręgu (ADR-001),
- własny serwer pośredniczący (relay) na CT8, bez kont, bez analityki,
- nowy interfejs po polsku, w motywie jasnym i ciemnym, według makiet z `docs/DESIGN.md`,
- podpisane APK na Androida, publikowane jako wydania GitHuba (do instalacji przez Obtainium).

To repozytorium trzyma też plan, decyzje, zasady pracy modeli i dziennik przekazań.

## Od czego zacząć

| Kto | Co przeczytać |
|---|---|
| Każdy model | `AGENTS.md`, potem `docs/PLAN.md`, `docs/ARCHITEKTURA.md`, `docs/DECYZJE.md` |
| Claude | dodatkowo `CLAUDE.md` |
| Gemini | dodatkowo `GEMINI.md` |
| Grok | dodatkowo `GROK.md` (na razie nie bierze udziału w pracy) |
| Właściciel | `docs/PODPIS-APK.md` (instalacja i aktualizacje APK), `docs/WDROZENIE-CT8.md` (serwer), `docs/PODLACZENIE-AGENTOW.md` |

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
docs/PODPIS-APK.md             podpis APK, wydania, Obtainium
docs/WDROZENIE-CT8.md          uruchomienie relaya na CT8
docs/adr/                      zapisy decyzji architektonicznych (ADR-001: czat)
docs/makiety/                  makiety i ich źródła
starling/                      kod aplikacji i relaya (Android, iOS, wspólny HTML/CSS/JS)
.github/workflows/             CI: testy, budowa i podpis APK, wydania
.github/pull_request_template.md
```

## Status

Stan na 2026-10-14: pierwsze pełne wydanie gotowe. Najnowsze wydanie to `apk-0.21.0-16`.

- Zrobione: faza 0 (poza iOS), własny relay i APK (F1-7, F1-8), nowy wygląd i polski
  (F2-1 do F2-8), czat (F3). Testy: 1231, z czego 1197 przechodzi, 34 pominięte, 0 błędów.
  Do tego testy e2e i zielone CI.
- Przed nami: testy na prawdziwych telefonach (F1-4, F5-2), iOS dla syna (D3),
  wspólne miejsca w kręgu (faza 6, decyzja D7).
- Aplikacja na telefon: wydania w zakładce Releases. Repozytorium jest prywatne, więc
  Obtainium potrzebuje tokenu tylko do odczytu (`docs/PODPIS-APK.md`).

Szczegóły i następne kroki: `docs/PLAN.md` i `docs/HANDOFF.md`.
