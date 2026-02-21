package com.example.booking.repository;

import com.example.booking.model.Booking;
import com.example.booking.model.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findByUserId(Long userId);
    List<Booking> findByFacilityId(Long facilityId);
    List<Booking> findByStatus(BookingStatus status);
    
    @Query("SELECT b FROM Booking b WHERE b.facility.id = :facilityId " +
           "AND b.date = :date AND b.status != 'CANCELLED'")
    List<Booking> findActiveBookingsByFacilityAndDate(
            @Param("facilityId") Long facilityId, 
            @Param("date") LocalDate date);
    
    @Query("SELECT CASE WHEN COUNT(b) > 0 THEN true ELSE false END FROM Booking b " +
           "WHERE b.facility.id = :facilityId AND b.date = :date " +
           "AND b.status != 'CANCELLED' " +
           "AND ((b.startTime <= :endTime AND b.endTime >= :startTime))")
    boolean existsConflictingBooking(
            @Param("facilityId") Long facilityId,
            @Param("date") LocalDate date,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime);
}