const labels: { [key: string]: string } = {
  pending: 'na cekanju',
  active: 'aktivno',
  rejected: 'odbijeno',
  athlete: 'sportista',
  employee: 'zaposleni',
  admin: 'administrator',
  outdoor: 'otvoreni teren',
  indoor: 'zatvoreni teren',
  hall: 'hala',
  ordered: 'poruceno',
  accepted: 'prihvaceno',
  collected: 'preuzeto',
  cancelled: 'otkazano',
  scheduled: 'zakazano',
  attended: 'prisustvovao',
  no_show: 'nije se pojavio',
  open: 'otvoren',
  closed: 'zatvoren',
  completed: 'zavrsen',
  reservation: 'rezervacija',
  training: 'trening',
  percentage: 'procenat',
  fixed: 'fiksni iznos',
  like: 'svidja mi se',
  dislike: 'ne svidja mi se',
};

export function getSerbianLabel(value: string) {
  return labels[value] || value;
}
