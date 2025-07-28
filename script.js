document.addEventListener('DOMContentLoaded', () => {
    const serverOffsets = { America: -7, Europe: 1, Asia: 8 };
    let selectedServer = localStorage.getItem('selectedServer') || 'America';
    let countdownInterval;

    // --- UI Setup Functions ---
    function setupTabs() {
        const navButtons = document.querySelectorAll('.nav-button');
        const tabContents = document.querySelectorAll('.tab-content');
        navButtons.forEach(button => {
            button.addEventListener('click', () => {
                navButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                const targetId = button.getAttribute('data-target');
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === targetId) content.classList.add('active');
                });
            });
        });
    }

    function setupCustomSelect() {
        const customSelect = document.querySelector('.custom-select');
        const selectTrigger = document.querySelector('.select-trigger span');
        const options = document.querySelectorAll('.option');
        const initialOption = document.querySelector(`.option[data-value="${selectedServer}"]`);
        if (initialOption) selectTrigger.innerHTML = initialOption.innerHTML;
        customSelect.addEventListener('click', () => customSelect.classList.toggle('open'));
        options.forEach(option => {
            option.addEventListener('click', () => {
                selectedServer = option.getAttribute('data-value');
                selectTrigger.innerHTML = option.innerHTML;
                localStorage.setItem('selectedServer', selectedServer);
            });
        });
        document.addEventListener('click', (e) => {
            if (!customSelect.contains(e.target)) customSelect.classList.remove('open');
        });
    }

    function setupChecklists() {
        const checklists = {
            daily: {
                tasks: [
                    { name: "Spend all Vital Energy", desc: "Prevents overflow and waste." },
                    { name: "Complete Daily Wishes", desc: "For premium currency and resources." },
                    { name: "Check Store for free items", desc: "The daily free pack is essential!" },
                    { name: "Claim Pear-Pal Dig rewards", desc: "Easy passive resources." },
                    { name: "Complete event tasks", desc: "Don't miss limited-time rewards." },
                    { name: "Check in-game mail", desc: "For gifts & compensation." },
                ],
                element: document.getElementById('daily-tasks'),
                storageKey: 'dailyTasks'
            },
            weekly: {
                tasks: [
                    { name: "Challenge Weekly Bosses", desc: "For rare materials." },
                    { name: "Purchase weekly shop items", desc: "Starlit Shop, etc." },
                    { name: "Complete Mira Journey tasks", desc: "For battle pass rewards." },
                    { name: "Claim weekly share rewards", desc: "Easy to get items." },
                ],
                element: document.getElementById('weekly-tasks'),
                storageKey: 'weeklyTasks'
            }
        };

        const createChecklist = (type) => {
            const config = checklists[type];
            let savedState = JSON.parse(localStorage.getItem(config.storageKey)) || {};
            const render = () => {
                config.element.innerHTML = '';
                config.tasks.forEach((task) => {
                    const isCompleted = savedState[task.name] || false;
                    const li = document.createElement('li');
                    li.className = isCompleted ? 'completed' : '';
                    li.innerHTML = `<div><span class="heart-checkbox">${isCompleted ? '♥' : '♡'}</span> ${task.name}<div class="task-desc">${task.desc}</div></div>`;
                    li.addEventListener('click', () => toggle(task.name));
                    config.element.appendChild(li);
                });
            };
            const toggle = (taskName) => { savedState[taskName] = !savedState[taskName]; localStorage.setItem(config.storageKey, JSON.stringify(savedState)); render(); };
            document.querySelector(`.reset-button[data-target="${type}"]`).addEventListener('click', () => { savedState = {}; localStorage.setItem(config.storageKey, JSON.stringify(savedState)); render(); });
            render();
        };

        createChecklist('daily');
        createChecklist('weekly');
    }
    
    function setupSparkleEffect() {
        let isThrottled = false;
        document.body.addEventListener('mousemove', (e) => {
            if (isThrottled) return;
            isThrottled = true;
            setTimeout(() => { isThrottled = false; }, 30);
            const sparkle = document.createElement('div');
            sparkle.classList.add('sparkle');
            sparkle.style.left = `${e.clientX}px`;
            sparkle.style.top = `${e.clientY}px`;
            sparkle.style.backgroundColor = ['#ff69b4', '#ff85c8', '#ffb6c1'][Math.floor(Math.random() * 3)];
            sparkle.style.transform = `scale(${Math.random() * 0.7 + 0.3})`;
            document.body.appendChild(sparkle);
            sparkle.addEventListener('animationend', () => sparkle.remove());
        });
    }

    function setupHeartExplosion() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('button, .custom-select, a, li')) return;
            for (let i = 0; i < 10; i++) {
                const heart = document.createElement('div');
                heart.classList.add('heart-particle');
                heart.innerHTML = '💖';
                heart.style.left = `${e.clientX}px`;
                heart.style.top = `${e.clientY}px`;
                const angle = Math.random() * 2 * Math.PI;
                const distance = Math.random() * 40 + 40;
                const x = Math.cos(angle) * distance;
                const y = Math.sin(angle) * distance;
                heart.style.setProperty('--tx', `${x}px`);
                heart.style.setProperty('--ty', `${y}px`);
                document.body.appendChild(heart);
                heart.addEventListener('animationend', () => heart.remove());
            }
        });
    }

    // --- Data Fetching and Rendering ---
    async function fetchAndRenderData() {
        await fetchMaintenanceInfo();
        await fetchAndDisplayEvents();
    }

    async function fetchMaintenanceInfo() {
        const maintenanceContainer = document.getElementById('maintenance-countdown-container');
        try {
            const categoryApiUrl = `https://infinity-nikki.fandom.com/api.php?action=query&list=categorymembers&cmtitle=Category:Version_Info&cmlimit=50&format=json&origin=*`;
            const categoryResponse = await fetch(categoryApiUrl);
            const categoryData = await categoryResponse.json();
            const versions = categoryData.query.categorymembers;
            if (!versions || versions.length === 0) throw new Error("No version pages found.");
            versions.sort((a, b) => parseFloat(b.title.split('/')[1]) - parseFloat(a.title.split('/')[1]));
            const latestVersionPageTitle = versions[0].title;
            const pageApiUrl = `https://infinity-nikki.fandom.com/api.php?action=query&prop=revisions&titles=${encodeURIComponent(latestVersionPageTitle)}&rvprop=content&format=json&origin=*`;
            const pageResponse = await fetch(pageApiUrl);
            const pageData = await pageResponse.json();
            const pageContent = pageData.query.pages[Object.keys(pageData.query.pages)[0]].revisions[0]['*'];
            const releaseDateMatch = pageContent.match(/\|date_start\s*=\s*(.*?)\n/);
            if (!releaseDateMatch) { maintenanceContainer.innerHTML = 'No new version maintenance announced.'; return; }
            const releaseDate = new Date(releaseDateMatch[1].trim() + " UTC-07:00");
            if (releaseDate > new Date()) {
                const maintenanceMatch = pageContent.match(/==Maintenance==\s*\n===Season Begin===\s*\n(\w+\s\d+),\s(\d{2}:\d{2})\s+to\s+(\d{2}:\d{2})\s+\(UTC-7\)/);
                const year = releaseDate.getUTCFullYear();
                if (maintenanceMatch) {
                    const [_, dateStr, startTimeStr, endTimeStr] = maintenanceMatch;
                    const startTime = new Date(`${dateStr}, ${year} ${startTimeStr}:00 UTC-07:00`);
                    const endTime = new Date(`${dateStr}, ${year} ${endTimeStr}:00 UTC-07:00`);
                    maintenanceContainer.innerHTML = `<div class="event-title">${latestVersionPageTitle}</div><div data-countdown-status data-start-time="${startTime.getTime()}" data-end-time="${endTime.getTime()}"></div><div class="countdown-flicker" data-countdown-target data-start-time="${startTime.getTime()}" data-end-time="${endTime.getTime()}"></div>`;
                } else { maintenanceContainer.innerHTML = 'New version found, but maintenance time is not listed yet.'; }
            } else { maintenanceContainer.innerHTML = 'No new version maintenance announced.'; }
        } catch (error) { console.error("Failed to fetch maintenance info:", error); maintenanceContainer.innerHTML = 'Could not load maintenance info.'; }
    }
    
    async function fetchAndDisplayEvents() {
        try {
            const apiUrl = `https://infinity-nikki.fandom.com/api.php?action=parse&page=Event&format=json&origin=*`;
            const response = await fetch(apiUrl);
            const data = await response.json();
            const doc = new DOMParser().parseFromString(data.parse.text['*'], 'text/html');
            const now = new Date();
            let parsedEvents = [];
            doc.querySelectorAll('table.article-table tr').forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length < 2) return;
                const links = cells[0].querySelectorAll('a');
                const titleLink = links.length > 0 ? links[links.length - 1] : null;
                const name = titleLink ? titleLink.title : cells[0].textContent.trim();
                const description = cells.length > 2 ? cells[2].textContent.trim() : "";
                const durationCell = cells[1].textContent.trim();
                const dates = durationCell.split(/\s*(?:–|-)\s*/);
                if (dates.length < 2) return;
                const startDate = new Date(dates[0].trim() + " UTC-07:00");
                const endDate = new Date(dates[1].trim() + " UTC-07:00");
                if (endDate > now && !isNaN(startDate.getTime())) {
                    parsedEvents.push({ name, description, start: startDate, end: endDate });
                }
            });
            renderEvents(parsedEvents);
        } catch (error) { console.error("Failed to fetch events:", error); document.getElementById('event-accordions').innerHTML = "<p>Could not load events.</p>"; }
    }
    
    function renderEvents(events) {
        const accordionsContainer = document.getElementById('event-accordions');
        accordionsContainer.innerHTML = '';
        const now = new Date();
        const ongoing = events.filter(e => e.start <= now).sort((a, b) => a.end - b.end);
        const upcoming = events.filter(e => e.start > now).sort((a, b) => a.start - b.start);
        const createAccordion = (title, eventList, expanded = false) => {
            if (eventList.length === 0) return '';
            const eventsHtml = eventList.map(event => `<div class="event"><div class="event-title">${event.name}</div><div class="event-description">${event.description}</div><div data-countdown-status data-start-time="${event.start.getTime()}" data-end-time="${event.end.getTime()}"></div><div class="event-countdown countdown-flicker" data-countdown-target data-start-time="${event.start.getTime()}" data-end-time="${event.end.getTime()}"></div></div>`).join('');
            return `<div class="accordion-group"><div class="accordion ${expanded ? 'active' : ''}"><div class="header">${title} (${eventList.length})</div><div class="content">${eventsHtml}</div></div></div>`;
        };
        accordionsContainer.innerHTML = createAccordion('Ongoing Events', ongoing, true) + createAccordion('Upcoming Events', upcoming);
        if (accordionsContainer.innerHTML === '') accordionsContainer.innerHTML = '<p>No upcoming or active events.</p>';
        
        // --- BUG FIX STARTS HERE ---
        // After rendering, find any accordions that should be open by default
        // and set their max-height to their actual scrollHeight.
        document.querySelectorAll('.accordion.active .content').forEach(content => {
            content.style.maxHeight = content.scrollHeight + "px";
        });
        // --- BUG FIX ENDS HERE ---

        document.querySelectorAll('.accordion .header').forEach(header => {
            header.addEventListener('click', () => {
                const accordion = header.parentElement;
                accordion.classList.toggle('active');
                const content = header.nextElementSibling;
                content.style.maxHeight = accordion.classList.contains('active') ? content.scrollHeight + "px" : "0";
            });
        });
    }

    // --- The Main Timer Loop ---
    function masterTimerTick() {
        const now = new Date();
        const serverTime = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours() + serverOffsets[selectedServer], now.getUTCMinutes(), now.getUTCSeconds());
        document.getElementById('server-time').textContent = serverTime.toTimeString().split(' ')[0];
        let dailyReset = new Date(serverTime);
        dailyReset.setUTCHours(4, 0, 0, 0);
        if (serverTime >= dailyReset) dailyReset.setUTCDate(dailyReset.getUTCDate() + 1);
        document.querySelector('[data-countdown-target="daily-reset"]').textContent = formatHMS(dailyReset - serverTime);
        let weeklyReset = new Date(serverTime);
        const dayOfWeek = weeklyReset.getUTCDay();
        const daysUntilMonday = (dayOfWeek === 1 && serverTime.getUTCHours() < 4) ? 0 : (1 - dayOfWeek + 7) % 7;
        weeklyReset.setUTCDate(weeklyReset.getUTCDate() + daysUntilMonday);
        weeklyReset.setUTCHours(4, 0, 0, 0);
        if (serverTime >= weeklyReset) weeklyReset.setUTCDate(weeklyReset.getUTCDate() + 7);
        document.querySelector('[data-countdown-target="weekly-reset"]').textContent = formatDHM(weeklyReset - serverTime);
        document.querySelectorAll('[data-countdown-target]:not([data-countdown-target="daily-reset"]):not([data-countdown-target="weekly-reset"])').forEach(el => {
            const startTime = new Date(parseInt(el.dataset.startTime));
            const endTime = new Date(parseInt(el.dataset.endTime));
            el.textContent = formatDHM((now < startTime) ? startTime - now : endTime - now);
        });
        document.querySelectorAll('[data-countdown-status]').forEach(el => {
            el.textContent = (now < new Date(parseInt(el.dataset.startTime))) ? 'Starts in:' : 'Ends in:';
        });
    }

    const formatDHM = (diff) => { if (diff < 0) return "Ended"; const d = Math.floor(diff / 86400000); const h = Math.floor((diff % 86400000) / 3600000); const m = Math.floor((diff % 3600000) / 60000); return `${d}d ${h}h ${m}m`; };
    const formatHMS = (diff) => { if (diff < 0) return "00:00:00"; const h = Math.floor((diff % 86400000) / 3600000); const m = Math.floor((diff % 3600000) / 60000); const s = Math.floor((diff % 60000) / 1000); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`; };

    // --- Initialization ---
    function initialize() {
        setupTabs();
        setupCustomSelect();
        setupChecklists();
        setupSparkleEffect();
        setupHeartExplosion();
        fetchAndRenderData();
        if (countdownInterval) clearInterval(countdownInterval);
        countdownInterval = setInterval(masterTimerTick, 1000);
        masterTimerTick();
    }

    initialize();
});
