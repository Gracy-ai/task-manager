package org.example.controller;

import org.example.configurations.Status;
import org.example.entities.Task;
import org.example.services.TaskService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {
    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @PostMapping
    public ResponseEntity<Task> create(@RequestBody Task task, @RequestParam String managerId) {
        return ResponseEntity.ok(taskService.createTask(task, managerId));
    }

    @GetMapping
    public ResponseEntity<List<Task>> getAll() {
        return ResponseEntity.ok(taskService.getAllTasks());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Task> getById(@PathVariable String id) {
        return ResponseEntity.ok(taskService.getTaskById(id));
    }

    @DeleteMapping("/{id}/soft-delete")
    public ResponseEntity<Map<String, String>> softDelete(@PathVariable String id,
                                                          @RequestParam String requesterId) {
        // On passe maintenant le requesterId au service
        String message = taskService.softDeleteTask(id, requesterId);

        Map<String, String> response = new HashMap<>();
        response.put("message", message);
        response.put("status", "SUCCESS");

        return ResponseEntity.ok(response);
    }

    @GetMapping("/status/{statut}")
    public ResponseEntity<List<Task>> getByStatus(@PathVariable Status statut) {
        return ResponseEntity.ok(taskService.getTasksByStatus(statut));
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<Task>> getByProject(@PathVariable String projectId) {
        return ResponseEntity.ok(taskService.getTasksByProject(projectId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Task> update(@PathVariable String id,
                                       @RequestBody Task task,
                                       @RequestParam String requesterId) {
        return ResponseEntity.ok(taskService.updateTask(id, task, requesterId));
    }
}