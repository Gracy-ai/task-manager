const API_BASE = "/api/projects";
const USER_API = "/api/users";
const TASK_API = "/api/tasks"; // Vérifiez que votre controller Task a ce mapping

// 1. SECURITÉ & INITIALISATION
const token = localStorage.getItem("token");
const role = localStorage.getItem("role");

if (!token) {
    window.location.href = "login.html";
}

// Si un ADMIN essaie d'aller sur l'interface simple, on le renvoie vers son panel
if (role === "ADMIN") {
    window.location.href = "admin.html";
}

document.getElementById("user-display").innerText = localStorage.getItem("myEmail");;

function switchTab(tab, btnElement) {
    const title = document.getElementById("current-title");

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active-link');
        btn.style.color = "#dbeafe";
    });

    if (btnElement) {
        btnElement.classList.add('active-link');
       btnElement.style.color = "#ffffff";
    }

    if (tab === 'my-projects') {
        title.innerText = "Mes Projets";
        loadProjects(true); // true = filtrer mes projets
    } else if (tab === 'all-projects') {
        title.innerText = "Tous les Projets de l'Entreprise";
        loadProjects(false); // false = tout voir
    }
}

// Fonction loadProjects unique et intelligente
async function loadProjects(filterOnlyMine = false) {
    try {
        const res = await fetch(API_BASE, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        const projects = await res.json();
        const grid = document.getElementById("project-grid");
        const myId = localStorage.getItem("userId");

        // 1. On filtre d'abord les projets actifs
        let displayProjects = projects.filter(p => p.status !== 'INACTIF');

        // 2. Si l'utilisateur a cliqué sur "Mes Projets", on filtre par appartenance
        if (filterOnlyMine) {
            displayProjects = displayProjects.filter(p =>
                p.members && p.members.some(m => m.userId === myId)
            );
        }

        if (displayProjects.length === 0) {
            grid.innerHTML = `<div class="col-span-full text-center py-20 text-slate-400 italic">Aucun projet trouvé dans cette section.</div>`;
            return;
        }

        grid.innerHTML = displayProjects.map(p => {
            // Vérifier si je suis le manager pour afficher les boutons d'édition/suppression
            const isManager = p.members && p.members.some(m => m.userId === myId && m.role === 'PROJECT_MANAGER');

            return `
            <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                <div class="flex justify-between items-start mb-4">
                    <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-xl">
                        <i class="fa-solid fa-folder"></i>
                    </div>
                    <span class="px-2 py-1 bg-blue-100 text-blue-600 rounded-lg text-[10px] font-black uppercase">${p.status}</span>
                </div>
                <h3 class="text-lg font-black text-slate-800 mb-1">${p.name}</h3>
                <p class="text-sm text-slate-400 line-clamp-2 mb-6">${p.description || 'Pas de description'}</p>

                <div class="flex justify-between items-center border-t pt-4">
                    <div class="flex gap-4">
                         <i title="Détails" class="fa-solid fa-circle-info cursor-pointer text-blue-500 hover:scale-125 transition" onclick="showProjectDetails('${p.id}')"></i>
                         ${isManager ? `<i title="Modifier" class="fa-solid fa-pen-to-square cursor-pointer text-amber-500 hover:scale-125 transition" onclick="openEditProjectModal('${p.id}')"></i>` : ''}
                    </div>
                    ${isManager ? `<i title="Supprimer" class="fa-solid fa-trash-can cursor-pointer text-red-400 hover:text-red-600 transition" onclick="deleteProject('${p.id}')"></i>` : ''}
                </div>
            </div>`;
        }).join("");
    } catch (e) {
        console.error("Erreur chargement projets:", e);
    }
}

// 3. CHARGEMENT DES UTILISATEURS (SANS MOI-MÊME)
async function loadUsers() {
    const res = await fetch(USER_API, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    });
    const users = await res.json();
    const select = document.getElementById("new-project-members");
    const myEmail = localStorage.getItem("myEmail");

    // On filtre pour ne pas s'inviter soi-même (on sera ajouté en tant que MANAGER auto)
    const others = users.filter(u => u.active === true && u.email !== myEmail);

    select.innerHTML = others.map(u =>
        `<option value="${u.id}">${u.email}</option>`
    ).join("");
}

// 4. CRÉATION DE PROJET (AVEC MANAGER AUTO)
document.getElementById("create-project-form").addEventListener("submit", async e => {
    e.preventDefault();

    const myId = localStorage.getItem("userId");

    // 1. On récupère les autres membres (ceux cochés dans la liste)
    let members = Array.from(document.getElementById("new-project-members").selectedOptions)
        .map(o => ({
            userId: o.value,
            role: "MEMBER"
        }));

    // 2. ON AJOUTE LE CRÉATEUR AVEC LE RÔLE MANAGER
    // C'est cette ligne qui fait de toi le PROJECT_MANAGER
    members.push({
        userId: myId,
        role: "PROJECT_MANAGER"
    });

    const payload = {
        name: document.getElementById("new-project-name").value,
        description: document.getElementById("new-project-desc").value,
        deadline: document.getElementById("new-project-deadline").value + "T00:00:00",
        members: members, // La liste contient maintenant toi + les autres
        status: "ACTIF"
    };

    const res = await fetch(API_BASE, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        closeCreateModal();
        loadProjects();
        document.getElementById("create-project-form").reset();
    } else {
        const err = await res.text();
        alert("Erreur lors de la création : " + err);
    }
});

// 4. MODIFIER UN PROJET (FONCTION MANQUANTE)
async function openEditProjectModal(projectId) {
    try {
        const res = await fetch(`${API_BASE}/${projectId}/details`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        const p = data.project || data;

        document.getElementById("modal-title").innerText = "Modifier le projet";
        document.getElementById("modal-content").innerHTML = `
            <form id="edit-project-form" class="space-y-4">
                <input id="ep-name" value="${p.name}" required class="w-full p-3 border-2 rounded-xl focus:border-blue-500 outline-none">
                <textarea id="ep-desc" class="w-full p-3 border-2 rounded-xl focus:border-blue-500 outline-none">${p.description || ''}</textarea>
                <select id="ep-status" class="w-full p-3 border-2 rounded-xl focus:border-blue-500 outline-none font-bold">
                    <option value="ACTIF" ${p.status === 'ACTIF' ? 'selected' : ''}>ACTIF</option>
                    <option value="COMPLETED" ${p.status === 'COMPLETED' ? 'selected' : ''}>COMPLETED</option>
                    <option value="PENDING" ${p.status === 'PENDING' ? 'selected' : ''}>PENDING</option>
                </select>
                <div class="flex justify-end gap-3 pt-4 border-t">
                    <button type="button" onclick="closeModal()" class="px-5 py-2 font-bold text-slate-400">Annuler</button>
                    <button type="submit" class="bg-amber-500 text-white px-8 py-2 rounded-xl font-bold">Enregistrer</button>
                </div>
            </form>
        `;
        document.getElementById("modal-overlay").classList.remove("hidden");

        document.getElementById("edit-project-form").onsubmit = async (e) => {
            e.preventDefault();
            const payload = {
                ...p,
                name: document.getElementById("ep-name").value,
                description: document.getElementById("ep-desc").value,
                status: document.getElementById("ep-status").value
            };

            const upRes = await fetch(`${API_BASE}/${projectId}?requesterId=${localStorage.getItem("userId")}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload)
            });

            if (upRes.ok) {
                closeModal();
                loadProjects(true);
            }
        };
    } catch (e) { alert("Erreur de chargement"); }
}

// 5. SUPPRESSION (SOFT DELETE)
async function deleteProject(projectId) {
    const requesterId = localStorage.getItem("userId");
if (!requesterId || requesterId === "undefined") {
        alert("Action impossible : ID utilisateur introuvable.");
        return;
    }
    if (!confirm("Voulez-vous vraiment archiver ce projet ?")) return;

    try {
        const res = await fetch(`${API_BASE}/${projectId}/soft-delete?requesterId=${requesterId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });

        if (res.ok) {
            alert("Projet archivé !");
            loadProjects();
        } else {
            const err = await res.json();
            alert("Erreur : " + (err.message || "Vous n'êtes pas le manager de ce projet."));
        }
    } catch (e) {
        alert("Erreur de connexion au serveur.");
    }
}

// 6. AJOUT DE TÂCHE RAPIDE
async function promptAddTask(projectId) {
    try {
        // 1. Chargement des données
        const [projectRes, usersRes] = await Promise.all([
            fetch(`${API_BASE}/${projectId}/details`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
            }),
            fetch(USER_API, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
            })
        ]);

        if (!projectRes.ok || !usersRes.ok) {
            throw new Error("Erreur lors de la récupération des données serveurs");
        }

        const projectData = await projectRes.json();
        const allUsers = await usersRes.json();

        // Création du dictionnaire ID -> Email
        const idToEmail = {};
        allUsers.forEach(u => idToEmail[u.id] = u.email);

        // --- VERIFICATION CRUCIALE ---
        // On vérifie si les membres sont dans projectData.project.members ou projectData.members
        const projectInfo = projectData.project || projectData;
        const members = projectInfo.members || [];

        const membersOptions = members.map(m => {
            const email = idToEmail[m.userId] || "Utilisateur inconnu";
            return `<option value="${m.userId}">${email}</option>`;
        }).join('');

        // 2. Mise à jour de l'interface
        document.getElementById("modal-title").innerText = "Nouvelle Tâche";
        document.getElementById("modal-content").innerHTML = `
            <form id="task-form" class="space-y-4">
                <input id="t-title" placeholder="Titre de la tâche" required
                       class="w-full p-3 border-2 rounded-xl focus:border-blue-500 outline-none">

                <textarea id="t-desc" placeholder="Description"
                          class="w-full p-3 border-2 rounded-xl focus:border-blue-500 outline-none"></textarea>

                <div>
                    <label class="text-xs font-bold text-slate-400 ml-1">ÉCHÉANCE</label>
                    <input type="date" id="t-date" required
                           class="w-full p-3 border-2 rounded-xl focus:border-blue-500 outline-none">
                </div>

                <div>
                    <label class="text-xs font-bold text-slate-400 ml-1">ASSIGNER À</label>
                    <select id="t-users" multiple required
                            class="w-full p-3 border-2 rounded-xl h-32 focus:border-blue-500 outline-none">
                        ${membersOptions}
                    </select>
                </div>

                <div class="flex justify-end gap-3 pt-4 border-t">
                    <button type="button" onclick="showProjectDetails('${projectId}')"
                            class="px-5 py-2 font-bold text-slate-400 hover:text-slate-600 transition">
                        Annuler
                    </button>
                    <button type="submit"
                            class="bg-blue-600 text-white px-8 py-2 rounded-xl font-bold shadow-md hover:bg-blue-700 transition">
                        Créer la tâche
                    </button>
                </div>
            </form>
        `;

        // 3. Gestion de la soumission
        document.getElementById("task-form").onsubmit = async (e) => {
            e.preventDefault();
            const myId = localStorage.getItem("userId");

            const payload = {
                title: document.getElementById("t-title").value,
                description: document.getElementById("t-desc").value,
                deadDate: document.getElementById("t-date").value + "T23:59:59",
                projectId: projectId,
                statut: "PENDING",
                assignedUserIds: Array.from(document.getElementById("t-users").selectedOptions).map(o => o.value)
            };

            const res = await fetch(`${TASK_API}?managerId=${myId}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                showProjectDetails(projectId);
            } else {
                const err = await res.json();
                alert("Erreur : " + (err.message || "Impossible de créer la tâche"));
            }
        };

    } catch (err) {
        console.error(err);
        alert("Erreur lors de l'ouverture du formulaire : " + err.message);
    }
}

// 7. DÉTAILS DU PROJET
async function showProjectDetails(id) {
    try {
        const [projectRes, usersRes] = await Promise.all([
            fetch(`${API_BASE}/${id}/details`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }),
            fetch(USER_API, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
        ]);

        const data = await projectRes.json();
        const allUsers = await usersRes.json();
        const idToEmail = {};
        allUsers.forEach(u => idToEmail[u.id] = u.email);

        const statusStyles = {
            'PENDING': 'bg-orange-100 text-orange-600',
            'ACTIF': 'bg-blue-100 text-blue-600',
            'COMPLETED': 'bg-green-100 text-green-600'
        };

        document.getElementById("modal-title").innerText = data.project.name;
        document.getElementById("modal-content").innerHTML = `
            <div class="space-y-6">
                <div class="bg-slate-50 p-4 rounded-xl border-l-4 border-blue-500 italic text-slate-600">
                    ${data.project.description || 'Aucune description'}
                </div>

                <div class="flex justify-between items-center border-b pb-2">
                    <h4 class="font-black text-lg text-slate-800">Tâches (${data.tasks.length})</h4>
                    <button onclick="promptAddTask('${id}')"
                            class="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-2 rounded-lg font-bold transition flex items-center gap-2 shadow-sm">
                        <i class="fa-solid fa-plus"></i> Nouvelle tâche
                    </button>
                </div>

                <div class="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    ${data.tasks.length > 0 ? data.tasks.map(t => `
                        <div class="p-4 border-2 rounded-xl bg-white shadow-sm flex justify-between items-center group hover:border-blue-200 transition">
                            <div>
                                <span class="font-bold block text-slate-800">${t.title}</span>
                                <span class="text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${statusStyles[t.statut] || 'bg-slate-100'}">
                                    ${t.statut}
                                </span>
                            </div>
                            <div class="flex gap-3 text-lg opacity-0 group-hover:opacity-100 transition">
                                <i title="Modifier" class="fa-solid fa-pen-to-square text-amber-500 cursor-pointer hover:scale-125"
                                   onclick="openEditTaskModal('${t.id}', '${id}')"></i>
                                <i title="Supprimer" class="fa-solid fa-trash text-red-400 cursor-pointer hover:scale-125"
                                   onclick="deleteTask('${t.id}', '${id}')"></i>
                            </div>
                        </div>
                    `).join('') : '<p class="text-slate-400 text-center py-6 italic">Aucune tâche pour le moment.</p>'}
                </div>
            </div>`;
        document.getElementById("modal-overlay").classList.remove("hidden");
    } catch (e) {
        alert("Erreur lors du chargement des détails.");
    }
}

// AJOUTER AUSSI LA FONCTION DE SUPPRESSION
async function deleteTask(taskId, projectId) {
    const myId = localStorage.getItem("userId");
    if (!confirm("Supprimer cette tâche ?")) return;

    // L'URL doit être /api/tasks/{id}/soft-delete?requesterId={myId}
    const res = await fetch(`${TASK_API}/${taskId}/soft-delete?requesterId=${myId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    });

    if (res.ok) {
        showProjectDetails(projectId);
    } else {
        alert("Action interdite ou erreur serveur.");
    }
}

async function openEditTaskModal(taskId, projectId) {
    try {
        const res = await fetch(`${TASK_API}/${taskId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        const task = await res.json();

        // Récupérer mon ID pour la vérification manager côté Backend
        const myId = localStorage.getItem("userId");

        document.getElementById("modal-title").innerText = "Modifier la tâche";
        document.getElementById("modal-content").innerHTML = `
            <form id="edit-task-form" class="space-y-4">
                <input id="et-title" value="${task.title}" required class="w-full p-3 border-2 rounded-xl focus:border-blue-500 outline-none">
                <textarea id="et-desc" class="w-full p-3 border-2 rounded-xl focus:border-blue-500 outline-none">${task.description || ''}</textarea>

                <label class="text-xs font-bold text-slate-500 uppercase ml-1">Statut :</label>
                <select id="et-status" class="w-full p-3 border-2 rounded-xl focus:border-blue-500 outline-none font-bold">
                    <option value="PENDING" ${task.statut === 'PENDING' ? 'selected' : ''}>PENDING</option>
                    <option value="ACTIF" ${task.statut === 'ACTIF' ? 'selected' : ''}>ACTIF</option>
                    <option value="COMPLETED" ${task.statut === 'COMPLETED' ? 'selected' : ''}>COMPLETED</option>
                </select>

                <div class="flex justify-end gap-3 pt-4 border-t">
                    <button type="button" onclick="showProjectDetails('${projectId}')" class="px-5 py-2 font-bold text-slate-400">Retour</button>
                    <button type="submit" class="bg-blue-600 text-white px-8 py-2 rounded-xl font-bold shadow-md hover:bg-blue-700 transition">
                        Enregistrer les modifications
                    </button>
                </div>
            </form>
        `;

        document.getElementById("edit-task-form").onsubmit = async (e) => {
            e.preventDefault();

            const payload = {
                ...task,
                title: document.getElementById("et-title").value,
                description: document.getElementById("et-desc").value,
                statut: document.getElementById("et-status").value,
                updatedAt: new Date().toISOString()
            };

            // AJOUT DU PARAMÈTRE requesterId DANS L'URL
            const upRes = await fetch(`${TASK_API}/${taskId}?requesterId=${myId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify(payload)
            });

            if (upRes.ok) {
                alert("Tâche mise à jour avec succès !");
                showProjectDetails(projectId);
            } else {
                const errorData = await upRes.json();
                alert("Erreur : " + (errorData.message || "Seul le manager peut modifier cette tâche."));
            }
        };
    } catch (e) {
        alert("Erreur de chargement.");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    switchTab('all-projects', document.getElementById('btn-all-projects'));
});
// 8. UTILITAIRES MODALES
function openCreateModal() {
    loadUsers();
    document.getElementById("create-modal-overlay").classList.remove("hidden");
}
function closeCreateModal() { document.getElementById("create-modal-overlay").classList.add("hidden"); }
function closeModal() { document.getElementById("modal-overlay").classList.add("hidden"); }
function logout() { localStorage.clear(); window.location.href = "login.html"; }

// Lancement au démarrage
loadProjects();