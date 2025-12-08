---
name: api-design
description: RESTful API design skill for creating consistent, well-documented APIs. Use when designing new endpoints or reviewing API structure.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# API Design Skill

## Purpose
Design and implement RESTful APIs following best practices and industry standards.

## REST Principles

### Resource Naming
- Use nouns, not verbs: `/users` not `/getUsers`
- Plural for collections: `/users`, `/orders`
- Hierarchical for relationships: `/users/{id}/orders`
- Lowercase, hyphen-separated: `/user-profiles`

### HTTP Methods
| Method | Purpose | Idempotent |
|--------|---------|------------|
| GET | Retrieve resource(s) | Yes |
| POST | Create resource | No |
| PUT | Replace resource | Yes |
| PATCH | Partial update | Yes |
| DELETE | Remove resource | Yes |

### Status Codes
```
2xx Success:
  200 OK - Successful GET, PUT, PATCH, DELETE
  201 Created - Successful POST
  204 No Content - Successful DELETE with no body

4xx Client Errors:
  400 Bad Request - Invalid input
  401 Unauthorized - No authentication
  403 Forbidden - No permission
  404 Not Found - Resource doesn't exist
  409 Conflict - Resource conflict
  422 Unprocessable Entity - Validation error

5xx Server Errors:
  500 Internal Server Error
  503 Service Unavailable
```

## Response Format

### Success Response
```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "totalPages": 10,
    "totalItems": 100
  }
}
```

### Error Response
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

## Pagination
```
GET /users?page=1&limit=20
GET /users?offset=0&limit=20
GET /users?cursor=abc123
```

## Filtering & Sorting
```
GET /users?status=active&role=admin
GET /users?sort=createdAt:desc
GET /users?fields=id,name,email
```

## Versioning
- URL path: `/api/v1/users`
- Header: `Accept: application/vnd.api+json; version=1`

## Documentation
- OpenAPI/Swagger specification
- Clear descriptions for each endpoint
- Example requests and responses
- Error scenarios documented

## Security Considerations
- Authentication (JWT, API keys)
- Rate limiting
- Input validation
- CORS configuration
