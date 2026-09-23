export function validateImage(file: File, imageName = 'Slika') {
  if (!['image/png', 'image/jpeg'].includes(file.type)) {
    return `${imageName} mora biti PNG ili JPG fajl.`;
  }

  if (file.size > 5 * 1024 * 1024) {
    return `${imageName} moze imati najvise 5 MB.`;
  }

  return '';
}
