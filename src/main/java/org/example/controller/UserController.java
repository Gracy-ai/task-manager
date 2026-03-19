package org.example.controller;

import org.example.entities.User;
import org.example.services.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService userService;
    public UserController(UserService userService) { this.userService = userService; }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> credentials) {
        String email = credentials.get("email");
        String password = credentials.get("password");

        // 1. On récupère le token via le service existant
        String token = userService.login(email, password);

        // 2. On récupère l'utilisateur complet pour avoir son ID
        User user = userService.findByEmail(email);

        // 3. On prépare la réponse JSON avec le token ET l'ID
        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("id", user.getId()); // C'est cette donnée qui manquait à ton JS !
        response.put("email", user.getEmail());
        response.put("role", user.getRole().toString());

        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<User> create(@RequestBody User user) {
        return ResponseEntity.ok(userService.createUser(user));
    }

    @GetMapping
    public ResponseEntity<List<User>> getAll() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @GetMapping("/{id}")
    public ResponseEntity<User> getById(@PathVariable String id) {
        return ResponseEntity.ok(userService.getUser(id));
    }

    @PutMapping("/{id}/demission")
    public ResponseEntity<Map<String, String>> resign(@PathVariable String id,
                                                      @RequestParam String adminId) {
        String message = userService.setInactive(id, adminId);
        Map<String, String> response = new HashMap<>();
        response.put("message", message);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/promote")
    public ResponseEntity<Map<String, String>> promote(@PathVariable String id,
                                                       @RequestParam String adminId) {
        String message = userService.promoteToAdmin(id, adminId);

        Map<String, String> response = new HashMap<>();
        response.put("message", message);
        response.put("status", "SUCCESS");

        return ResponseEntity.ok(response);
    }
}
