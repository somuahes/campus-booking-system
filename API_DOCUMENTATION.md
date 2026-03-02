# Campus Facility Booking System - API Documentation

Base URL: `http://localhost:8080/api`

## Facilities

### GET /facilities
Retrieve all available facilities.

**Response**: `200 OK`
```json
[
  {
    "id": 1,
    "name": "Main Hall",
    "location": "Building A",
    "capacity": 500
  }
]
```

---

### GET /facilities/{id}
Retrieve a specific facility by ID.

**Path Parameters**:
- `id` (Long) - The facility ID

**Response**: `200 OK` or `404 Not Found`
```json
{
  "id": 1,
  "name": "Main Hall",
  "location": "Building A",
  "capacity": 500
}
```

---

## Bookings

### GET /bookings
Retrieve all bookings.

**Response**: `200 OK`
```json
[
  {
    "id": 1,
    "facility": {
      "id": 1,
      "name": "Main Hall",
      "location": "Building A",
      "capacity": 500
    },
    "user": {
      "id": 1,
      "name": "Admin User",
      "email": "admin@example.com",
      "role": "ADMIN"
    },
    "date": "2026-02-20",
    "startTime": "10:00:00",
    "endTime": "11:30:00",
    "status": "CONFIRMED"
  }
]
```

---

### POST /bookings
Create a new booking.

**Request Body**:
```json
{
  "facilityId": 1,
  "userId": 1,
  "date": "2026-02-20",
  "startTime": "10:00:00",
  "endTime": "11:30:00"
}
```

**Validation Rules**:
- `facilityId`: Required, must exist
- `userId`: Required, must exist
- `date`: Required, must be present or future date
- `startTime`: Required, must be before endTime
- `endTime`: Required, must be after startTime
- No conflicting bookings allowed for the same facility

**Response**: `201 Created`
```json
{
  "id": 1,
  "facility": {...},
  "user": {...},
  "date": "2026-02-20",
  "startTime": "10:00:00",
  "endTime": "11:30:00",
  "status": "CONFIRMED"
}
```

**Error Response**: `400 Bad Request`
```json
{
  "status": "BAD_REQUEST",
  "message": "Validation Failed",
  "errors": [
    "facilityId: Facility ID is required",
    "date: Date is required"
  ],
  "timestamp": "2026-02-17T14:00:00"
}
```

---

### PUT /bookings/{id}
Update an existing booking.

**Path Parameters**:
- `id` (Long) - The booking ID

**Request Body**: Same as POST /bookings

**Validation**: Same as POST, plus conflict check excludes current booking

**Response**: `200 OK` or `404 Not Found`
```json
{
  "id": 1,
  "facility": {...},
  "user": {...},
  "date": "2026-02-20",
  "startTime": "14:00:00",
  "endTime": "15:00:00",
  "status": "CONFIRMED"
}
```

---

### DELETE /bookings/{id}
Cancel a booking (soft delete - sets status to CANCELLED).

**Path Parameters**:
- `id` (Long) - The booking ID

**Response**: `204 No Content`

**Note**: The booking is not deleted from the database, only its status is changed to `CANCELLED`.

---

### GET /bookings/availability
Check facility availability for a specific date.

**Query Parameters**:
- `facilityId` (Long, required) - The facility ID
- `date` (Date, required) - Date in ISO format (YYYY-MM-DD)

**Example**: `GET /bookings/availability?facilityId=1&date=2026-02-20`

**Response**: `200 OK`
```json
[
  {
    "id": 1,
    "facility": {...},
    "user": {...},
    "date": "2026-02-20",
    "startTime": "10:00:00",
    "endTime": "11:30:00",
    "status": "CONFIRMED"
  }
]
```

**Note**: Returns all non-cancelled bookings for the facility on the specified date. The frontend can use this to calculate free 30-minute slots.

---

## Status Codes

| Code | Description |
|------|-------------|
| 200  | OK - Request successful |
| 201  | Created - Resource created successfully |
| 204  | No Content - Operation successful, no content to return |
| 400  | Bad Request - Validation failed or invalid request |
| 404  | Not Found - Resource not found |
| 500  | Internal Server Error - Unexpected server error |

---

## Testing Examples

### Using PowerShell (Invoke-WebRequest)

**GET all facilities**:
```powershell
Invoke-WebRequest -Uri "http://localhost:8080/api/facilities" -UseBasicParsing | Select-Object -ExpandProperty Content
```

**Create a booking**:
```powershell
Invoke-WebRequest -Uri "http://localhost:8080/api/bookings" -Method POST -ContentType "application/json" -Body '{"facilityId": 1, "userId": 1, "date": "2026-02-20", "startTime": "10:00:00", "endTime": "11:30:00"}' -UseBasicParsing | Select-Object -ExpandProperty Content
```

**Update a booking**:
```powershell
Invoke-WebRequest -Uri "http://localhost:8080/api/bookings/1" -Method PUT -ContentType "application/json" -Body '{"facilityId": 1, "userId": 1, "date": "2026-02-20", "startTime": "14:00:00", "endTime": "15:00:00"}' -UseBasicParsing | Select-Object -ExpandProperty Content
```

**Cancel a booking**:
```powershell
Invoke-WebRequest -Uri "http://localhost:8080/api/bookings/1" -Method DELETE -UseBasicParsing
```

**Check availability**:
```powershell
Invoke-WebRequest -Uri "http://localhost:8080/api/bookings/availability?facilityId=1&date=2026-02-20" -UseBasicParsing | Select-Object -ExpandProperty Content
```

### Using curl

**GET all facilities**:
```bash
curl http://localhost:8080/api/facilities
```

**Create a booking**:
```bash
curl -X POST http://localhost:8080/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"facilityId": 1, "userId": 1, "date": "2026-02-20", "startTime": "10:00:00", "endTime": "11:30:00"}'
```

**Update a booking**:
```bash
curl -X PUT http://localhost:8080/api/bookings/1 \
  -H "Content-Type: application/json" \
  -d '{"facilityId": 1, "userId": 1, "date": "2026-02-20", "startTime": "14:00:00", "endTime": "15:00:00"}'
```

**Cancel a booking**:
```bash
curl -X DELETE http://localhost:8080/api/bookings/1
```

**Check availability**:
```bash
curl "http://localhost:8080/api/bookings/availability?facilityId=1&date=2026-02-20"
```

---

## Database Access

The H2 console is available at: `http://localhost:8080/h2-console`

**Credentials**:
- JDBC URL: `jdbc:h2:mem:testdb`
- Username: `sa`
- Password: `password`
