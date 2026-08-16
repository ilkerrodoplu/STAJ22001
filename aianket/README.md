# Company Survey Management System - Secure and Scalable Customer Feedback Platform

The Company Survey Management System is a Spring Boot-based application that enables companies to collect, manage, and analyze customer feedback through customizable surveys. The system provides secure authentication, real-time notifications, and comprehensive reporting capabilities.

The application uses MongoDB for data storage, JWT for authentication, and includes features like QR code generation for survey access, email notifications, and role-based access control. It provides a RESTful API interface with comprehensive OpenAPI documentation.

## Repository Structure
```
.
├── src/main/java/com/survey/ai/
│   ├── config/                 # Configuration classes for security, MongoDB, CORS, and OpenAPI
│   ├── controller/             # REST controllers handling HTTP requests
│   ├── dto/                   # Data Transfer Objects for request/response handling
│   ├── entity/                # MongoDB document models
│   ├── exception/             # Custom exception handlers and global error handling
│   ├── repository/            # MongoDB repositories for data access
│   ├── security/              # JWT authentication and security components
│   ├── service/               # Business logic implementation
│   └── util/                  # Utility classes
├── src/main/resources/
│   ├── application.properties # Application configuration
│   └── templates/             # Email templates
└── pom.xml                    # Maven project configuration
```

## Usage Instructions
### Prerequisites
- Java 17 or higher
- MongoDB 4.4+
- Maven 3.6+
- SMTP server access for email functionality

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd company-survey-system
```

2. Configure MongoDB connection in `application.properties`:
```properties
spring.data.mongodb.uri=mongodb://username:password@localhost:27017/survey_db
```

3. Configure email settings in `application.properties`:
```properties
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=your-email@gmail.com
spring.mail.password=your-app-password
```

4. Build the application:
```bash
./mvnw clean install
```

5. Run the application:
```bash
./mvnw spring-boot:run
```

### Sırlar ve ilk kurulum (.env)

Tüm sırlar `.env` dosyasındadır, git'e girmez. Kodda hiçbir varsayılan şifre yoktur.

| Değişken | Ne işe yarar |
|---|---|
| `SITE_ADMIN_EMAIL` / `SITE_ADMIN_PASSWORD` | İlk süper admin hesabı. Yalnızca hesap yokken, uygulama ilk açılışında kullanılır. Boşsa hesap açılmaz. |
| `MONGO_ROOT_USERNAME` / `MONGO_ROOT_PASSWORD` | MongoDB yönetici hesabı (yalnızca bakım ve mongo-express). |
| `MONGO_APP_DB` / `MONGO_APP_USERNAME` / `MONGO_APP_PASSWORD` | Uygulamanın readWrite kullanıcısı; `mongo-init.js` bunlarla açar. `MONGO_URI` ile tutarlı olmalı. |
| `MONGO_URI` | Uygulamanın bağlantı adresi. |
| `MONGO_EXPRESS_*` | mongo-express arayüzü (yalnızca `127.0.0.1:8082`). |

**Süper adminin şifresi sonradan değişmez:** `SiteAdminInitializer` hesap zaten
varsa hiçbir şey yapmaz. Şifreyi değiştirmek için panelden *Ayarlar > Şifre
Değiştir* kullanın, ya da kullanıcı kaydını silip uygulamayı yeniden başlatın.

### MongoDB kimlik doğrulaması

Mongo `--auth` ile çalışır; kimlik doğrulaması olmadan tek sorgu bile geçmez.
Kullanıcılar `mongo-init.js` ile açılır, ancak bu betik **yalnızca veri dizini
boşken** çalışır.

**Sıfırdan kurulum** (veri yoksa) — ek işlem gerekmez:
```bash
docker compose up -d mongodb
```

**Mevcut veritabanı varsa**, auth'u açmadan ÖNCE kullanıcıları elle oluşturun.
Aksi halde Mongo auth ile açılır ama hiçbir hesap olmadığı için kimse bağlanamaz:
```bash
docker exec mongodb mongosh admin --eval 'db.createUser({user:"<MONGO_ROOT_USERNAME>",pwd:"<MONGO_ROOT_PASSWORD>",roles:[{role:"root",db:"admin"}]})'
```

Uygulama kullanıcısının şifresini `.env` ile aynı yapın (varsa günceller, yoksa açar):
```bash
docker exec mongodb mongosh aisurvey_survey --eval 'db.updateUser("<MONGO_APP_USERNAME>",{pwd:"<MONGO_APP_PASSWORD>"})'
```

Sonra yığını yeniden başlatın:
```bash
docker compose up -d --force-recreate mongodb mongo-express xsurvey-backend
```

### Quick Start
1. Access the API documentation:
```
http://localhost:8081/api/swagger-ui.html
```

2. İlk süper admin hesabı `SITE_ADMIN_EMAIL` / `SITE_ADMIN_PASSWORD` ile açılır
   (bkz. yukarıdaki tablo).

3. Authenticate using the `/v1/auth/login` endpoint to obtain a JWT token.

4. Use the token in the Authorization header for subsequent requests:
```
Authorization: Bearer <your-jwt-token>
```

### More Detailed Examples

1. Creating a new survey template:
```bash
curl -X POST http://localhost:8081/api/v1/survey-templates \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Customer Satisfaction Survey",
    "description": "General feedback survey",
    "questions": [
      {
        "text": "How would you rate the cleanliness?",
        "category": "cleanliness",
        "displayOrder": 1
      }
    ]
  }'
```

2. Generating a QR code for a survey:
```bash
curl -X GET http://localhost:8081/api/v1/qr-codes/generate \
  -H "Authorization: Bearer <token>" \
  -d "companyId=123&surveyId=456"
```

### Troubleshooting

1. MongoDB Connection Issues
- Error: "MongoTimeoutException: Timed out after 30000 ms while waiting to connect"
- Solution: 
  - Verify MongoDB is running: `mongosh`
  - Check connection string in application.properties
  - Ensure network connectivity to MongoDB server

2. JWT Token Issues
- Error: "Invalid JWT token"
- Solution:
  - Verify token expiration
  - Check if token is properly formatted
  - Ensure secret key matches in application.properties

3. Email Sending Failures
- Error: "MailAuthenticationException"
- Solution:
  - Verify SMTP credentials
  - Check if 2FA is enabled (use App Password)
  - Confirm port and TLS settings

## Data Flow
The application follows a layered architecture for processing survey responses and generating reports.

```ascii
Client Request -> Controller -> Service Layer -> Repository
     ↑                             ↓
     └─────────── Response ←─── MongoDB
```

Key interactions:
1. Controllers receive HTTP requests and validate input
2. Services implement business logic and data transformation
3. Repositories handle data persistence with MongoDB
4. JWT authentication filters secure all protected endpoints
5. Email notifications are sent asynchronously
6. Survey responses are processed and aggregated for reporting
7. QR codes are generated for survey access

## Infrastructure

![Infrastructure diagram](./docs/infra.svg)

The application uses the following key components:

MongoDB Resources:
- Collections: users, surveys, responses, companies
- Indexes on frequently queried fields
- Audit fields for tracking creation/modification

Security Infrastructure:
- JWT-based authentication
- Role-based access control (ADMIN, STAFF)
- Password encryption using BCrypt
- CORS configuration for frontend access

Email Infrastructure:
- SMTP configuration for sending notifications
- HTML email templates for various notifications
- Async email processing