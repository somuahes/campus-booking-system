package com.example.booking.controller;

import com.example.booking.dto.BookingRequest;
import com.example.booking.dto.BookingResponse;
import com.example.booking.model.Booking;
import com.example.booking.service.BookingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/bookings")
@CrossOrigin(origins = "*")
public class BookingController {
    
    private final BookingService bookingService;
    
    public BookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }
    
    @GetMapping
    public ResponseEntity<List<BookingResponse>> getAllBookings() {
        List<BookingResponse> bookings = bookingService.getAllBookings();
        return ResponseEntity.ok(bookings);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<BookingResponse> getBookingById(@PathVariable Long id) {
        BookingResponse booking = bookingService.getBookingById(id);
        return ResponseEntity.ok(booking);
    }
    
    @PostMapping
    public ResponseEntity<BookingResponse> createBooking(@Valid @RequestBody BookingRequest request) {
        BookingResponse created = bookingService.createBooking(request);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<BookingResponse> updateBooking(
            @PathVariable Long id, 
            @Valid @RequestBody BookingRequest request) {
        BookingResponse updated = bookingService.updateBooking(id, request);
        return ResponseEntity.ok(updated);
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBooking(@PathVariable Long id) {
        bookingService.cancelBooking(id);
        return ResponseEntity.noContent().build();
    }
    
    @GetMapping("/check-availability")
    public ResponseEntity<Boolean> checkAvailability(
            @RequestParam Long facilityId,
            @RequestParam String date,
            @RequestParam String startTime,
            @RequestParam String endTime) {
        LocalDate bookingDate = LocalDate.parse(date);
        boolean isAvailable = bookingService.isFacilityAvailable(
            facilityId, bookingDate, startTime, endTime);
        return ResponseEntity.ok(isAvailable);
    }
    
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<BookingResponse>> getBookingsByUser(@PathVariable Long userId) {
        List<BookingResponse> bookings = bookingService.getBookingsByUser(userId);
        return ResponseEntity.ok(bookings);
    }
    
    @GetMapping("/facility/{facilityId}")
    public ResponseEntity<List<BookingResponse>> getBookingsByFacility(@PathVariable Long facilityId) {
        List<BookingResponse> bookings = bookingService.getBookingsByFacility(facilityId);
        return ResponseEntity.ok(bookings);
    }
}