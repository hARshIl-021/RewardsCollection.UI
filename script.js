const apiBase =
"https://olgrewards-api-gddsgnhkdfhma0h5.canadacentral-01.azurewebsites.net";

async function analyzeCard() {

    try {

        const file =
            document.getElementById("cardFile").files[0];

        if (!file) {

            document.getElementById("scanResult").innerHTML =
                `<p class="error">Please select a file first.</p>`;

            return;
        }

        const formData = new FormData();

        formData.append("file", file);

        const response = await fetch(
            `${apiBase}/api/Documents/analyze`,
            {
                method: "POST",
                body: formData
            });

        if (!response.ok) {
            throw new Error("Unable to analyze reward card.");
        }

        const data = await response.json();

        let rewardsHtml = "";

        data.availableRewards.forEach(r => {

            rewardsHtml += `
                <div class="reward-item">
                    <h4>${r.rewardName}</h4>
                    <p>${r.requiredPoints} Points Required</p>
                </div>
            `;
        });

        document.getElementById("scanResult").innerHTML =
        `
            <p><strong>Card:</strong> ${data.cardNumber}</p>

            <p><strong>Points:</strong> ${data.points}</p>

            <h4>Available Rewards</h4>

            ${rewardsHtml}
        `;

    }
    catch (error) {

        document.getElementById("scanResult").innerHTML =
        `
            <p class="error">
                ${error.message}
            </p>
        `;
    }
}

async function getRecommendation() {

    try {

        const cardNumber =
            document.getElementById("cardNumber").value.trim();

        if (!cardNumber) {

            document.getElementById("recommendation").innerHTML =
            `
                <p class="error">
                    Please enter a card number.
                </p>
            `;

            return;
        }

        const response = await fetch(
            `${apiBase}/api/AI/recommend/${cardNumber}`);

        if (!response.ok) {
            throw new Error("Unable to get AI recommendation.");
        }

        const data = await response.json();

        document.getElementById("recommendation").innerHTML =
        `
            <div class="ai-box">

                <h3>🤖 AI Recommendation</h3>

                <p>${data.recommendation}</p>

                <p>
                    <strong>Card:</strong>
                    ${data.cardNumber}
                </p>

                <p>
                    <strong>Points:</strong>
                    ${data.points}
                </p>

            </div>
        `;
    }
    catch (error) {

        document.getElementById("recommendation").innerHTML =
        `
            <p class="error">
                ${error.message}
            </p>
        `;
    }
}

async function loadStats() {

    try {

        const response =
            await fetch(`${apiBase}/api/Admin/stats`);

        if (!response.ok) {
            throw new Error("Unable to load dashboard statistics.");
        }

        const data = await response.json();

        document.getElementById("stats").innerHTML =
        `
            <div class="stats-grid">

                <div class="stat-card">
                    <h3>${data.customers}</h3>
                    <p>Customers</p>
                </div>

                <div class="stat-card">
                    <h3>${data.rewardCards}</h3>
                    <p>Reward Cards</p>
                </div>

                <div class="stat-card">
                    <h3>${data.rewards}</h3>
                    <p>Rewards</p>
                </div>

                <div class="stat-card">
                    <h3>${data.uploads}</h3>
                    <p>Uploads</p>
                </div>

                <div class="stat-card">
                    <h3>${data.totalScans}</h3>
                    <p>Total Scans</p>
                </div>

            </div>
        `;
    }
    catch (error) {

        document.getElementById("stats").innerHTML =
        `
            <p class="error">
                ${error.message}
            </p>
        `;
    }
}