# Költségkövető

Egyszerű, telepítés nélkül használható kiadáskövető webalkalmazás.

## Funkciók
- Kiadás rögzítése: összeg, dátum, kategória, megjegyzés
- Szerkesztés és törlés
- Havi nézet lapozással, havi összesítés
- Kategóriánkénti bontás grafikonnal
- Havi költségkeret (mennyi maradt / mennyivel lépted túl)
- Szűrés kategóriára
- Export CSV-be (Excelben megnyitható), mentés és visszaállítás JSON-ból
- Sötét mód, mobilbarát, telefonra „telepíthető” (PWA), offline is működik

## Használat
Nyisd meg az `index.html` fájlt böngészőben, vagy indíts egy helyi szervert:

```bash
python3 -m http.server 8000
# majd: http://localhost:8000
```

Telefonon a legkényelmesebb GitHub Pages-en közzétenni (Settings → Pages → Branch: `main`),
majd a böngészőben „Hozzáadás a kezdőképernyőhöz”.

Az adatok a böngésző `localStorage`-ában tárolódnak, csak az adott eszközön.
