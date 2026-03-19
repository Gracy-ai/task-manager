// 1. SECURITÉ

const myEmail = localStorage.getItem("myEmail");
const myToken = localStorage.getItem("token");

if (localStorage.getItem("role") !== "ADMIN") {
    window.location.href = "index.html";
}

// Affichage direct
document.getElementById("admin-email-display").innerText = myEmail || "Administrateur";

// On initialise l'onglet par défaut une fois que le DOM est prêt
document.addEventListener("DOMContentLoaded", () => {
    switchTab('projects', document.getElementById('btn-projects'));
});

// 2. GESTION DES ONGLETS ET DU MENU BLEU
function switchTab(tab, btnElement) {
    const title = document.getElementById("current-title");

    // Réinitialiser tous les boutons du menu
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active-link');
        btn.style.color = "#dbeafe";;
    });

    // Activer le bouton cliqué
    if (btnElement) {
        btnElement.classList.add('active-link');
        btnElement.style.color = "#ffffff";
    }

    if (tab === 'projects') {
        title.innerText = "Gestion Globale des Projets";
        loadAdminProjects();
    } else if (tab === 'users') {
        title.innerText = "Gestion des Utilisateurs";
        loadAdminUsers();
    }
}

// 3. CHARGER LES UTILISATEURS (CORRIGÉ : Pas d'admin soi-même, pas d'inactifs, pas d'ID affiché)
async function loadAdminUsers() {
    const res = await fetch("/api/users", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    });
    const users = await res.json();
    const myId = localStorage.getItem("userId");

    // FILTRAGE : On enlève l'admin actuel ET les comptes désactivés
    const filteredUsers = users.filter(u => u.id !== myId && u.active === true);

    document.getElementById("admin-content").innerHTML = `
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table class="w-full text-left">
                <thead class="bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th class="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">Utilisateur</th>
                        <th class="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">Rôle</th>
                        <th class="p-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredUsers.map(u => `
                        <tr class="border-b border-slate-100 hover:bg-slate-50 transition">
                            <td class="p-4 font-bold text-slate-700">
                                <div class="flex flex-col">
                                    <span>${u.name || 'Utilisateur'}</span>
                                    <span class="text-xs font-normal text-slate-400">${u.email}</span>
                                </div>
                            </td>
                            <td class="p-4">
                                <span class="px-2 py-1 ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'} rounded text-[10px] font-black uppercase">
                                    ${u.role}
                                </span>
                            </td>
                            <td class="p-4">
                                <div class="flex justify-center gap-4">
                                    ${u.role !== 'ADMIN' ? `
                                        <button onclick="promoteUser('${u.id}')" class="text-blue-600 hover:font-bold text-xs transition">Promouvoir</button>
                                    ` : '<span class="text-[10px] text-slate-300 font-bold italic">Admin</span>'}
                                    <button onclick="deactivateUser('${u.id}')" class="text-red-500 hover:font-bold text-xs transition">Désactiver</button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// 4. CHARGER LES PROJETS
async function loadAdminProjects() {
    try {
        // 1. Chargement parallèle des projets de base et de la liste des utilisateurs
        const [projRes, userRes] = await Promise.all([
            fetch("/api/projects", { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }),
            fetch("/api/users", { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
        ]);

        const basicProjects = await projRes.json();
        const users = await userRes.json();

        // 2. Création du dictionnaire ID -> Nom pour l'affichage
        const idToName = {};
        users.forEach(u => idToName[u.id] = u.name || u.email);

        // 3. Récupération des détails (tâches) pour chaque projet pour s'assurer qu'elles s'affichent
        const projectsWithDetails = await Promise.all(
            basicProjects.map(async (p) => {
                const detailRes = await fetch(`/api/projects/${p.id}/details`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                });
                // Si l'appel détails fonctionne, on l'utilise, sinon on garde le projet de base
                return detailRes.ok ? await detailRes.json() : { project: p, tasks: [] };
            })
        );

        const container = document.getElementById("admin-content");

        container.innerHTML = `
            <div class="grid grid-cols-1 gap-8">
                ${projectsWithDetails.map(item => {
                    const p = item.project || item;
                    const tasks = item.tasks || [];

                    return `
                    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div class="bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-center">
                            <div>
                                <h3 class="text-xl font-black text-slate-800">${p.name}</h3>
                                <p class="text-sm text-slate-500 italic">${p.description || 'Pas de description'}</p>
                            </div>
                            <span class="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-[10px] font-black uppercase">
                                ${p.status}
                            </span>
                        </div>

                        <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h4 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <i class="fa-solid fa-users text-blue-500"></i> Membres du projet
                                </h4>
                                <div class="flex flex-wrap gap-2">
                                    ${p.members && p.members.length > 0 ? p.members.map(m => `
                                        <div class="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                            <div class="w-5 h-5 bg-white rounded-full flex items-center justify-center text-[10px] shadow-sm border border-slate-200">
                                                ${m.role === 'PROJECT_MANAGER' ? '⭐' : '👤'}
                                            </div>
                                            <span class="text-xs font-bold text-slate-700">
                                                ${idToName[m.userId] || 'Ancien membre'}
                                            </span>
                                            <span class="text-[9px] text-slate-400 uppercase font-medium">(${m.role === 'PROJECT_MANAGER' ? 'Manager' : 'Membre'})</span>
                                        </div>
                                    `).join('') : '<p class="text-xs text-slate-400 italic">Aucun membre</p>'}
                                </div>
                            </div>

                            <div>
                                <h4 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <i class="fa-solid fa-list-check text-green-500"></i> Tâches & Assignations
                                </h4>
                                <div class="space-y-3">
                                    ${tasks.length > 0 ? tasks.map(t => `
                                        <div class="p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-blue-200 transition">
                                            <div class="flex justify-between items-start mb-2">
                                                <span class="font-bold text-sm text-slate-800">${t.title}</span>
                                                <span class="text-[9px] font-black px-2 py-0.5 rounded bg-slate-100 text-slate-500 shadow-sm">${t.statut}</span>
                                            </div>
                                            <div class="flex items-center gap-2 border-t pt-2">
                                                <span class="text-[10px] text-slate-400 italic">Assigné à :</span>
                                                <span class="text-[10px] font-bold text-blue-600">
                                                    ${t.assignedUserIds ? t.assignedUserIds.map(id => idToName[id] || 'Inconnu').join(', ') : 'Personne'}
                                                </span>
                                            </div>
                                        </div>
                                    `).join('') : '<p class="text-xs text-slate-400 italic">Aucune tâche pour ce projet.</p>'}
                                </div>
                            </div>
                        </div>
                    </div>`;
                }).join('')}
            </div>`;
    } catch (err) {
        console.error("Erreur lors du chargement des projets admin :", err);
    }
}

// 5. LOGIQUE DES ACTIONS
async function promoteUser(targetId) {
    if(!confirm("Promouvoir cet utilisateur ?")) return;
    const adminId = localStorage.getItem("userId");
    const res = await fetch(`/api/users/${targetId}/promote?adminId=${adminId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    });
    if(res.ok) { alert("Succès !"); loadAdminUsers(); }
}

async function deactivateUser(targetId) {
    if(!confirm("Désactiver ce compte ?")) return;
    const adminId = localStorage.getItem("userId");
    const res = await fetch(`/api/users/${targetId}/demission?adminId=${adminId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    });
    if(res.ok) { alert("Utilisateur désactivé"); loadAdminUsers(); }
}

function logout() { localStorage.clear(); window.location.href = "login.html"; }

// Initialisation
switchTab('projects', document.getElementById('btn-projects'));