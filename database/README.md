# Finalna baza za odbranu

Fajlovi u folderu `collections` predstavljaju povezane podatke za demonstraciju
aplikacije. Import brise postojece kolekcije istog imena i zatim uvozi ove
podatke.

## Import

Pokrenuti iz korena projekta:

```bash
./database/import-database.sh
```

Podrazumevani naziv baze je `sportsphere`.

## Demo nalozi

Svi nalozi koriste lozinku:

```text
Test123!
```

Aktivni nalozi:

- administrator: `admin`
- sportisti: `marko`, `ana`
- zaposleni: `ivan`, `jelena`, `petar`, `sara`

Zahtevi na cekanju:

- sportista: `milos`
- zaposleni: `nikola`
- objekat zaposlenog `nikola`: Sportski centar Cair

## Predlozeni podaci za demonstraciju

- `marko` ima odigrane i buduce rezervacije, istoriju treninga, ocene,
  porudzbine i oglas sa zahtevom na cekanju.
- `ana` ima buducu rezervaciju i trening, razlicite statuse porudzbina i prijavu
  za turnir na cekanju.
- `ivan` upravlja objektom Sport Centar Beograd. Moze da obradi porudzbine,
  prijavu za turnir i da generise izvestaje. Takodje upravlja objektom Sport
  Centar Zemun.
- `petar` upravlja objektima Sportski centar Novi Sad i Sportski centar Liman.
- `sara` upravlja objektima Sportski centar Jezero i Jezero Arena.
- za izvestaj objekta Sport Centar Beograd koristiti mesece `2026-08` i
  `2026-09`.
- otvoreni turnir Jesenji teniski kup ima prihvacenu prijavu sportiste `marko`
  i prijavu sportiste `ana` na cekanju.
- aktivni oglas sportiste `marko` ima zahtev sportiste `ana` na cekanju.

## Slike koje treba rucno dodati

Slike objekata smestiti u `backend/uploads/facilities`:

- `beograd-1.jpg`
- `beograd-2.jpg`
- `novi-sad-1.jpg`
- `jezero-1.jpg`
- `zemun-1.jpg`
- `zemun-2.jpg`
- `liman-1.jpg`
- `arena-1.jpg`

Slike proizvoda smestiti u `backend/uploads/products`:

- `teniske-loptice.jpg`
- `fudbalska-lopta.jpg`
- `kosarkaska-lopta.jpg`
- `elasticna-traka.jpg`
- `teniski-reket.jpg`
- `fudbalske-stucne.jpg`
- `odbojkaska-lopta.jpg`
- `prostirka-za-vezbanje.jpg`
- `badminton-reket.jpg`
- `set-malih-tegova.jpg`
- `sportska-torba.jpg`
- `sportska-flasica.jpg`

Nazivi moraju biti potpuno isti jer su te putanje vec upisane u JSON fajlove.
Podrazumevana profilna slika vec postoji u `backend/uploads/profiles`.

## Napomena o datumima

Buduce rezervacije, trening, oglas i turnir nalaze se u oktobru 2026. Ako se
odbrana odrzava posle tih datuma, njihove datume treba pomeriti unapred pre
ponovnog importa.
