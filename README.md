# Event Registration API
Backend service for managing attendee registrations. Built with NestJS, secured with Keycloak, persisting data in MongoDB, and communicating with the Event Management API over gRPC. It also integrates Kafka for messaging, MinIO for file storage, QR code and badge generation, and email delivery for invitations.

## What this service does
- Exposes REST endpoints to create, update, list, and delete event registrations with multi-tenant support.
- Acts as a gRPC client to the Event Management API (`src/proto/event.proto`) to enrich registrations with event data.
- Hosts its own gRPC server (`src/proto/registration.proto`) so other services can validate or fetch registration details.
- Issues QR codes, badges, and invitation letters, storing related assets in MinIO and emailing attendees.
- Protects routes with Keycloak (bearer-only) and documents REST APIs with Swagger.
- Streams domain events through Kafka consumers and producers.

## Stack
- NestJS 11 (REST + gRPC)
- MongoDB via Mongoose
- Keycloak (nest-keycloak-connect)
- Kafka (kafkajs)
- MinIO client for object storage
- Nodemailer + MJML for email templates
- QRCode/PDF generation utilities

## Getting started
1. Prerequisites: Node.js 18+, npm, MongoDB, Keycloak, Kafka broker, MinIO endpoint, and access to the Event Management API gRPC endpoint.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment (see below) in a local `.env` file. Do not commit secrets.
4. Run the service:
   ```bash
   # watch mode
   npm run start:dev

   # production build then run
   npm run build && npm run start:prod
   ```
5. API docs are served at `http://<APP_HOST>:<APP_PORT>/api` when the app is running.

## Configuration
Set the following variables in `.env` (values are environment-specific; keep secrets out of version control):
- App: `APP_HOST`, `APP_PORT`, `EVENT_REGISTRATION_SERVICE_URL`
- MongoDB: `MONGODB_URI`
- Event Management gRPC client: `EVENT_SERVICE_URL`
- Keycloak: `KEYCLOAK_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_CLIENT_SECRET`, `KEYCLOAK_ADMIN_USER`, `KEYCLOAK_ADMIN_PASSWORD`
- Kafka: `KAFKA_HOST`, `KAFKA_PORT`, `KAFKA_CLIENT_ID`, `KAFKA_GROUP_ID`
- MinIO: `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_USE_SSL`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET_NAME`, `MINIO_URL`
- QR/links: `QR_JWT_SECRET`, `EXPO_APP_URL`
- Email: `GMAIL_USER`, `GMAIL_PASS`

## Key endpoints and interfaces
- REST base path: `/event-registrations` (CRUD, filtering, and event lookups by registration).
- Swagger UI: `/api`.
- gRPC server: package `registration`, proto `src/proto/registration.proto` (listens on `EVENT_REGISTRATION_SERVICE_URL`).
- gRPC client to Event Management API: package `event`, proto `src/proto/event.proto` (endpoint `EVENT_SERVICE_URL`).

## Testing
```bash
npm test
npm run test:e2e
npm run test:cov
```

## Notes
- Secrets (client secrets, passwords, keys) must be injected via environment/config providers only.
- This service is designed to run alongside the Event Management API, Keycloak, MongoDB, Kafka, and MinIO; ensure those dependencies are available before starting.
