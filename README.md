# Költségkövető

Egyszerű, mobilbarát kiadáskövető webalkalmazás, Supabase adatbázissal.

## Funkciók
- Kiadás rögzítése: összeg, dátum, kategória, megjegyzés
- Szerkesztés és törlés
- Havi nézet lapozással, havi összesítés
- Kategóriánkénti bontás grafikonnal
- Havi költségkeret (mennyi maradt / mennyivel lépted túl)
- Szűrés kategóriára
- Export CSV-be (Excelben megnyitható), mentés és visszaállítás JSON-ból
- **Felhős adatbázis (Supabase)** bejelentkezéssel: telefonon és gépen ugyanazok az adatok
- Sötét mód, mobilbarát, telefonra „telepíthető” (PWA)

## Két üzemmód
| Mód | Mikor | Hol vannak az adatok |
|---|---|---|
| Helyi | `config.js` üres | Csak az adott böngészőben (localStorage) |
| Adatbázis | `config.js` ki van töltve | Supabase Postgres, bejelentkezés után minden eszközön |

Ha korábban helyi módban rögzítettél tételeket, belépés után az app felajánlja, hogy feltölti őket az adatbázisba.

## Supabase beállítása (kb. 5 perc)
1. Regisztrálj a <https://supabase.com> oldalon, és hozz létre egy új projektet (az ingyenes csomag elég).
2. **Tábla létrehozása:** a projektben *SQL Editor → New query*, másold be a
   [`supabase/schema.sql`](supabase/schema.sql) tartalmát, majd *Run*.
3. **Kulcsok:** *Project Settings → API* oldalon másold ki a *Project URL*-t és az
   *anon public* kulcsot a [`config.js`](config.js) fájlba.
   (Az anon kulcs nyilvános, lehet a kódban; az adatokat a sorszintű jogosultságok védik:
   mindenki csak a saját kiadásait látja.)
4. **Átirányítási cím:** *Authentication → URL Configuration* alatt a *Site URL* legyen az app címe
   (pl. `https://<felhasznalonev>.github.io/koltsegkoveto/`), különben a megerősítő és
   jelszó-visszaállító e-mailek linkje nem az appra mutat.
5. Nyisd meg az appot, *Regisztráció*, erősítsd meg az e-mailt, majd lépj be.

> Ha csak magad használod: regisztráció után az *Authentication → Sign In / Providers* alatt
> kikapcsolhatod az új regisztrációkat (*Allow new users to sign up*), így más nem tud fiókot nyitni.

## Futtatás
```bash
python3 -m http.server 8000
# majd: http://localhost:8000
```
(Fájlként, `file://`-ból megnyitva a modulok miatt nem működik, kell egy szerver.)

Telefonon a legkényelmesebb GitHub Pages-en közzétenni (*Settings → Pages*),
majd a böngészőben „Hozzáadás a kezdőképernyőhöz”.

## Fájlok
- `index.html` – felület
- `app.js` – app logika, bejelentkezés
- `store.js` – adattárolás (helyi és Supabase)
- `config.js` – Supabase kulcsok
- `supabase/schema.sql` – adatbázis séma és jogosultságok
- `sw.js`, `manifest.json`, `icon.svg` – telepíthető/offline működés
