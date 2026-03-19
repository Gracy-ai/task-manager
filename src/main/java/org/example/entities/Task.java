package org.example.entities;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;
import org.example.configurations.Status;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Document(collection = "tasks")
public class Task {
    @Id
    private String id;
    private String title;
    private String description;
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime deadDate;
    private Status statut;
    private String projectId;
    private List<String> assignedUserIds;
    private LocalDateTime updatedAt;
}
