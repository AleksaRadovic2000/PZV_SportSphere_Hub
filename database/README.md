# SportSphere Hub database import

Ovaj folder sadrzi pocetne podatke koji mogu da se uvezu nezavisno od Angular i
Express aplikacije. JSON fajlovi koriste MongoDB Extended JSON format za
`ObjectId` i `Date` vrednosti.

## Preduslovi

- MongoDB server je pokrenut;
- `mongoimport` je instaliran i dostupan u terminalu;
- koristi se razvojna baza `sportsphere`.

## Pokretanje

Iz korena repozitorijuma pokrenuti:

```bash
./database/import-database.sh
```

Skripta koristi opciju `--drop`. Svaka navedena kolekcija se brise pre ponovnog
uvoza, pa ovu skriptu ne treba pokretati nad bazom koja sadrzi podatke koje treba
sacuvati.

## Redosled uvoza

1. `sports`
2. `users`
3. `facilities`
4. `trainers`
5. `products`
6. `reservations`
7. `trainings`
8. `teammateAds`
9. `tournaments`
10. `orders`
11. `facilityReviews`
12. `passwordResetTokens`

ID vrednosti su unapred zadate i reference izmedju kolekcija moraju ostati
uskladjene. Ne menjati pojedinacne ID vrednosti bez provere svih povezanih
fajlova.

## Provera uvoza

Pokrenuti MongoDB shell:

```bash
mongosh sportsphere
```

Zatim proveriti kolekcije i osnovne brojeve dokumenata:

```javascript
show collections
db.users.countDocuments()
db.sports.countDocuments()
db.facilities.countDocuments()
```

Ocekivani osnovni brojevi su:

- `users`: 9
- `sports`: 6
- `facilities`: 4

## Razvojne lozinke

Korisnici trenutno imaju otvoreno polje `password` sa test lozinkom `Test123!`.
U okviru tiketa AUTH-03 polje ce biti zamenjeno poljem `passwordHash`, a pocetni
podaci ponovo pripremljeni sa bcrypt hash vrednostima.
