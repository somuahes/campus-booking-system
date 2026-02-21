package com.example.booking.model;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "facilities")
public class Facility {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String name;
    
    // REMOVE this line completely:
    // private String description;
    
    @Column(nullable = false)
    private String location;
    
    @Column(nullable = false)
    private Integer capacity;
    
    @Column(name = "is_available")
    private Boolean isAvailable = true;
    
    @OneToMany(mappedBy = "facility", cascade = CascadeType.ALL)
    private List<Booking> bookings = new ArrayList<>();
    
    // Constructors
    public Facility() {}
    
    public Facility(String name, String location, Integer capacity) {
        this.name = name;
        this.location = location;
        this.capacity = capacity;
    }
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    // REMOVE these getter/setter:
    // public String getDescription() { return description; }
    // public void setDescription(String description) { this.description = description; }
    
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    
    public Integer getCapacity() { return capacity; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }
    
    public Boolean getIsAvailable() { return isAvailable; }
    public void setIsAvailable(Boolean isAvailable) { this.isAvailable = isAvailable; }
    
    public List<Booking> getBookings() { return bookings; }
    public void setBookings(List<Booking> bookings) { this.bookings = bookings; }
}