// Grave le commit deploye dans `public/version.json`, lu ensuite par un simple `curl` — sans
// authentification, ce qui en fait le premier outil de diagnostic : il repond « qu'est-ce qui
// tourne reellement ? », question qui precede toutes les autres.
//
// Le besoin n'est pas theorique : plusieurs echanges ont ete perdus, cote frontend, a
// diagnostiquer un ecran qui n'etait pas celui en ligne, la CI n'ayant pas livre.
//
// Genere, jamais versionne (voir .gitignore) : son contenu change a chaque commit, le suivre
// produirait un diff parasite permanent et un arbre de travail sale apres chaque build.
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

function commit() {
  // La CI fournit le SHA ; en local on interroge git. Ni l'un ni l'autre : « inconnue » plutot
  // qu'un echec — un build hors depot git n'a pas a etre impossible.
  if (process.env.GITHUB_SHA) {
    return process.env.GITHUB_SHA.slice(0, 7);
  }
  try {
    return execSync('git rev-parse --short=7 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'inconnue';
  }
}

const version = { commit: commit(), builtAt: new Date().toISOString() };
mkdirSync('public', { recursive: true });
writeFileSync('public/version.json', `${JSON.stringify(version, null, 2)}\n`);
console.log(`version ${version.commit} gravee dans le bundle`);
