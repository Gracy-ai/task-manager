package org.example.services;

import org.example.configurations.ProjectRole;
import org.example.configurations.Status;
import org.example.entities.Project;
import org.example.entities.Task;
import org.example.repository.ProjectRepository;
import org.example.repository.TaskRepository;
import org.example.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class TaskService {
    private final TaskRepository taskRepo;
    private final ProjectRepository projectRepo;
    private final UserRepository userRepo;

    public TaskService(TaskRepository taskRepo, ProjectRepository projectRepo, UserRepository userRepo) {
        this.taskRepo = taskRepo;
        this.projectRepo = projectRepo;
        this.userRepo = userRepo;
    }

    public Task createTask(Task task, String managerId) {
        if (managerId == null || managerId.trim().isEmpty()) {
            throw new RuntimeException("L'identifiant du manager est manquant.");
        }

        // 1. Validations de base
        if (task.getTitle() == null || task.getTitle().isEmpty())
            throw new RuntimeException("Le nom de la tâche est obligatoire.");

        if (task.getDeadDate() == null)
            throw new RuntimeException("La date d'échéance est obligatoire.");

        if (task.getAssignedUserIds() == null || task.getAssignedUserIds().isEmpty())
            throw new RuntimeException("Au moins un membre doit être assigné.");

        // 2. Récupérer le projet
        Project project = projectRepo.findById(task.getProjectId())
                .orElseThrow(() -> new RuntimeException("Projet parent introuvable."));

        if (project.getMembers() == null) {
            throw new RuntimeException("Le projet n'a aucun membre.");
        }

        // 3. Vérifier que l'expéditeur est MANAGER
        boolean isManager = project.getMembers().stream()
                .anyMatch(m -> m.getUserId().equals(managerId) && "PROJECT_MANAGER".equals(m.getRole().toString()));

        if (!isManager) {
            throw new RuntimeException("Seul le manager du projet peut créer des tâches.");
        }

        // 4. CORRECTION : Comparaison des dates (LocalDateTime à LocalDateTime)
        if (project.getDeadline() != null) {
            // On compare les LocalDateTime directement
            if (task.getDeadDate().isAfter(project.getDeadline())) {
                throw new RuntimeException("La date de la tâche ne peut pas dépasser l'échéance du projet (" + project.getDeadline() + ")");
            }
        }

        // 5. Vérifier les utilisateurs assignés
        for (String userId : task.getAssignedUserIds()) {
            if (!userRepo.existsById(userId)) {
                throw new RuntimeException("L'utilisateur " + userId + " n'existe pas.");
            }
            boolean isMember = project.getMembers().stream().anyMatch(m -> m.getUserId().equals(userId));
            if (!isMember) {
                throw new RuntimeException("L'utilisateur " + userId + " ne fait pas partie de ce projet.");
            }
        }

        task.setCreatedAt(LocalDateTime.now());
        return taskRepo.save(task);
    }

    public List<Task> getTasksByProject(String projectId) {
        return taskRepo.findByProjectId(projectId);
    }

    public List<Task> getAllTasks() {
        return taskRepo.findAll();
    }

    public Task getTaskById(String id) {
        return taskRepo.findById(id).orElseThrow(() -> new RuntimeException("Tâche introuvable."));
    }

    public List<Task> getTasksByStatus(Status statut) {
        return taskRepo.findByStatut(statut);
    }

    public String softDeleteTask(String taskId, String requesterId) {
        // 1. Récupérer la tâche
        Task task = getTaskById(taskId);

        // 2. Récupérer le projet lié à cette tâche
        Project project = projectRepo.findById(task.getProjectId())
                .orElseThrow(() -> new RuntimeException("Projet associé introuvable."));

        // 3. Vérifier si le demandeur est le PROJECT_MANAGER de ce projet précis
        boolean isManager = project.getMembers().stream()
                .anyMatch(m -> m.getUserId().equals(requesterId) && m.getRole().equals(ProjectRole.PROJECT_MANAGER));

        if (!isManager) {
            throw new RuntimeException("Accès refusé : Seul le PROJECT_MANAGER de ce projet peut supprimer cette tâche.");
        }

        // 4. Exécuter le Soft Delete
        task.setStatut(Status.INACTIF);
        task.setUpdatedAt(LocalDateTime.now());
        taskRepo.save(task);

        return "La tâche " + taskId + " a été désactivée par le manager.";
    }

    public Task updateTask(String taskId, Task updatedData, String requesterId) {
        // 1. Récupérer la tâche existante
        Task existingTask = getTaskById(taskId);

        // 2. Récupérer le projet lié pour vérifier les droits
        Project project = projectRepo.findById(existingTask.getProjectId())
                .orElseThrow(() -> new RuntimeException("Projet associé introuvable."));

        // 3. Sécurité : Seul le PROJECT_MANAGER de ce projet peut modifier la tâche
        boolean isManager = project.getMembers().stream()
                .anyMatch(m -> m.getUserId().equals(requesterId) && m.getRole().equals(ProjectRole.PROJECT_MANAGER));

        if (!isManager) {
            throw new RuntimeException("Accès refusé : Seul le manager de ce projet peut modifier cette tâche.");
        }

        // 4. Mise à jour des champs
        existingTask.setTitle(updatedData.getTitle());
        existingTask.setDescription(updatedData.getDescription());
        existingTask.setStatut(updatedData.getStatut()); // Pour changer le statut (TODO -> DOING -> DONE)
        existingTask.setAssignedUserIds(updatedData.getAssignedUserIds());
        existingTask.setDeadDate(updatedData.getDeadDate());

        // 5. Update automatique de la date de modification
        existingTask.setUpdatedAt(LocalDateTime.now());

        return taskRepo.save(existingTask);
    }
}
