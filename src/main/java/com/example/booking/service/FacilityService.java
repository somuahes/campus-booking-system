package com.example.booking.service;

import com.example.booking.model.Facility;
import com.example.booking.repository.FacilityRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class FacilityService {
    
    private final FacilityRepository facilityRepository;
    
    public FacilityService(FacilityRepository facilityRepository) {
        this.facilityRepository = facilityRepository;
    }
    
    public List<Facility> getAllFacilities() {
        return facilityRepository.findAll();
    }
    
    public Facility getFacilityById(Long id) {
        return facilityRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Facility not found with id: " + id));
    }
    
    @Transactional
    public Facility createFacility(Facility facility) {
        // Ensure new facility is created (not updating)
        facility.setId(null);
        return facilityRepository.save(facility);
    }
    
    @Transactional
    public Facility updateFacility(Long id, Facility facilityDetails) {
        Facility facility = getFacilityById(id);
        
        facility.setName(facilityDetails.getName());
        facility.setLocation(facilityDetails.getLocation());
        facility.setCapacity(facilityDetails.getCapacity());
        facility.setIsAvailable(facilityDetails.getIsAvailable());
        
        return facilityRepository.save(facility);
    }
    
    @Transactional
    public void deleteFacility(Long id) {
        if (!facilityRepository.existsById(id)) {
            throw new EntityNotFoundException("Facility not found with id: " + id);
        }
        facilityRepository.deleteById(id);
    }
    
    public List<Facility> getAvailableFacilities() {
        return facilityRepository.findByIsAvailableTrue();
    }
}