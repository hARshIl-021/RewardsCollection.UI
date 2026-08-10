const apiBase = "https://olgrewards-api-gddsgnhkdfhma0h5.canadacentral-01.azurewebsites.net";

let selectedRewardId = null;

// ─── Customer: Analyze Card ───────────────────────────────────────────────────

async function analyzeCard() {
    const file = document.getElementById("cardFile").files[0];
    if (!file) {
        document.getElementById("scanResult").innerHTML = `<span class="error">Please select a file first.</span>`;
        return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
        const res = await fetch(`${apiBase}/api/Documents/analyze`, { method: "POST", body: formData });
        if (!res.ok) throw new Error(await res.text() || "Unable to analyze reward card.");
        const data = await res.json();

        let rewardsHtml = data.availableRewards.length
            ? data.availableRewards.map(r => `
                <div class="reward-item">
                    <h4>${r.rewardName}</h4>
                    <span class="category-badge cat-${r.category}">${r.category}</span>
                    <p>${r.requiredPoints} pts required</p>
                </div>`).join("")
            : `<p style="color:#888;margin-top:8px">No rewards available yet. Keep earning points!</p>`;

        document.getElementById("scanResult").innerHTML = `
            <div class="ai-box" style="margin-top:12px">
                <p><strong>Card:</strong> ${data.cardNumber} &nbsp;|&nbsp; <strong>Points:</strong> ${data.points}</p>
                <h4 style="margin-top:10px;color:#0078d4">Available Rewards</h4>
                ${rewardsHtml}
            </div>`;
    } catch (err) {
        document.getElementById("scanResult").innerHTML = `<span class="error">${err.message}</span>`;
    }
}

// ─── Customer: AI Recommendation ─────────────────────────────────────────────

async function getRecommendation() {
    const cardNumber = document.getElementById("cardNumber").value.trim();
    if (!cardNumber) {
        document.getElementById("recommendation").innerHTML = `<span class="error">Please enter a card number.</span>`;
        return;
    }

    document.getElementById("recommendation").innerHTML = `<p style="color:#888">Getting AI recommendation...</p>`;

    try {
        const res = await fetch(`${apiBase}/api/AI/recommend/${encodeURIComponent(cardNumber)}`);
        if (!res.ok) throw new Error(await res.text() || "Unable to get AI recommendation.");
        const data = await res.json();
        const rec = data.recommendation;

        document.getElementById("recommendation").innerHTML = `
            <div class="ai-box">
                <h3>🤖 AI Recommendation</h3>
                <p><strong>Card:</strong> ${data.cardNumber} &nbsp;|&nbsp; <strong>Points:</strong> ${data.points}
                ${data.preferredCategory ? ` &nbsp;|&nbsp; <strong>Pref:</strong> ${data.preferredCategory}` : ""}</p>
                <p style="margin-top:8px;color:#555">${rec.summary}</p>
                <div class="ai-recommendation">
                    <div class="rec-card">
                        <div class="rec-label">⭐ Best Recommendation</div>
                        <h4>${rec.bestReward}</h4>
                        <span class="category-badge cat-${rec.bestCategory}">${rec.bestCategory}</span>
                        <p>${rec.bestRewardReason}</p>
                    </div>
                    ${rec.alternativeReward ? `
                    <div class="rec-card">
                        <div class="rec-label">💡 Alternative</div>
                        <h4>${rec.alternativeReward}</h4>
                        <span class="category-badge cat-${rec.alternativeCategory}">${rec.alternativeCategory}</span>
                        <p>${rec.alternativeReason}</p>
                    </div>` : ""}
                </div>
            </div>`;
    } catch (err) {
        document.getElementById("recommendation").innerHTML = `<span class="error">${err.message}</span>`;
    }
}

// ─── Customer: Rewards Catalog ────────────────────────────────────────────────

async function loadRewardsCatalog(category = "") {
    const url = category ? `${apiBase}/api/Rewards?category=${encodeURIComponent(category)}` : `${apiBase}/api/Rewards`;

    try {
        const [rewardsRes, catsRes] = await Promise.all([
            fetch(url),
            fetch(`${apiBase}/api/Rewards/categories`)
        ]);

        if (!rewardsRes.ok) throw new Error("Unable to load rewards.");
        const rewards = await rewardsRes.json();
        const categories = catsRes.ok ? await catsRes.json() : [];

        // Build category pills
        const pillContainer = document.getElementById("categoryFilters");
        if (pillContainer && categories.length) {
            pillContainer.innerHTML = `<span class="pill ${!category ? "active" : ""}" onclick="filterRewards(this, '')">All</span>` +
                categories.map(c => `<span class="pill ${c === category ? "active" : ""}" onclick="filterRewards(this, '${c}')">${categoryEmoji(c)} ${c}</span>`).join("");
        }

        document.getElementById("rewardsCatalog").innerHTML = rewards.length
            ? rewards.map(r => `
                <div class="reward-card-item" id="reward-${r.id}" onclick="selectReward(${r.id}, '${r.rewardName.replace(/'/g, "\\'")}', ${r.requiredPoints}, '${r.category}')">
                    <span class="category-badge cat-${r.category}">${categoryEmoji(r.category)} ${r.category}</span>
                    <h4>${r.rewardName}</h4>
                    <p>${r.description}</p>
                    <p class="points-label">${r.requiredPoints.toLocaleString()} pts</p>
                </div>`).join("")
            : `<p style="color:#888">No rewards found.</p>`;

    } catch (err) {
        document.getElementById("rewardsCatalog").innerHTML = `<span class="error">${err.message}</span>`;
    }
}

function filterRewards(el, category) {
    document.querySelectorAll(".filter-pills .pill").forEach(p => p.classList.remove("active"));
    el.classList.add("active");
    loadRewardsCatalog(category);
}

function selectReward(id, name, points, category) {
    selectedRewardId = id;
    document.querySelectorAll(".reward-card-item").forEach(el => el.classList.remove("selected"));
    const el = document.getElementById(`reward-${id}`);
    if (el) el.classList.add("selected");

    document.getElementById("selectedReward").innerHTML = `
        <div class="ai-box">
            <strong>Selected:</strong> ${name}
            <span class="category-badge cat-${category}" style="margin-left:8px">${category}</span>
            — ${points.toLocaleString()} pts
        </div>`;
    document.getElementById("redeemResult").innerHTML = "";
}

// ─── Customer: Redeem ─────────────────────────────────────────────────────────

async function redeemReward() {
    const cardNumber = document.getElementById("redeemCardNumber").value.trim();
    if (!cardNumber) {
        document.getElementById("redeemResult").innerHTML = `<span class="error">Please enter your card number.</span>`;
        return;
    }
    if (!selectedRewardId) {
        document.getElementById("redeemResult").innerHTML = `<span class="error">Please select a reward from the catalog above.</span>`;
        return;
    }

    try {
        const res = await fetch(
            `${apiBase}/api/Rewards/redeem?cardNumber=${encodeURIComponent(cardNumber)}&rewardId=${selectedRewardId}`,
            { method: "POST" }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Redemption failed.");

        document.getElementById("redeemResult").innerHTML = `
            <div class="ai-box" style="border-color:#107c10;background:#f0fdf0">
                <span class="success">✅ ${data.message}</span>
                <p><strong>Reward:</strong> ${data.reward} (${data.category})</p>
                <p><strong>Points Used:</strong> ${data.pointsUsed.toLocaleString()}</p>
                <p><strong>Remaining Points:</strong> ${data.remainingPoints.toLocaleString()}</p>
            </div>`;

        selectedRewardId = null;
        document.getElementById("selectedReward").innerHTML = "";
        document.querySelectorAll(".reward-card-item").forEach(el => el.classList.remove("selected"));
        loadRewardsCatalog();

    } catch (err) {
        document.getElementById("redeemResult").innerHTML = `<span class="error">❌ ${err.message}</span>`;
    }
}

// ─── Customer: Save Preference ────────────────────────────────────────────────

async function savePreference() {
    const cardNumber = document.getElementById("redeemCardNumber").value.trim();
    const category   = document.getElementById("preferredCategory").value;
    if (!cardNumber || !category) {
        alert("Enter a card number and select a category first.");
        return;
    }
    try {
        const res = await fetch(
            `${apiBase}/api/Rewards/preference?cardNumber=${encodeURIComponent(cardNumber)}&category=${encodeURIComponent(category)}`,
            { method: "POST" }
        );
        if (!res.ok) throw new Error("Failed to save preference.");
        alert(`Preference saved: ${category}`);
    } catch (err) {
        alert(err.message);
    }
}

// ─── Admin: Platform Stats ────────────────────────────────────────────────────

async function loadStats() {
    try {
        const res = await fetch(`${apiBase}/api/Admin/stats`);
        if (!res.ok) throw new Error("Unable to load stats.");
        const d = await res.json();

        document.getElementById("stats").innerHTML = `
            <div class="stats-grid">
                <div class="stat-card"><h3>${d.customers}</h3><p>Customers</p></div>
                <div class="stat-card"><h3>${d.rewardCards}</h3><p>Reward Cards</p></div>
                <div class="stat-card"><h3>${d.rewards}</h3><p>Rewards</p></div>
                <div class="stat-card"><h3>${d.uploads}</h3><p>Uploads</p></div>
                <div class="stat-card"><h3>${d.totalScans}</h3><p>Total Scans</p></div>
                <div class="stat-card"><h3>${d.totalRedemptions}</h3><p>Redemptions</p></div>
            </div>`;
    } catch (err) {
        document.getElementById("stats").innerHTML = `<span class="error">${err.message}</span>`;
    }
}

// ─── Admin: Redemption Metrics ────────────────────────────────────────────────

async function loadRedemptionStats() {
    try {
        const res = await fetch(`${apiBase}/api/Admin/redemption-stats`);
        if (!res.ok) throw new Error("Unable to load redemption stats.");
        const d = await res.json();

        document.getElementById("redemptionStats").innerHTML = `
            <div class="stats-grid">
                <div class="stat-card"><h3>${d.totalRedemptions}</h3><p>Total Redemptions</p></div>
                <div class="stat-card"><h3>${d.totalPointsRedeemed.toLocaleString()}</h3><p>Points Redeemed</p></div>
                <div class="stat-card" style="grid-column:span 2">
                    <h3 style="font-size:18px">${d.mostRedeemedReward}</h3>
                    <p>Most Popular Reward <span class="category-badge cat-${d.mostRedeemedCategory}" style="margin-left:4px">${d.mostRedeemedCategory}</span></p>
                </div>
            </div>`;
    } catch (err) {
        document.getElementById("redemptionStats").innerHTML = `<span class="error">${err.message}</span>`;
    }
}

// ─── Admin: Recent Activity ───────────────────────────────────────────────────

async function loadRecentActivity() {
    try {
        const res = await fetch(`${apiBase}/api/Admin/recent-activity`);
        if (!res.ok) throw new Error("Unable to load activity.");
        const items = await res.json();

        document.getElementById("recentActivity").innerHTML = items.length
            ? items.map(item => `
                <div class="activity-item">
                    <div class="activity-icon ${item.type.toLowerCase()}">${item.type === "Scan" ? "📷" : "🎟️"}</div>
                    <div class="activity-info">
                        <strong>${item.cardNumber}</strong>
                        <span>${item.description}</span>
                    </div>
                    <span class="activity-time">${formatTime(item.timestamp)}</span>
                </div>`).join("")
            : `<p style="color:#888">No recent activity.</p>`;
    } catch (err) {
        document.getElementById("recentActivity").innerHTML = `<span class="error">${err.message}</span>`;
    }
}

// ─── Admin: Top Rewards ───────────────────────────────────────────────────────

async function loadTopRewards() {
    try {
        const res = await fetch(`${apiBase}/api/Admin/top-rewards`);
        if (!res.ok) throw new Error("Unable to load top rewards.");
        const items = await res.json();

        document.getElementById("topRewards").innerHTML = items.length
            ? items.map((item, i) => `
                <div class="top-reward-row">
                    <span class="rank">#${i + 1}</span>
                    <div class="top-reward-info">
                        <strong>${item.rewardName}</strong>
                        <span><span class="category-badge cat-${item.category}">${item.category}</span> — ${item.totalPointsRedeemed.toLocaleString()} pts redeemed</span>
                    </div>
                    <span class="top-reward-count">${item.count}×</span>
                </div>`).join("")
            : `<p style="color:#888">No redemptions yet.</p>`;
    } catch (err) {
        document.getElementById("topRewards").innerHTML = `<span class="error">${err.message}</span>`;
    }
}

// ─── Admin: Active Customers ──────────────────────────────────────────────────

async function loadActiveCustomers() {
    try {
        const res = await fetch(`${apiBase}/api/Admin/active-customers`);
        if (!res.ok) throw new Error("Unable to load active customers.");
        const items = await res.json();

        document.getElementById("activeCustomers").innerHTML = items.length
            ? `<div class="top-rewards-list">` + items.map((c, i) => `
                <div class="top-reward-row">
                    <span class="rank">#${i + 1}</span>
                    <div class="top-reward-info">
                        <strong>${c.cardNumber}</strong>
                        <span>Last scan: ${formatTime(c.lastScan)} — ${c.latestPoints?.toLocaleString() ?? 0} pts</span>
                    </div>
                    <span class="top-reward-count">${c.scanCount} scans</span>
                </div>`).join("") + `</div>`
            : `<p style="color:#888">No scan data yet.</p>`;
    } catch (err) {
        document.getElementById("activeCustomers").innerHTML = `<span class="error">${err.message}</span>`;
    }
}

// ─── Admin: Recent Scans (legacy) ────────────────────────────────────────────

async function loadRecentScans() {
    try {
        const res = await fetch(`${apiBase}/api/Admin/recent-scans`);
        if (!res.ok) throw new Error("Unable to load recent scans.");
        const scans = await res.json();

        document.getElementById("recentScans").innerHTML = scans.length
            ? scans.map(s => `
                <div class="reward-item">
                    <h4>${s.cardNumber}</h4>
                    <p>${s.points} pts &nbsp;|&nbsp; ${formatTime(s.scanDate)}</p>
                </div>`).join("")
            : `<p style="color:#888">No scans yet.</p>`;
    } catch (err) {
        document.getElementById("recentScans").innerHTML = `<span class="error">${err.message}</span>`;
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso) {
    return new Date(iso).toLocaleString();
}

function categoryEmoji(cat) {
    const map = { Casino: "🎰", Dining: "🍽️", Travel: "✈️", Entertainment: "🎭", Hotel: "🏨" };
    return map[cat] || "🎁";
}
