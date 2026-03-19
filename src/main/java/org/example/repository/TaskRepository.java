package org.example.repository;

import org.example.configurations.Status;
import org.example.entities.Task;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
@Repository
public interface TaskRepository extends MongoRepository<Task, String> {
    // Pour l'exigence : "avoir la liste de toutes les tâches reliées à ce projet"
    List<Task> findByProjectId(String projectId);

    // Pour voir les tâches assignées à un utilisateur précis (recherche dans la liste assignedUserIds)
    @Query("{ 'assignedUserIds' : ?0 }")
    List<Task> findByAssignedUserId(String userId);
    List<Task> findByStatut(Status statut);
}
