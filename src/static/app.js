document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper: create participant list item with delete handler
  function createParticipantListItem(email, activityName, activityCard) {
    const li = document.createElement("li");
    li.className = "participant-item";

    const span = document.createElement("span");
    span.textContent = email;
    span.className = "participant-email";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "delete-btn";
    btn.setAttribute("aria-label", `Unregister ${email} from ${activityName}`);
    btn.textContent = "✖";

    // Attach click handler to unregister participant
    btn.addEventListener("click", async () => {
      try {
        const resp = await fetch(`/activities/${encodeURIComponent(activityName)}/unregister?email=${encodeURIComponent(email)}`, {
          method: "DELETE",
        });

        if (resp.ok) {
          // Remove from DOM
          li.remove();

          // Update availability text
          const avail = activityCard.querySelector(".availability");
          const match = avail.textContent.match(/(\d+) spots left/);
          if (match) {
            const current = parseInt(match[1], 10);
            avail.innerHTML = `<strong>Availability:</strong> ${current + 1} spots left`;
          }

          // If no participants left, show placeholder
          const ul = activityCard.querySelector(".participants-list");
          if (!ul || ul.children.length === 0) {
            const container = activityCard.querySelector(".participants-container");
            container.innerHTML = "";
            const p = document.createElement("p");
            p.className = "no-participants";
            p.textContent = "No participants yet";
            container.appendChild(p);
          }
        } else {
          const data = await resp.json().catch(() => ({}));
          messageDiv.textContent = data.detail || "Failed to unregister participant.";
          messageDiv.className = "error";
          messageDiv.classList.remove("hidden");
          setTimeout(() => messageDiv.classList.add("hidden"), 5000);
        }
      } catch (error) {
        console.error("Error unregistering:", error);
        messageDiv.textContent = "Failed to unregister participant.";
        messageDiv.className = "error";
        messageDiv.classList.remove("hidden");
        setTimeout(() => messageDiv.classList.add("hidden"), 5000);
      }
    });

    li.appendChild(span);
    li.appendChild(btn);
    return li;
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p class="availability"><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <div class="participants">
            <strong>Participants:</strong>
            <div class="participants-container"></div>
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Populate participants into the container so we can attach delete buttons
        const container = activityCard.querySelector(".participants-container");
        if (details.participants && details.participants.length) {
          const ul = document.createElement("ul");
          ul.className = "participants-list";

          details.participants.forEach((p) => {
            const li = createParticipantListItem(p, name, activityCard);
            ul.appendChild(li);
          });

          container.appendChild(ul);
        } else {
          const p = document.createElement("p");
          p.className = "no-participants";
          p.textContent = "No participants yet";
          container.appendChild(p);
        }

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        
        // Update UI immediately: find corresponding activity card
        const cards = Array.from(document.querySelectorAll(".activity-card"));
        const activityCard = cards.find((c) => {
          const h4 = c.querySelector("h4");
          return h4 && h4.textContent === activity;
        });

        if (activityCard) {
          const container = activityCard.querySelector(".participants-container");
          let ul = activityCard.querySelector(".participants-list");

          // Remove "No participants yet" if present
          const noPart = container.querySelector(".no-participants");
          if (noPart) {
            container.innerHTML = "";
            ul = document.createElement("ul");
            ul.className = "participants-list";
            container.appendChild(ul);
          } else if (!ul) {
            ul = document.createElement("ul");
            ul.className = "participants-list";
            container.appendChild(ul);
          }

          // Append new participant
          const li = createParticipantListItem(email, activity, activityCard);
          ul.appendChild(li);

          // Update availability text (decrement)
          const avail = activityCard.querySelector(".availability");
          const match = avail.textContent.match(/(\d+)\s+spots left/);
          if (match) {
            const current = parseInt(match[1], 10);
            avail.innerHTML = `<strong>Availability:</strong> ${Math.max(0, current - 1)} spots left`;
          }
        }
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
