/**
 * Prefixe de l'API REST, et le seul endroit ou la version s'ecrit cote client.
 *
 * Le miroir de `nc.sillage.shared.ApiVersion` cote backend, et le pendant de la constante du
 * meme nom cote frontend. **Les trois doivent bouger ensemble** : une version qui ne concorde
 * pas ne produit pas une erreur parlante mais une avalanche de 404 sur toutes les pages a la
 * fois — c'est exactement ce qui est arrive a ce backoffice, reste sur `/api/platform/...` quand
 * le backend est passe a `/api/v1/platform/...`. Aucun ecran ne fonctionnait plus, et rien ne le
 * disait autrement que par des 404.
 *
 * Les URL restent **relatives** (jamais `http://localhost:8080/...`) : c'est le proxy de
 * developpement, puis nginx en production, qui routent `/api` vers le backend.
 *
 * **Les tests, eux, ecrivent le chemin complet en dur**, et c'est deliberе : ils verifient le
 * contrat reellement envoye sur le fil. La consequence est celle qu'on veut — changer la valeur
 * ci-dessous fait echouer toutes les specs d'un coup, ce qui oblige a regarder ce qu'on rompt.
 */
export const API = '/api/v1';
