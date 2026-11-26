// Gestion des observateurs en ligne de commande (repli quand le webhook NocoDB n'est pas configuré).
// Lit la même configuration que le serveur (.env à la racine du dépôt).
//
//   pnpm observateurs ajouter [--bureau "Bureau 12"] [--expire 2027-01-26] [--telephone +221770000000]
//   pnpm observateurs lien OBS-XXXXXX          nouveau lien d'activation (48 h, usage unique)
//   pnpm observateurs desactiver OBS-XXXXXX    refuse tous les téléphones de cet observateur
//   pnpm observateurs importer equipe.csv      colonnes : bureau_vote, expire_le, telephone (en-tête obligatoire)
//
// Les liens s'affichent ici une seule fois : transmettez-les par un canal sûr (ou imprimez le QR depuis NocoDB).

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { configurerStockage } from '../src/stockage';

const racine = resolve(__dirname, '../../..');
if (existsSync(join(racine, '.env'))) process.loadEnvFile(join(racine, '.env'));

const [commande, ...args] = process.argv.slice(2).filter((a) => a !== '--');
const option = (nom: string) => {
  const i = args.indexOf(`--${nom}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const dateFin = (d?: string) => (d ? new Date(`${d}T23:59:59Z`).toISOString() : undefined);

async function principal() {
  const { identite, registre } = await configurerStockage(process.env);
  if (identite.mode !== 'appareils' || !registre) throw new Error('IDENTIFICATION=appareils requis (avec un registre nocodb ou postgres)');

  switch (commande) {
    case 'ajouter': {
      const r = await identite.creerObservateur({ bureau_vote: option('bureau'), expire_le: dateFin(option('expire')), telephone: option('telephone') });
      console.log(`${r.observateur.code}\t${r.observateur.bureau_vote ?? ''}\n${r.lien}\n(valable jusqu'au ${r.expire_le})`);
      break;
    }
    case 'lien': {
      const o = await registre.observateurParCode(String(args[0] || '').toUpperCase());
      if (!o) throw new Error(`Observateur inconnu : ${args[0]}`);
      const r = await identite.creerLien(o);
      console.log(`${o.code}\n${r.lien}\n(valable jusqu'au ${r.expire_le})`);
      break;
    }
    case 'desactiver': {
      if (!(await identite.desactiver(String(args[0] || '').toUpperCase()))) throw new Error(`Observateur inconnu : ${args[0]}`);
      console.log(`${args[0]} désactivé : ses téléphones sont refusés.`);
      break;
    }
    case 'importer': {
      const lignes = readFileSync(String(args[0]), 'utf8').split(/\r?\n/).filter((l) => l.trim());
      const entete = lignes.shift()!.split(',').map((x) => x.trim());
      console.log('code,bureau_vote,lien');
      for (const l of lignes) {
        const v = Object.fromEntries(l.split(',').map((x, i) => [entete[i], x.trim()]));
        const r = await identite.creerObservateur({ bureau_vote: v.bureau_vote, expire_le: dateFin(v.expire_le), telephone: v.telephone || undefined });
        console.log(`${r.observateur.code},${r.observateur.bureau_vote ?? ''},${r.lien}`);
      }
      break;
    }
    default:
      console.log('Commandes : ajouter | lien <CODE> | desactiver <CODE> | importer <fichier.csv>');
      process.exitCode = 1;
  }
}

principal().then(() => process.exit()).catch((e) => {
  console.error(`Erreur : ${(e as Error).message}`);
  process.exit(1);
});
