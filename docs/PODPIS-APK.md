# Podpis APK i aktualizacje

Telefon zainstaluje nowe APK jako aktualizację tylko wtedy, gdy zgadzają się trzy rzeczy:
ta sama nazwa pakietu (`app.kidslocation`), ten sam klucz podpisu i wyższy numer wersji.
Nazwę i numer załatwia kod (`starling/android/app/build.gradle.kts`), klucz trzeba
utworzyć raz.

## Jednorazowo: klucz podpisu (właściciel)

1. GitHub, repozytorium kidsLocation, zakładka **Actions**.
2. Po lewej **Utwórz klucz podpisu APK (jednorazowo)**, po prawej **Run workflow**,
   jeszcze raz **Run workflow**.
3. Po minucie otwórz zakończony przebieg, na dole w **Artifacts** pobierz `klucz-podpisu`
   (plik zip). W środku są dwa pliki tekstowe i plik `rodzina.jks`.
4. **Settings**, **Secrets and variables**, **Actions**, **New repository secret**:
   - nazwa `ANDROID_KEYSTORE_B64`, wartość: cała zawartość `ANDROID_KEYSTORE_B64.txt`,
   - nazwa `ANDROID_KEYSTORE_PASSWORD`, wartość: zawartość `ANDROID_KEYSTORE_PASSWORD.txt`.
5. Zip zachowaj w bezpiecznym miejscu (na przykład menedżer haseł lub pendrive). Bez niego
   po utracie sekretów telefony nie dostaną aktualizacji bez odinstalowania aplikacji.
6. Wróć do przebiegu i usuń artefakt (ikona kosza). Wygasa sam po dniu.

Od tej chwili każde scalenie do `main`, które zmienia `starling/`, tworzy wydanie
`apk-<wersja>-<numer>` z podpisanym plikiem.

## Na telefonach: Obtainium

Repozytorium jest prywatne, więc Obtainium potrzebuje tokenu tylko do odczytu.

1. GitHub, **Settings** konta, **Developer settings**, **Fine-grained tokens**, nowy token
   tylko dla repozytorium kidsLocation z uprawnieniem **Contents: Read-only**.
2. Obtainium: **Ustawienia**, sekcja GitHub, wklej token.
3. **Dodaj aplikację**, adres `https://github.com/Jack4B/kidsLocation`, zatwierdź.
4. Obtainium sam pokaże nowe wydanie i zaproponuje aktualizację.

Token daje dostęp do odczytu kodu, więc trzymaj go tylko na telefonach, którym ufasz.
Dla dzieci prościej: aktualizację instaluje rodzic, pobierając APK z wydania.
