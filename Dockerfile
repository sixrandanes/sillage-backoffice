# Image d'execution seule : elle empaquette le bundle **deja construit et teste** par la CI, et ne
# recompile rien. Meme raison que sur les deux autres depots — reconstruire ici publierait un
# artefact que personne n'a eprouve, et deux builds du meme commit peuvent differer.
#
#   npm ci && npm run build && docker build -t sillage-backoffice .
#
# Variante *unprivileged* de l'image officielle : elle tourne en utilisateur non root et ecoute
# deja sur 8080, ce qui correspond au defaut de Serverless Containers. L'image nginx ordinaire
# demarre en root pour se lier au port 80, privilege dont on n'a aucun besoin ici.
FROM nginxinc/nginx-unprivileged:1.27-alpine

EXPOSE 8080

# Le point d'entree de l'image officielle rend les gabarits de ce repertoire au demarrage
# (`envsubst`), ce qui permet d'injecter l'URL du backend **a l'execution**. C'est ce qui rend
# l'image identique entre staging et production : sans cela il faudrait deux images, et on
# perdrait la promotion du meme artefact d'un environnement a l'autre.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Angular 17+ ecrit le site dans `browser/` ; les licences restent a cote et n'ont rien a faire
# dans l'image.
COPY dist/backoffice/browser /usr/share/nginx/html
