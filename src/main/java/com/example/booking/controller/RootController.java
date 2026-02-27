package com.example.booking.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Simple root endpoint so hitting the backend URL directly
 * returns a 200 health check instead of a 500 error.
 */
@RestController
public class RootController {

    @GetMapping("/")
    public Map<String, String> root() {
        return Map.of(
                "status", "ok",
                "service", "Campus Booking System API",
                "docs", "/api/facilities  |  /api/bookings");
    }
}
