package org.example.repository;

import org.example.configurations.Status;
import org.example.entities.Project;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
@Repository
public interface ProjectRepository extends MongoRepository<Project, String> {
    @Query("{ 'members.userId' : ?0 }")
    List<Project> findByUserId(String userId);
    List<Project> findByStatus(Status status);
}
