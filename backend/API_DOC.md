# SmartMarket Backend API Documentation

Base URL: http://{host}:{port}/api  (default development: http://127.0.0.1:8000/api)

All example curl commands below are tailored for Windows `cmd.exe`.

1) Register

- Endpoint: POST /api/auth/register
- Description: Create a new user and business. Returns access and refresh JWT tokens on success.
- Request body (JSON):
  - email (string, required)
  - password (string, required, min 8 chars)
  - first_name (string, required)
  - business_name (string, required)
  - business_type (string, required)
  - language (string, optional)

Example (cmd.exe):

```cmd
curl -i -X POST "http://127.0.0.1:8000/api/auth/register" -H "Content-Type: application/json" -d "{\"email\":\"demo@example.com\",\"password\":\"password123\",\"first_name\":\"Demo\",\"business_name\":\"Demo Shop\",\"business_type\":\"retail\",\"language\":\"en\"}"
```

Success response (HTTP 201):

```json
{
  "access_token": "<jwt>",
  "refresh_token": "<jwt>",
  "expires_in": 3600
}
```

Errors:
- 400 Bad Request: validation errors (missing fields, password too short)
- 409 / 400: email already exists (serializer raises validation error)

---

2) Login

- Endpoint: POST /api/auth/login
- Description: Authenticate a user and return access and refresh tokens.
- Request body (JSON): email, password

Example (cmd.exe):

```cmd
curl -i -X POST "http://127.0.0.1:8000/api/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"demo@example.com\",\"password\":\"password123\"}"
```

Success response (HTTP 200):

```json
{
  "access_token": "<jwt>",
  "refresh_token": "<jwt>",
  "expires_in": 3600
}
```

Errors:
- 401 Unauthorized: invalid credentials

---

3) Refresh token

- Endpoint: POST /api/auth/token/refresh
- Description: Exchange a refresh token for a new access token.
- Request body (JSON): { "refresh_token": "<refresh token>" }

Example (cmd.exe):

```cmd
curl -i -X POST "http://127.0.0.1:8000/api/auth/token/refresh" -H "Content-Type: application/json" -d "{\"refresh_token\":\"<refresh token>\"}"
```

Success response (HTTP 200):

```json
{
  "access_token": "<jwt>",
  "expires_in": 3600
}
```

Errors:
- 400 Bad Request: missing refresh_token
- 401 Unauthorized: invalid refresh token

---

4) Business profile

- Endpoint: GET /api/business/profile
- Description: Returns basic business details and simple stats for the authenticated user's business.
- Auth: Bearer access_token in Authorization header

Example (cmd.exe):

```cmd
curl -i -X GET "http://127.0.0.1:8000/api/business/profile" -H "Authorization: Bearer <access_token>"
```

Success response (HTTP 200):

```json
{
  "business": {
    "id": 1,
    "name": "Demo Shop",
    "business_type": "retail",
    "data_sources": [],
    "created_at": "2025-11-05T18:31:39.681155Z"
  },
  "stats": {
    "product_count": 0,
    "customer_count": 0,
    "transaction_count": 0,
    "total_revenue": 0,
    "last_transaction_date": null
  }
}
```

Errors:
- 401 Unauthorized: missing or invalid access token
- 404 Not Found: business not found for the authenticated user

---

Notes & troubleshooting
- Ensure your server is running at the expected host/port. By default Django's dev server binds to 127.0.0.1:8000.
- If you get CORS or host errors while testing from another machine, run the server with host 0.0.0.0 and configure allowed hosts in settings.
- The refresh token format and lifetimes are managed by `rest_framework_simplejwt` settings in `smartmarket/settings.py`.

If you'd like, I can add these curl examples into a folder (`examples/`) as .cmd files for one-click testing, or convert the API doc to an OpenAPI (swagger) spec.
