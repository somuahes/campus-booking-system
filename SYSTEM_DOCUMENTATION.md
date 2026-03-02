# Campus Facility Booking System


## 1. Project Overview

The **Campus Facility Booking System** is a full-stack web application designed to manage and schedule campus facilities (e.g., halls, rooms, labs). It features a robust backend for handling booking logic and conflict prevention, alongside a modern, responsive frontend for users to view availability and make bookings.

**Key Features:**
*   **Facility Management:** View available facilities with capacities and locations.
*   **Booking System:** Users can book facilities specifying date, start time, and end time.
*   **Conflict Prevention:** The system validates booking requests to ensure no double-booking occurs for the same facility at overlapping times.
*   **Interactive UI:** A real-time, responsive Vanilla JavaScript frontend featuring availability timelines and instant feedback.

---

## 2. Architecture & Tech Stack

This project is built using a decoupled architecture, where a RESTful API backend serves a standalone frontend application.

### Backend Stack
*   **Framework:** Spring Boot 3
*   **Language:** Java 17
*   **Data Access:** Spring Data JPA / Hibernate
*   **Database:** 
    *   H2 (In-memory, used for rapid local development/testing)
    *   PostgreSQL (Configured for Render production deployment)
*   **Validation:** Jakarta Bean Validation (Hibernate Validator)
*   **Build Tool:** Maven

### Frontend Stack
*   **Core:** HTML5, CSS3, Vanilla JavaScript (`app.js`)
*   **Styling:** Bootstrap 5 (via CDN) + Custom CSS variables and layout
*   **Icons:** Unicode characters (to prevent SVG click interception issues)
*   **Animations:** CSS Keyframes

---

## 3. Project Structure

The repository is organized into two main parts: the `frontend` folder containing static assets, and the `src` folder containing the Java Spring Boot application.

```text
campus-booking-system/
├── frontend/                  # Standalone Frontend Application
│   ├── app.js                 # Core frontend logic and API integration
│   └── index.html             # Main entry point and UI layout
├── src/main/java/.../booking/ # Spring Boot Backend
│   ├── controller/            # REST API Endpoints (Booking, Facility)
│   ├── dto/                   # Data Transfer Objects (Requests/Responses)
│   ├── exception/             # Global Error Handling
│   ├── model/                 # JPA Entities (Database Tables)
│   ├── repository/            # Spring Data JPA Interfaces
│   └── service/               # Business Logic and Validation
├── pom.xml                    # Maven dependencies
├── API_DOCUMENTATION.md       # Detailed API specs and Postman usage
└── DEPLOYMENT.md              # Instructions for deploying to Render
```

---

## 4. Database Schema

The system uses three primary entities mapped to database tables via JPA.

### `User` Table (`users`)
Represents the individuals making the bookings.
*   `id` (PK): Unique Identifier
*   `name`: Full name
*   `email`: User email (Unique)
*   `password`: Hashed password (Not exposed in standard APIs)
*   `role`: Enum (`ADMIN`, `STUDENT`, `STAFF`)

### `Facility` Table (`facilities`)
Represents bookable spaces on campus.
*   `id` (PK): Unique Identifier
*   `name`: e.g., "Main Hall", "Lab 1"
*   `location`: e.g., "Building A"
*   `capacity`: Integer defining max occupancy
*   `is_available`: Boolean status flag

### `Booking` Table (`bookings`)
Represents a scheduled reservation.
*   `id` (PK): Unique Identifier
*   `user_id` (FK): Links to `users`
*   `facility_id` (FK): Links to `facilities`
*   `date`: Date of the booking (`LocalDate`)
*   `start_time`: Time the booking starts (`LocalTime`)
*   `end_time`: Time the booking ends (`LocalTime`)
*   `status`: Enum (`CONFIRMED`, `CANCELLED`)

*Note: JPA relationships dictate `User` has a One-to-Many relationship with `Booking`, and `Facility` has a One-to-Many relationship with `Booking`.*

---

## 5. Backend Components Details

### Controllers (API Layer)
*   **`BookingController`:** Manages CRUD operations for bookings (`/api/bookings`). Handles creation, updates, cancellations, and availability checks. Translates DTOs (Data Transfer Objects) to logic calls.
*   **`FacilityController`:** Manages facility listing and CRUD operations (`/api/facilities`).
*   **`RootController`:** Provides simple health-check endpoints at `/` and `/api`.

### Services (Business Logic)
*   **`BookingService`:** The heart of the application logic. 
    *   Validates whether a requested `facilityId` and `userId` exist.
    *   **Conflict Checking:** Performs crucial logic to ensure a new booking's `startTime` and `endTime` do not overlap with existing confirmed bookings for that facility on that specific date. Throws `BookingConflictException` if conflicts occur.
*   **`FacilityService`:** Handles retrieving, saving, and deleting facilities.

### Exception Handling
*   **`GlobalExceptionHandler`:** An `@ControllerAdvice` class that catches global exceptions (like `BookingConflictException`, `MethodArgumentNotValidException`, or generic `Exception`) and formats them into a standardized, friendly JSON format (`ApiError`). This prevents stack traces from leaking to the frontend.

---

## 6. Frontend Architecture

The frontend is a Single Page Application (SPA) built without heavy frameworks.

### State Management
Data retrieved from the backend is cached in global arrays to minimize API calls and drive the UI quickly:
*   `facilitiesCache`: Stores the array of available facilities.
*   `bookingsCache`: Stores the array of current user bookings.

### API Integration
*   The `API` constant points to the backend URL.
*   `app.js` uses standard `fetch()` API calls (GET, POST, PUT, DELETE) to communicate with the Spring Boot server. Responses are parsed to JSON.
*   Error responses from the backend (specifically via `GlobalExceptionHandler`) are caught, parsed by the `friendlyError` utility function, and shown to the user via UI alerts/modals.

### UI Components & Flow
1.  **Tab Navigation:** Functions handle shifting between the "Facilities" view and "My Bookings" view by toggling CSS classes.
2.  **Facility Rendering (`renderFacilitiesList`):** Dynamically generates Bootstrap CARDS for each facility. It also calculates a time grid, pinging the backend or checking local logic to highlight taken versus free time slots dynamically.
3.  **Booking Submission (`postBooking`):** Collects data from the form (Facility ID, Date, Start/End times), prepares a JSON payload, and posts to the API.
4.  **Feedback Modals:** Vanilla JS wrappers around Bootstrap Modals provide confirmation (`showConfirm`), success Toasts (`toast`), and error alerts (`showAlert`).

---

## 7. Setup & Development Guide

### Prerequisites
*   Java Development Kit (JDK) 17 or higher
*   Maven 3.6+
*   *(Optional)* PostgreSQL if not using the default H2 in-memory DB.

### Running the Backend Locally
1.  Open a terminal in the root directory (`campus-booking-system`).
2.  Run the application using the Maven wrapper or standard Maven:
    ```bash
    mvn spring-boot:run
    ```
3.  The backend will start on `http://localhost:8080`.
4.  *Note: The system includes a `DataSeeder` service that automatically populates the H2 database with test Users and Facilities on initial startup.*

### Running the Frontend
Because it is a standalone application pointing to the API:
1.  Ensure the backend is running.
2.  Open `campus-booking-system/frontend/index.html` in your browser. 
3.  *Alternatively, use the VS Code "Live Server" extension on `index.html` for a better experience.*

### Testing APIs
*   Navigate to the web interface to test the flow manually.
*   Alternatively, import the provided `Campus_Facility_Booking_API.postman_collection.json` into Postman to test endpoints directly.

---

## 8. References
For more granular details on specific aspects of the system, consult the following documents:
*   **[API Documentation](./API_DOCUMENTATION.md):** Detailed specs for all REST endpoints, headers, payloads, and example cURL/PowerShell requests.
*   **[Deployment Guide](./DEPLOYMENT.md):** Step-by-step instructions for deploying the Spring Boot backend and PostgreSQL database to Render.com.
