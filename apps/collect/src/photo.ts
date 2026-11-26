// Préparation d'une photo sur le téléphone, avant de la garder en file d'envoi :
// - réduite (1600 px au plus grand côté) et compressée en JPEG (~200 Ko visés) pour la 2G/3G ;
// - ré-encodée via un canvas, ce qui retire toutes les métadonnées EXIF, dont la position GPS
//   et le modèle du téléphone : une photo saisie ne trahit pas l'observateur.

const COTE_MAX = 1600;
const TAILLE_VISEE = 200 * 1024;
const QUALITES = [0.8, 0.7, 0.6, 0.5, 0.4];

async function charger(fichier: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(fichier, { imageOrientation: "from-image" });
    } catch {
      /* repli ci-dessous */
    }
  }
  const url = URL.createObjectURL(fichier);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

const versBlob = (canvas: HTMLCanvasElement, qualite: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", qualite));

export async function preparerPhoto(fichier: Blob): Promise<Blob> {
  const image = await charger(fichier);
  const largeur = "naturalWidth" in image ? image.naturalWidth : image.width;
  const hauteur = "naturalHeight" in image ? image.naturalHeight : image.height;
  const echelle = Math.min(1, COTE_MAX / Math.max(largeur, hauteur));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(largeur * echelle);
  canvas.height = Math.round(hauteur * echelle);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas indisponible");
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  if ("close" in image) image.close();
  let dernier: Blob | null = null;
  for (const q of QUALITES) {
    dernier = await versBlob(canvas, q);
    if (dernier && dernier.size <= TAILLE_VISEE) break;
  }
  if (!dernier) throw new Error("compression impossible");
  return dernier;
}
