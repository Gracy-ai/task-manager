package org.example.entities;

import lombok.Data;
import org.example.configurations.Status;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Document(collection = "projects")
public class Project {
    @Id
    private String id;
    private String name;
    private String description;
    private List<ProjectMember> members;
    private LocalDateTime createdAt;
    private LocalDateTime deadline;
    private LocalDateTime updatedAt;
    private Status status;
}
