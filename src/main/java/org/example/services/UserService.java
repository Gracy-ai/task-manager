package org.example.services;

import org.example.configurations.UserRole;
import org.example.entities.User;
import org.example.exceptions.BusinessException;
import org.example.repository.UserRepository;
import org.example.security.JwtUtils;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
@Service
public class UserService {
    private final UserRepository userRepo;
    private final BCryptPasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    public UserService(UserRepository userRepo, BCryptPasswordEncoder passwordEncoder, JwtUtils jwtUtils) { this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtils = jwtUtils;
    }

    public User createUser(User user) {

        if (userRepo.existsByEmail(user.getEmail())) {
            throw new RuntimeException("Cet email est déjà utilisé.");
        }

        // On récupère le mot de passe clair, on le hache, et on le remplace
        String encodedPassword = passwordEncoder.encode(user.getPassword());
        user.setPassword(encodedPassword);
        // 1. On vérifie s'il existe au moins UN utilisateur avec le rôle ADMIN en base
        boolean adminExists = userRepo.findAll().stream()
                .anyMatch(u -> UserRole.ADMIN.equals(u.getRole()));

        // 2. Si aucun ADMIN n'existe du tout
        if (!adminExists) {
            // On autorise la création du TOUT PREMIER admin
            user.setRole(UserRole.ADMIN);
        } else {
            // 3. Si un admin existe déjà, on force le rôle USER pour les nouveaux
            user.setRole(UserRole.USER);
        }

        user.setActive(true);
        return userRepo.save(user);
    }

    public List<User> getAllUsers() { return userRepo.findAll(); }

    public User getUser(String id) {
        return userRepo.findById(id).orElseThrow(() -> new RuntimeException("Utilisateur introuvable."));
    }

    public void deleteUser(String id) { userRepo.deleteById(id); }

    public String setInactive(String userId, String adminId) {
        User admin = userRepo.findById(adminId)
                .orElseThrow(() -> new RuntimeException("Vérification échouée : Admin introuvable."));

        if (!UserRole.ADMIN.equals(admin.getRole())) {
            throw new RuntimeException("Accès refusé : Seul l'administrateur système peut désactiver un compte.");
        }

        User targetUser = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable."));

        targetUser.setActive(false);
        userRepo.save(targetUser);
        return "L'utilisateur " + targetUser.getName() + " est désormais INACTIF.";
    }

    // PROMOTION : Seul un ADMIN peut promouvoir un USER en ADMIN
    public String promoteToAdmin(String targetUserId, String requesterAdminId) {
        // 1. Vérifier que celui qui demande est ADMIN
        User admin = userRepo.findById(requesterAdminId)
                .orElseThrow(() -> new RuntimeException("Administrateur demandeur introuvable."));

        if (!UserRole.ADMIN.equals(admin.getRole())) {
            throw new RuntimeException("Accès refusé : Seul un administrateur peut promouvoir un autre membre.");
        }

        // 2. Récupérer l'utilisateur à promouvoir
        User userToPromote = userRepo.findById(targetUserId)
                .orElseThrow(() -> new RuntimeException("Utilisateur cible introuvable."));

        // 3. Appliquer le rôle
        userToPromote.setRole(UserRole.ADMIN);
        userRepo.save(userToPromote);

        return "L'utilisateur " + userToPromote.getName() + " a été promu ADMIN avec succès.";
    }

    public String login(String email, String password) {
        // 1. Chercher l'utilisateur
        User user = userRepo.findAll().stream()
                .filter(u -> u.getEmail().equals(email))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        // 2. Vérifier si le compte est actif (Démission ?)
        if (!user.isActive()) {
            throw new RuntimeException("Ce compte est inactif.");
        }

        // 3. Comparer le mot de passe clair avec le hash de la BD
        if (passwordEncoder.matches(password, user.getPassword())) {
            // 4. Générer le JWT avec le rôle
            return jwtUtils.generateToken(user.getEmail(), user.getRole().toString());
        } else {
            throw new RuntimeException("Mot de passe incorrect");
        }
    }

    public User findByEmail(String email) {
        return userRepo.findAll().stream()
                .filter(u -> u.getEmail().equals(email))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé avec l'email : " + email));
    }
}

