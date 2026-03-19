package org.example.services;

import org.example.configurations.ProjectRole;
import org.example.configurations.Status;
import org.example.entities.Project;
import org.example.entities.ProjectMember;
import org.example.entities.User;
import org.example.exceptions.BusinessException;
import org.example.repository.ProjectRepository;
import org.example.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ProjectService {
    private final ProjectRepository projectRepo;
    private final UserRepository userRepo;

    public ProjectService(ProjectRepository projectRepo, UserRepository userRepo) {
        this.projectRepo = projectRepo;
        this.userRepo = userRepo;
    }

    // CREATE
    public Project createProject(Project project) {
        // Règle : Date de création automatique
        project.setCreatedAt(LocalDateTime.now());

        if (project.getMembers() == null) {
            project.setMembers(new java.util.ArrayList<>());
        }

        // Règle : Vérifier que les membres existent avant attribution
        if (project.getMembers() != null) {
            for (ProjectMember member : project.getMembers()) {
                if (!userRepo.existsById(member.getUserId())) {
                    throw new RuntimeException("L'utilisateur membre " + member.getUserId() + " n'existe pas.");
                }
            }
        }
        return projectRepo.save(project);
    }

    // READ (Celle qui manquait à votre controller)
    public Project getProject(String id) {
        return projectRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Projet introuvable avec l'id : " + id));
    }

    public List<Project> getAllProjects() {
        return projectRepo.findAll();
    }

    // UPDATE (Réservé au Chef de Projet / MANAGER)
    public Project updateProject(String projectId, Project updatedData, String requesterId) {
        // 1. On récupère le projet tel qu'il est RÉELLEMENT en base (Source de vérité)
        Project existingProject = getProject(projectId);

        // 2. CORRECTION SÉCURITÉ : On vérifie les droits sur EXISTING, pas sur UPDATED
        boolean isManager = existingProject.getMembers() != null && existingProject.getMembers().stream()
                .anyMatch(m -> m.getUserId().equals(requesterId) && ProjectRole.PROJECT_MANAGER.equals(m.getRole()));

        if (!isManager) {
            throw new RuntimeException("Action interdite : Seul le manager actuel peut modifier ce projet.");
        }

        // 3. MISE À JOUR DES CHAMPS
        existingProject.setName(updatedData.getName());
        existingProject.setDescription(updatedData.getDescription());

        // On décommente et on met à jour la date
        if (updatedData.getDeadline() != null) {
            existingProject.setDeadline(updatedData.getDeadline());
        }

        // Mise à jour des membres si fournis
        if (updatedData.getMembers() != null && !updatedData.getMembers().isEmpty()) {
            existingProject.setMembers(updatedData.getMembers());
        }

        existingProject.setUpdatedAt(LocalDateTime.now());

        // 4. SAUVEGARDE
        return projectRepo.save(existingProject);
    }

    public List<Project> getProjectsByStatus(Status status) {
        return projectRepo.findByStatus(status);
    }


    // DELETE (Soft delete)
    public String softDeleteProject(String id, String requesterId) {
        Project project = projectRepo.findById(id)
                .orElseThrow(() -> new BusinessException("Projet introuvable"));

        // Vérifier si le demandeur est bien le manager
        List<ProjectMember> members = project.getMembers();
        boolean isManager = (members != null) && members.stream()
                .anyMatch(m -> m.getUserId().equals(requesterId) && ProjectRole.PROJECT_MANAGER.equals(m.getRole()));

        if (!isManager) {
            throw new BusinessException("Seul le manager peut archiver ce projet.");
        }

        // ON NE FAIT PAS projectRepo.deleteById(id) !!
        project.setStatus(Status.INACTIF); // On change le statut
        project.setUpdatedAt(LocalDateTime.now());
        projectRepo.save(project); // ESSENTIEL : On met à jour le document existant

        return "Le projet a été marqué comme DELETED avec succès.";
    }

    // Liste des utilisateurs d'un projet
    public List<User> getUsersByProject(String projectId) {
        Project project = getProject(projectId);
        if (project.getMembers() == null) {
            return List.of();
        }
        List<String> ids = project.getMembers().stream()
                .map(ProjectMember::getUserId)
                .toList();
        return userRepo.findAllById(ids);
    }
}
