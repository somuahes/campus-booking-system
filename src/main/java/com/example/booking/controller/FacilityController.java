package com.example.booking.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.booking.model.Facility;
import com.example.booking.service.FacilityService;

@RestController
@RequestMapping("/api/facilities")
@CrossOrigin(origins = "*")
public class FacilityController {
    
    private final FacilityService facilityService;
    
    public FacilityController(FacilityService facilityService) {
        this.facilityService = facilityService;
    }
    
    @GetMapping
    public ResponseEntity<List<Facility>> getAllFacilities() {
        List<Facility> facilities = facilityService.getAllFacilities();
        return ResponseEntity.ok(facilities);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<Facility> getFacilityById(@PathVariable Long id) {
        Facility facility = facilityService.getFacilityById(id);
        return ResponseEntity.ok(facility);
    }
    
    @PostMapping
    public ResponseEntity<Facility> createFacility(@RequestBody Facility facility) {
        Facility created = facilityService.createFacility(facility);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<Facility> updateFacility(
            @PathVariable Long id, 
            @RequestBody Facility facility) {
        Facility updated = facilityService.updateFacility(id, facility);
        return ResponseEntity.ok(updated);
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFacility(@PathVariable Long id) {
        facilityService.deleteFacility(id);
        return ResponseEntity.noContent().build();
    }
    
    @GetMapping("/available")
    public ResponseEntity<List<Facility>> getAvailableFacilities() {
        List<Facility> facilities = facilityService.getAvailableFacilities();
        return ResponseEntity.ok(facilities);
    }
}