const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwDE17Wx5_JRvewxqLEoj4N_vH_LyyPRgvW-2N6GQrDzy-wNNTC3UD0mQuqhNVh1gHx3Q/exec';

console.log("script.js загружен");

let currentUser = null;
let allUsers = [];
let votingPeriod = null;
let cookStarVoted = false;
let cookPigVoted = false;
let waiterStarVoted = false;
let waiterPigVoted = false;

document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM полностью загружен");

    try {
        await loadUsersForAutocomplete();
        await loadVotingPeriod();
        checkExistingUser();
        updateCooksList();
        updateWaitersList();

        // Привязка событий
        document.getElementById('registerButton').addEventListener('click', register);
        document.getElementById('voteWaiterStar').addEventListener('click', () => vote('waiter', 'star'));
        document.getElementById('voteWaiterPig').addEventListener('click', () => vote('waiter', 'pig'));
        document.getElementById('voteCookStar').addEventListener('click', () => vote('cook', 'star'));
        document.getElementById('voteCookPig').addEventListener('click', () => vote('cook', 'pig'));
        document.getElementById('adminButton').addEventListener('click', showAdminPage);
        document.getElementById('adminLoginButton').addEventListener('click', adminLogin);
        document.getElementById('backToMainButton').addEventListener('click', backToMainPage);
        document.getElementById('setVotingPeriodButton').addEventListener('click', setVotingPeriod);
        document.getElementById('clearDatabaseButton').addEventListener('click', showClearDatabaseModal);
        document.getElementById('confirmClearDatabaseButton').addEventListener('click', clearDatabase);
        document.getElementById('cancelClearDatabaseButton').addEventListener('click', closeClearDatabaseModal);
        document.getElementById('refreshDataButton').addEventListener('click', refreshAllData);
    } catch (error) {
        console.error("Ошибка при инициализации:", error);
        alert("Не удалось загрузить данные. Проверьте консоль для деталей.");
    }
});

function normalizeString(str) {
    return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

async function updateUserCache(user) {
    allUsers = allUsers.filter(u => u.id !== user.id);
    allUsers.push(user);
    try {
        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'updateUsers', users: allUsers })
        });
        const result = await response.json();
        if (result.error) {
            throw new Error(result.error);
        }
        console.log("Пользователи успешно обновлены:", result);
    } catch (error) {
        console.error("Ошибка при обновлении пользователей:", error);
        throw error;
    }
}

async function loadUsersForAutocomplete() {
    try {
        const response = await fetch(`${WEB_APP_URL}?action=getUsers`);
        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }
        allUsers = data.users || [];
        console.log("Пользователи загружены:", allUsers);
    } catch (error) {
        console.error("Ошибка при загрузке пользователей:", error);
        throw error;
    }
}

async function loadVotingPeriod() {
    try {
        const response = await fetch(`${WEB_APP_URL}?action=getVotingPeriod`);
        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }
        votingPeriod = data.period;
        displayVotingPeriod();
        console.log("Период голосования загружен:", votingPeriod);
    } catch (error) {
        console.error("Ошибка при загрузке периода голосования:", error);
        throw error;
    }
}

function displayVotingPeriod() {
    const votingPeriodDiv = document.getElementById('votingPeriod');
    if (!votingPeriod) {
        votingPeriodDiv.innerHTML = '<p>Период голосования не установлен.</p>';
        return;
    }
    const startDate = new Date(votingPeriod.start);
    const endDate = new Date(votingPeriod.end);
    votingPeriodDiv.innerHTML = `<p>Голосование открыто с ${startDate.toLocaleString()} до ${endDate.toLocaleString()}</p>`;
}

function canVote() {
    if (!votingPeriod) return false;
    const now = new Date();
    const start = new Date(votingPeriod.start);
    const end = new Date(votingPeriod.end);
    return now >= start && now <= end;
}

function updateAutocomplete(role, voteType) {
    const inputId = `${role}Input${voteType === 'star' ? 'Star' : 'Pig'}`;
    const suggestionsId = `${role}sSuggestions${voteType === 'star' ? 'Star' : 'Pig'}`;
    const input = document.getElementById(inputId);
    const suggestionsDiv = document.getElementById(suggestionsId);
    const searchTerm = normalizeString(input.value);

    suggestionsDiv.innerHTML = '';

    if (!searchTerm) {
        suggestionsDiv.classList.remove('active');
        return;
    }

    const filteredUsers = allUsers.filter(user => user.role === role && user.registered);
    const matches = filteredUsers.filter(user => {
        const fullName1 = `${user.surname} ${user.name}`;
        const fullName2 = `${user.name} ${user.surname}`;
        return normalizeString(fullName1).includes(searchTerm) || normalizeString(fullName2).includes(searchTerm);
    });

    if (matches.length === 0) {
        suggestionsDiv.classList.remove('active');
        return;
    }

    matches.forEach(user => {
        const fullName = `${user.surname} ${user.name}`;
        const suggestionItem = document.createElement('div');
        suggestionItem.textContent = fullName;
        suggestionItem.addEventListener('click', () => {
            input.value = fullName;
            suggestionsDiv.innerHTML = '';
            suggestionsDiv.classList.remove('active');
        });
        suggestionsDiv.appendChild(suggestionItem);
    });

    suggestionsDiv.classList.add('active');
}

function checkExistingUser() {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        document.getElementById('registration').style.display = 'none';
        document.getElementById('voting').style.display = 'block';
        document.getElementById('myVotes').style.display = 'block';
        document.getElementById('userInfo').textContent = `${currentUser.role === 'cook' ? 'Повар' : 'Официант'} ${currentUser.surname} ${currentUser.name}`;
        cookStarVoted = currentUser.hasVotedCookStar;
        cookPigVoted = currentUser.hasVotedCookPig;
        waiterStarVoted = currentUser.hasVotedWaiterStar;
        waiterPigVoted = currentUser.hasVotedWaiterPig;
        updateMyVotes();
        updateVotingSections();
    }
}

async function register() {
    try {
        if (localStorage.getItem('currentUser')) {
            alert('Вы уже зарегистрированы!');
            return;
        }

        const role = document.getElementById('role').value;
        const surname = document.getElementById('surname').value;
        const name = document.getElementById('name').value;

        if (!role || !surname || !name) {
            alert('Заполните все поля!');
            return;
        }

        const normalizedSurname = normalizeString(surname);
        const normalizedName = normalizeString(name);

        const existingUser = allUsers.find(u => 
            (u.normalizedSurname === normalizedSurname && u.normalizedName === normalizedName) ||
            (u.normalizedSurname === normalizedName && u.normalizedName === normalizedSurname)
        );

        let userId;
        if (existingUser) {
            if (existingUser.registered) {
                alert('Пользователь уже зарегистрирован!');
                return;
            }
            userId = existingUser.id;
            currentUser = { 
                id: userId, 
                role, 
                surname: existingUser.surname,
                name: existingUser.name,
                normalizedSurname,
                normalizedName,
                hasVotedCookStar: false,
                hasVotedCookPig: false,
                hasVotedWaiterStar: false,
                hasVotedWaiterPig: false,
                registered: true 
            };
        } else {
            userId = Date.now().toString();
            currentUser = {
                id: userId,
                role,
                surname,
                name,
                normalizedSurname,
                normalizedName,
                hasVotedCookStar: false,
                hasVotedCookPig: false,
                hasVotedWaiterStar: false,
                hasVotedWaiterPig: false,
                registered: true
            };
            allUsers.push(currentUser);
            await updateUserCache(currentUser);
        }

        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        document.getElementById('registration').style.display = 'none';
        
        const modal = document.getElementById('votingRulesModal');
        modal.style.display = 'block';
        
        document.getElementById('modalOkButton').onclick = () => {
            modal.style.display = 'none';
            document.getElementById('voting').style.display = 'block';
            document.getElementById('myVotes').style.display = 'block';
            document.getElementById('userInfo').textContent = `${role === 'cook' ? 'Повар' : 'Официант'} ${currentUser.surname} ${currentUser.name}`;
            updateMyVotes();
            updateVotingSections();
        };
    } catch (error) {
        console.error("Ошибка при регистрации:", error);
        alert("Произошла ошибка: " + error.message);
    }
}

async function vote(targetRole, voteType) {
    try {
        if (!currentUser || !canVote()) {
            alert(!currentUser ? 'Сначала зарегистрируйтесь!' : 'Голосование недоступно!');
            return;
        }

        const targetInput = document.getElementById(`${targetRole}Input${voteType === 'star' ? 'Star' : 'Pig'}`);
        const fullName = targetInput.value.trim();
        if (!fullName) {
            alert(`Введите ${targetRole === 'waiter' ? 'официанта' : 'повара'}!`);
            return;
        }

        const [surname, name] = fullName.split(/\s+/).filter(Boolean);
        if (!surname || !name) {
            alert('Введите полное имя (Фамилия Имя)!');
            return;
        }

        const normalizedSurname = normalizeString(surname);
        const normalizedName = normalizeString(name);
        const existingUser = allUsers.find(u => 
            (u.normalizedSurname === normalizedSurname && u.normalizedName === normalizedName) ||
            (u.normalizedSurname === normalizedName && u.normalizedName === normalizedSurname)
        );

        if (!existingUser && currentUser.surname === surname && currentUser.name === name) {
            alert('Нельзя голосовать за себя!');
            return;
        }

        const voteKey = `hasVoted${targetRole === 'waiter' ? 'Waiter' : 'Cook'}${voteType === 'star' ? 'Star' : 'Pig'}`;
        if (currentUser[voteKey]) {
            alert(`Вы уже проголосовали за ${targetRole === 'waiter' ? 'официанта' : 'повара'} этим символом!`);
            return;
        }

        const targetUser = existingUser || {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            role: targetRole,
            surname,
            name,
            normalizedSurname,
            normalizedName,
            hasVotedCookStar: false,
            hasVotedCookPig: false,
            hasVotedWaiterStar: false,
            hasVotedWaiterPig: false,
            registered: false
        };

        const cachedVotes = JSON.parse(localStorage.getItem(`votes_${currentUser.id}`) || '[]');
        const existingVote = cachedVotes.some(v => v.vote.to === targetUser.id && v.vote.type === voteType);
        if (existingVote) {
            alert('Вы уже голосовали за этого человека этим символом!');
            return;
        }

        if (!existingUser) {
            allUsers.push(targetUser);
            await updateUserCache(targetUser);
        }

        const newVote = {
            from: currentUser.id,
            to: targetUser.id,
            type: voteType,
            targetRole,
            timestamp: new Date().toISOString()
        };
        cachedVotes.push({ vote: newVote, user: targetUser });
        localStorage.setItem(`votes_${currentUser.id}`, JSON.stringify(cachedVotes));

        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'addVote', vote: newVote })
        });
        const result = await response.json();
        if (result.error) {
            throw new Error(result.error);
        }

        currentUser[voteKey] = true;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        await updateUserCache(currentUser);

        if (targetRole === 'cook') {
            if (voteType === 'star') cookStarVoted = true;
            if (voteType === 'pig') cookPigVoted = true;
        } else {
            if (voteType === 'star') waiterStarVoted = true;
            if (voteType === 'pig') waiterPigVoted = true;
        }

        const voteSymbol = voteType === 'star' ? '★' : '🐷';
        document.getElementById('voteMessage').textContent = `Вы проголосовали за ${targetUser.surname} ${targetUser.name} и дали ему ${voteSymbol}`;
        targetInput.value = '';

        updateMyVotes();
        updateVotingSections();
    } catch (error) {
        console.error("Ошибка при голосовании:", error);
        alert("Произошла ошибка: " + error.message);
    }
}

function updateMyVotes() {
    const cachedVotes = JSON.parse(localStorage.getItem(`votes_${currentUser.id}`) || '[]');
    if (cachedVotes.length > 0) {
        displayVotes(cachedVotes, document.getElementById('myVotesDisplay'));
        return;
    }
    document.getElementById('myVotesDisplay').textContent = 'Вы еще не голосовали.';
}

function displayVotes(votes, element) {
    element.innerHTML = '';
    if (votes.length === 0) {
        element.textContent = 'Вы еще не голосовали.';
        return;
    }
    votes.forEach(({ vote, user }) => {
        const div = document.createElement('div');
        div.textContent = `${user.role === 'cook' ? 'Повар' : 'Официант'} ${user.surname} ${user.name}: ${vote.type === 'star' ? '★' : '🐷'}`;
        element.appendChild(div);
    });
}

function updateCooksList() {
    const cooks = allUsers.filter(user => user.role === 'cook' && user.registered);
    displayList(cooks, document.getElementById('cooksList'));
}

function updateWaitersList() {
    const waiters = allUsers.filter(user => user.role === 'waiter' && user.registered);
    displayList(waiters, document.getElementById('waitersList'));
}

function displayList(users, element) {
    element.innerHTML = '';
    if (users.length === 0) {
        element.textContent = 'Нет зарегистрированных пользователей.';
        return;
    }
    users.forEach((user, index) => {
        const div = document.createElement('div');
        div.textContent = `${index + 1}. ${user.surname} ${user.name}`;
        element.appendChild(div);
    });
}

function updateVotingSections() {
    const voteSection = document.getElementById('voting');
    const listsSection = document.getElementById('lists');
    const waiterStarSection = document.getElementById('waiterStarSection');
    const waiterPigSection = document.getElementById('waiterPigSection');
    const cookStarSection = document.getElementById('cookStarSection');
    const cookPigSection = document.getElementById('cookPigSection');

    waiterStarSection.style.display = waiterStarVoted ? 'none' : 'block';
    waiterPigSection.style.display = waiterPigVoted ? 'none' : 'block';
    cookStarSection.style.display = cookStarVoted ? 'none' : 'block';
    cookPigSection.style.display = cookPigVoted ? 'none' : 'block';

    if (cookStarVoted && cookPigVoted && waiterStarVoted && waiterPigVoted) {
        voteSection.style.display = 'none';
        listsSection.style.display = 'block';
        updateCooksList();
        updateWaitersList();
    } else {
        listsSection.style.display = 'none';
    }
}

function showAdminPage() {
    document.getElementById('mainPage').style.display = 'none';
    document.getElementById('adminPage').style.display = 'block';
}

function backToMainPage() {
    document.getElementById('adminPage').style.display = 'none';
    document.getElementById('mainPage').style.display = 'block';
    document.getElementById('adminLogin').value = '';
    document.getElementById('adminPassword').value = '';
    document.getElementById('adminError').textContent = '';
    document.getElementById('adminResults').style.display = 'none';
}

function adminLogin() {
    const login = document.getElementById('adminLogin').value;
    const password = document.getElementById('adminPassword').value;
    const errorDiv = document.getElementById('adminError');

    const admins = [{ login: 'admin', password: 'admin123' }];
    const admin = admins.find(a => a.login === login && a.password === password);
    if (admin) {
        errorDiv.textContent = '';
        document.getElementById('adminLoginForm').style.display = 'none';
        document.getElementById('adminResults').style.display = 'block';
        updateAdminResults();
        updateRegistrationStats();
        displayVotingPeriodInAdmin();
    } else {
        errorDiv.textContent = 'Неверный логин или пароль!';
    }
}

function displayVotingPeriodInAdmin() {
    const startDateInput = document.getElementById('voteStartDate');
    const startTimeInput = document.getElementById('voteStartTime');
    const endDateInput = document.getElementById('voteEndDate');
    const endTimeInput = document.getElementById('voteEndTime');

    if (votingPeriod) {
        const start = new Date(votingPeriod.start);
        const end = new Date(votingPeriod.end);

        startDateInput.value = start.toISOString().split('T')[0];
        startTimeInput.value = `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}`;
        endDateInput.value = end.toISOString().split('T')[0];
        endTimeInput.value = `${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`;
    }
}

async function setVotingPeriod() {
    try {
        const startDate = document.getElementById('voteStartDate').value;
        const startTime = document.getElementById('voteStartTime').value;
        const endDate = document.getElementById('voteEndDate').value;
        const endTime = document.getElementById('voteEndTime').value;

        if (!startDate || !startTime || !endDate || !endTime) {
            document.getElementById('votingPeriodMessage').textContent = 'Заполните все поля!';
            return;
        }

        const startDateTime = new Date(`${startDate}T${startTime}:00`);
        const endDateTime = new Date(`${endDate}T${endTime}:00`);

        if (startDateTime >= endDateTime) {
            document.getElementById('votingPeriodMessage').textContent = 'Дата окончания должна быть позже даты начала!';
            return;
        }

        votingPeriod = {
            start: startDateTime.toISOString(),
            end: endDateTime.toISOString()
        };
        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'setVotingPeriod', period: votingPeriod })
        });
        const result = await response.json();
        if (result.error) {
            throw new Error(result.error);
        }

        document.getElementById('votingPeriodMessage').textContent = 'Период голосования успешно установлен!';
        document.getElementById('votingPeriodMessage').style.color = '#2ecc71';
        displayVotingPeriod();
    } catch (error) {
        console.error("Ошибка при установке периода голосования:", error);
        document.getElementById('votingPeriodMessage').textContent = 'Произошла ошибка: ' + error.message;
    }
}

async function updateRegistrationStats() {
    const totalPeople = allUsers.length;
    const totalRegistered = allUsers.filter(u => u.registered).length;
    const totalUnregistered = totalPeople - totalRegistered;
    const totalCooks = allUsers.filter(u => u.role === 'cook' && u.registered).length;
    const totalWaiters = allUsers.filter(u => u.role === 'waiter' && u.registered).length;

    document.getElementById('totalPeople').textContent = totalPeople;
    document.getElementById('totalRegistered').textContent = totalRegistered;
    document.getElementById('totalUnregistered').textContent = totalUnregistered;
    document.getElementById('totalCooks').textContent = totalCooks;
    document.getElementById('totalWaiters').textContent = totalWaiters;
}

async function updateAdminResults() {
    try {
        const response = await fetch(`${WEB_APP_URL}?action=getVotes`);
        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }
        const usersWithVotes = data.usersWithVotes || [];
        displayResults(usersWithVotes);
    } catch (error) {
        console.error("Ошибка при обновлении результатов:", error);
        alert("Не удалось загрузить результаты голосования: " + error.message);
    }
}

function displayResults(usersWithVotes) {
    const cooksResultsStars = document.getElementById('cooksResultsStars');
    const cooksResultsPigs = document.getElementById('cooksResultsPigs');
    const waitersResultsStars = document.getElementById('waitersResultsStars');
    const waitersResultsPigs = document.getElementById('waitersResultsPigs');

    cooksResultsStars.innerHTML = '';
    cooksResultsPigs.innerHTML = '';
    waitersResultsStars.innerHTML = '';
    waitersResultsPigs.innerHTML = '';

    const displayTop5 = (users, container, type) => {
        users.sort((a, b) => b[type] - a[type]);
        const top5 = users.slice(0, 5);
        if (top5.length === 0) {
            container.textContent = `Нет результатов по ${type === 'stars' ? '★' : '🐷'}.`;
            return;
        }
        top5.forEach((user, index) => {
            const div = document.createElement('div');
            div.textContent = `${index + 1}. ${user.surname} ${user.name}: ${type === 'stars' ? '★' : '🐷'} ${user[type]}`;
            container.appendChild(div);
        });
    };

    const cooks = usersWithVotes.filter(user => user.role === 'cook');
    displayTop5(cooks, cooksResultsStars, 'stars');
    displayTop5(cooks, cooksResultsPigs, 'pigs');

    const waiters = usersWithVotes.filter(user => user.role === 'waiter');
    displayTop5(waiters, waitersResultsStars, 'stars');
    displayTop5(waiters, waitersResultsPigs, 'pigs');
}

function showClearDatabaseModal() {
    const modal = document.getElementById('clearDatabaseModal');
    modal.style.display = 'block';
    document.getElementById('clearDatabasePassword').value = '';
    document.getElementById('clearDatabaseError').textContent = '';
}

function closeClearDatabaseModal() {
    const modal = document.getElementById('clearDatabaseModal');
    modal.style.display = 'none';
}

async function clearDatabase() {
    const password = document.getElementById('clearDatabasePassword').value;
    const errorDiv = document.getElementById('clearDatabaseError');

    const admins = [{ login: 'admin', password: 'admin123' }];
    const admin = admins.find(a => a.password === password);

    if (!admin) {
        errorDiv.textContent = 'Неверный пароль!';
        return;
    }

    try {
        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'clearDatabase' })
        });
        const result = await response.json();
        if (result.error) {
            throw new Error(result.error);
        }

        allUsers = [];
        currentUser = null;
        votingPeriod = null;
        cookStarVoted = false;
        cookPigVoted = false;
        waiterStarVoted = false;
        waiterPigVoted = false;

        localStorage.clear();
        closeClearDatabaseModal();
        updateAdminResults();
        updateRegistrationStats();
        alert('База данных успешно очищена!');
    } catch (error) {
        console.error("Ошибка при очистке базы данных:", error);
        errorDiv.textContent = 'Произошла ошибка: ' + error.message;
    }
}

async function refreshAllData() {
    try {
        await loadUsersForAutocomplete();
        await loadVotingPeriod();
        updateCooksList();
        updateWaitersList();
        checkExistingUser();
        updateMyVotes();
        updateAdminResults();
        updateRegistrationStats();
        alert('Данные успешно обновлены!');
    } catch (error) {
        console.error("Ошибка при обновлении данных:", error);
        alert("Произошла ошибка при обновлении данных: " + error.message);
    }
}
