package com.example.booking;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class BookingApplication {
    public static void main(String[] args) {
        SpringApplication.run(BookingApplication.class, args);
        System.out.println("🚀 Campus Booking System started successfully!");
        System.out.println("📝 API available at: http://localhost:8081");
    }
}