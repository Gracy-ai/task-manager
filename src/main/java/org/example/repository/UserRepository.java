package org.example.repository;

import org.example.entities.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserRepository extends MongoRepository<User, String> {
    boolean existsByEmail(String email);
    @Query("{ 'id': { $in: ?0 } }")
    List<User> findUsersByIds(List<String> userIds);
}
