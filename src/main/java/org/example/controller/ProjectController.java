package org.example.controller;

import org.example.configurations.Status;
import org.example.entities.Project;
import org.example.entities.Task;
import org.example.entities.User;
import org.example.services.ProjectService;
import org.example.services.TaskService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {
    private final ProjectService projectService;
    private final TaskService taskService;

    public ProjectController(ProjectService projectService, TaskService taskService) {
        this.projectService = projectService;
        this.taskService = taskService;
    }

    @PostMapping
    public ResponseEntity<Project> create(@RequestBody Project project) {
        return ResponseEntity.ok(projectService.createProject(project));
    }

    @GetMapping
    public ResponseEntity<List<Project>> getAll() {
        return ResponseEntity.ok(projectService.getAllProjects());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Project> getById(@PathVariable String id) {
        return ResponseEntity.ok(projectService.getProject(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Project> update(@PathVariable String id,
                                          @RequestBody Project project,
                                          @RequestParam String requesterId) {
        return ResponseEntity.ok(projectService.updateProject(id, project, requesterId));
    }

    @DeleteMapping("/{id}/soft-delete")
    public ResponseEntity<Map<String, String>> softDelete(@PathVariable String id, @RequestParam String requesterId) {
        String message = projectService.softDeleteProject(id, requesterId);

        Map<String, String> response = new HashMap<>();
        response.put("message", message);
        response.put("status", "SUCCESS");

        return ResponseEntity.ok(response);
    }

    // EXIGENCE : Voir la liste de toutes les tâches en cliquant sur un projet
    @GetMapping("/{id}/details")
    public ResponseEntity<Map<String, Object>> getProjectDetails(@PathVariable String id) {
        Project project = projectService.getProject(id);
        List<Task> tasks = taskService.getTasksByProject(id);

        Map<String, Object> response = new HashMap<>();
        response.put("project", project);
        response.put("tasks", tasks); // Liste des tâches reliées

        return ResponseEntity.ok(response);
    }

    @GetMapping("/status/{statut}")
    public ResponseEntity<List<Project>> getByStatus(@PathVariable Status statut) {
        return ResponseEntity.ok(projectService.getProjectsByStatus(statut));
    }

    @GetMapping("/{id}/users")
    public ResponseEntity<List<User>> getUsersByProject(@PathVariable String id) {
        return ResponseEntity.ok(projectService.getUsersByProject(id));
    }
}