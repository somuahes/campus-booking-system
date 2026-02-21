// package com.example.booking.service;

// import com.example.booking.model.*;
// import com.example.booking.repository.BookingRepository;
// import com.example.booking.repository.FacilityRepository;
// import com.example.booking.repository.UserRepository;
// import org.springframework.boot.CommandLineRunner;
// import org.springframework.stereotype.Component;

// import java.time.LocalDate;
// import java.time.LocalTime;

// @Component
// public class DataSeeder implements CommandLineRunner {
    
//     private final UserRepository userRepository;
//     private final FacilityRepository facilityRepository;
//     private final BookingRepository bookingRepository;
    
//     public DataSeeder(UserRepository userRepository, 
//                       FacilityRepository facilityRepository,
//                       BookingRepository bookingRepository) {
//         this.userRepository = userRepository;
//         this.facilityRepository = facilityRepository;
//         this.bookingRepository = bookingRepository;
//     }
    
//     @Override
//     public void run(String... args) throws Exception {
//         // Only seed if database is empty
//         if (userRepository.count() == 0) {
//             seedUsers();
//         }
        
//         if (facilityRepository.count() == 0) {
//             seedFacilities();
//         }
        
//         if (bookingRepository.count() == 0) {
//             seedBookings();
//         }
//     }
    
//     private void seedUsers() {
//         User user1 = new User("john@university.edu", "John Doe", "password123", Role.STUDENT);
//         User user2 = new User("jane@university.edu", "Jane Smith", "password123", Role.STAFF);
//         User user3 = new User("admin@university.edu", "Admin User", "admin123", Role.ADMIN);
        
//         userRepository.save(user1);
//         userRepository.save(user2);
//         userRepository.save(user3);
        
//         System.out.println("✅ Sample users created");
//     }
    
//     private void seedFacilities() {
//         Facility facility1 = new Facility("Conference Room A", "Large conference room with projector", "Building 1, Floor 2", 20);
//         Facility facility2 = new Facility("Tennis Court", "Outdoor tennis court with lights", "Sports Complex", 4);
//         Facility facility3 = new Facility("Study Room", "Quiet study room for groups", "Library, Floor 3", 6);
//         Facility facility4 = new Facility("Auditorium", "200-seat auditorium with AV equipment", "Student Center", 200);
        
//         facilityRepository.save(facility1);
//         facilityRepository.save(facility2);
//         facilityRepository.save(facility3);
//         facilityRepository.save(facility4);
        
//         System.out.println("✅ Sample facilities created");
//     }
    
//     private void seedBookings() {
//         User user1 = userRepository.findByEmail("john@university.edu").orElse(null);
//         User user2 = userRepository.findByEmail("jane@university.edu").orElse(null);
        
//         Facility conferenceRoom = facilityRepository.findAll().get(0);
//         Facility tennisCourt = facilityRepository.findAll().get(1);
        
//         if (user1 != null && conferenceRoom != null) {
//             Booking booking1 = new Booking(
//                 user1, 
//                 conferenceRoom, 
//                 LocalDate.now().plusDays(1), 
//                 LocalTime.of(10, 0), 
//                 LocalTime.of(12, 0), 
//                 "Team meeting"
//             );
//             booking1.setStatus(BookingStatus.CONFIRMED);
//             bookingRepository.save(booking1);
//         }
        
//         if (user2 != null && tennisCourt != null) {
//             Booking booking2 = new Booking(
//                 user2, 
//                 tennisCourt, 
//                 LocalDate.now().plusDays(2), 
//                 LocalTime.of(15, 0), 
//                 LocalTime.of(17, 0), 
//                 "Tennis practice"
//             );
//             booking2.setStatus(BookingStatus.CONFIRMED);
//             bookingRepository.save(booking2);
//         }
        
//         System.out.println("✅ Sample bookings created");
//     }
// }