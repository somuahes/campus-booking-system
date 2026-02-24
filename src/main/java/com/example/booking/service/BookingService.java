package com.example.booking.service;

import com.example.booking.dto.BookingRequest;
import com.example.booking.dto.BookingResponse;
import com.example.booking.exception.BookingConflictException;
import com.example.booking.model.Booking;
import com.example.booking.model.BookingStatus;
import com.example.booking.model.Facility;
import com.example.booking.model.User;
import com.example.booking.repository.BookingRepository;
import com.example.booking.repository.FacilityRepository;
import com.example.booking.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class BookingService {
    
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final FacilityRepository facilityRepository;
    
    public BookingService(BookingRepository bookingRepository, 
                         UserRepository userRepository,
                         FacilityRepository facilityRepository) {
        this.bookingRepository = bookingRepository;
        this.userRepository = userRepository;
        this.facilityRepository = facilityRepository;
    }
    
    public List<BookingResponse> getAllBookings() {
        return bookingRepository.findAll().stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }
    
    public BookingResponse getBookingById(Long id) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Booking not found with id: " + id));
        return convertToResponse(booking);
    }
    
    @Transactional
    public BookingResponse createBooking(BookingRequest request) {
        // Validate user exists
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new EntityNotFoundException("User not found with id: " + request.getUserId()));
        
        // Validate facility exists and is available
        Facility facility = facilityRepository.findById(request.getFacilityId())
                .orElseThrow(() -> new EntityNotFoundException("Facility not found with id: " + request.getFacilityId()));
        
        if (!facility.getIsAvailable()) {
            throw new IllegalStateException("Facility is not available for booking");
        }
        
        // Check for conflicting bookings
        boolean hasConflict = bookingRepository.existsConflictingBooking(
                request.getFacilityId(),
                request.getDate(),
                request.getStartTime(),
                request.getEndTime()
        );
        
        if (hasConflict) {
            throw new BookingConflictException(
                "Facility is already booked during the requested time slot"
            );
        }
        
        // Create and save booking
        Booking booking = new Booking();
        booking.setUser(user);
        booking.setFacility(facility);
        booking.setDate(request.getDate());
        booking.setStartTime(request.getStartTime());
        booking.setEndTime(request.getEndTime());
        booking.setPurpose(request.getPurpose());
        booking.setStatus(BookingStatus.CONFIRMED);
        
        Booking savedBooking = bookingRepository.save(booking);
        return convertToResponse(savedBooking);
    }
    
    @Transactional
    public BookingResponse updateBooking(Long id, BookingRequest request) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Booking not found with id: " + id));
        
        // Check if booking can be modified
        if (booking.getStatus() == BookingStatus.CANCELLED) {
            throw new IllegalStateException("Cannot update a cancelled booking");
        }
        
        // Validate user exists
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new EntityNotFoundException("User not found with id: " + request.getUserId()));
        
        // Validate facility exists and is available
        Facility facility = facilityRepository.findById(request.getFacilityId())
                .orElseThrow(() -> new EntityNotFoundException("Facility not found with id: " + request.getFacilityId()));
        
        if (!facility.getIsAvailable()) {
            throw new IllegalStateException("Facility is not available for booking");
        }
        
        // Check for conflicts (excluding this booking)
        List<Booking> conflictingBookings = bookingRepository.findActiveBookingsByFacilityAndDate(
                request.getFacilityId(), request.getDate())
                .stream()
                .filter(b -> !b.getId().equals(id)) // Exclude current booking
                .filter(b -> timeOverlap(b.getStartTime(), b.getEndTime(), request.getStartTime(), request.getEndTime()))
                .toList();
        
        if (!conflictingBookings.isEmpty()) {
            throw new BookingConflictException(
                "Facility is already booked during the requested time slot"
            );
        }
        
        // Update fields
        booking.setUser(user);
        booking.setFacility(facility);
        booking.setDate(request.getDate());
        booking.setStartTime(request.getStartTime());
        booking.setEndTime(request.getEndTime());
        booking.setPurpose(request.getPurpose());
        
        Booking updatedBooking = bookingRepository.save(booking);
        return convertToResponse(updatedBooking);
    }
    
    @Transactional
    public void cancelBooking(Long id) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Booking not found with id: " + id));
        
        if (booking.getStatus() == BookingStatus.CANCELLED) {
            throw new IllegalStateException("Booking is already cancelled");
        }
        
        booking.setStatus(BookingStatus.CANCELLED);
        bookingRepository.save(booking);
    }
    
    public boolean isFacilityAvailable(Long facilityId, LocalDate date, String startTime, String endTime) {
        LocalTime start = LocalTime.parse(startTime);
        LocalTime end = LocalTime.parse(endTime);
        
        return !bookingRepository.existsConflictingBooking(facilityId, date, start, end);
    }
    
    public List<BookingResponse> getBookingsByUser(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new EntityNotFoundException("User not found with id: " + userId);
        }
        
        return bookingRepository.findByUserId(userId).stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }
    
    public List<BookingResponse> getBookingsByFacility(Long facilityId) {
        if (!facilityRepository.existsById(facilityId)) {
            throw new EntityNotFoundException("Facility not found with id: " + facilityId);
        }
        
        return bookingRepository.findByFacilityId(facilityId).stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }
    
    private boolean timeOverlap(LocalTime aStart, LocalTime aEnd, LocalTime bStart, LocalTime bEnd) {
        return aStart.isBefore(bEnd) && aEnd.isAfter(bStart);
    }
    
    private BookingResponse convertToResponse(Booking booking) {
        BookingResponse response = new BookingResponse();
        response.setId(booking.getId());
        response.setUserId(booking.getUser().getId());
        response.setUserName(booking.getUser().getName());
        response.setFacilityId(booking.getFacility().getId());
        response.setFacilityName(booking.getFacility().getName());
        response.setDate(booking.getDate());
        response.setStartTime(booking.getStartTime());
        response.setEndTime(booking.getEndTime());
        response.setStatus(booking.getStatus());
        response.setPurpose(booking.getPurpose());
        response.setCreatedAt(booking.getCreatedAt());
        return response;
    }
}