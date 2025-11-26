# API d'Inscription aux Événements
Service backend pour gérer les inscriptions des participants. Construit avec NestJS, sécurisé par Keycloak, persistant les données dans MongoDB et communiquant avec l'API de gestion d'événements via gRPC. Il intègre aussi Kafka pour la messagerie, MinIO pour le stockage de fichiers, la génération de QR codes et de badges, ainsi que l'envoi d'invitations par e-mail.

## Ce que fait le service
- Expose des endpoints REST pour créer, mettre à jour, lister et supprimer des inscriptions, avec support multi-tenant.
- Agit comme client gRPC de l'API de gestion d'événements (`src/proto/event.proto`) pour enrichir les inscriptions avec les données d'événement.
- Héberge son propre serveur gRPC (`src/proto/registration.proto`) afin que d'autres services puissent valider ou récupérer les détails d'inscription.
- Génère des QR codes, badges et lettres d'invitation, stocke les assets associés dans MinIO et envoie des e-mails aux participants.
- Protège les routes avec Keycloak (mode bearer-only) et documente les APIs REST avec Swagger.
- Diffuse les événements métier via des consommateurs et producteurs Kafka.

## Stack
- NestJS 11 (REST + gRPC)
- MongoDB avec Mongoose
- Keycloak (nest-keycloak-connect)
- Kafka (kafkajs)
- Client MinIO pour le stockage d'objets
- Nodemailer + MJML pour les templates d'e-mails
- Outils de génération de QRCode/PDF

## Prise en main
1. Prérequis : Node.js 18+, npm, MongoDB, Keycloak, un broker Kafka, un endpoint MinIO et l'accès au endpoint gRPC de l'API de gestion d'événements.
2. Installer les dépendances :
   ```bash
   npm install
   ```
3. Configurer les variables d'environnement (voir ci-dessous) dans un fichier `.env` local. Ne pas commettre de secrets.
4. Lancer le service :
   ```bash
   # mode watch
   npm run start:dev

   # build de prod puis exécution
   npm run build && npm run start:prod
   ```
5. La documentation API est disponible sur `http://<APP_HOST>:<APP_PORT>/api` lorsque l'application tourne.

## Configuration
Définissez les variables suivantes dans `.env` (valeurs spécifiques à l'environnement ; gardez les secrets hors du versionnement) :
- App : `APP_HOST`, `APP_PORT`, `EVENT_REGISTRATION_SERVICE_URL`
- MongoDB : `MONGODB_URI`
- Client gRPC de l'API de gestion d'événements : `EVENT_SERVICE_URL`
- Keycloak : `KEYCLOAK_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_CLIENT_SECRET`, `KEYCLOAK_ADMIN_USER`, `KEYCLOAK_ADMIN_PASSWORD`
- Kafka : `KAFKA_HOST`, `KAFKA_PORT`, `KAFKA_CLIENT_ID`, `KAFKA_GROUP_ID`
- MinIO : `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_USE_SSL`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET_NAME`, `MINIO_URL`
- QR/liens : `QR_JWT_SECRET`, `EXPO_APP_URL`
- E-mail : `GMAIL_USER`, `GMAIL_PASS`

## Principaux endpoints et interfaces
- Base REST : `/event-registrations` (CRUD, filtrage et recherche d'événements par inscription).
- Swagger UI : `/api`.
- Serveur gRPC : package `registration`, proto `src/proto/registration.proto` (écoute sur `EVENT_REGISTRATION_SERVICE_URL`).
- Client gRPC vers l'API de gestion d'événements : package `event`, proto `src/proto/event.proto` (endpoint `EVENT_SERVICE_URL`).

## Tests
```bash
npm test
npm run test:e2e
npm run test:cov
```

## Notes
- Les secrets (client secrets, mots de passe, clés) doivent uniquement être injectés via les fournisseurs d'environnement/de configuration.
- Ce service est conçu pour fonctionner aux côtés de l'API de gestion d'événements, Keycloak, MongoDB, Kafka et MinIO ; assurez-vous que ces dépendances sont disponibles avant de démarrer.
