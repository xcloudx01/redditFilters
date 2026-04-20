// Function to save popup data to storage
function saveData() {
  // Fetch users from input
  const usersString = document.getElementById("userList").value;
  const usersArray = usersString.split("\n").map((item) => item.trim());

  // Fetch keywords from input
  const keywordsString = document.getElementById("keywordList").value;
  const keywordsArray = keywordsString.split("\n").map((item) => item.trim());

  // Fetch subreddits from input
  const subredditsString = document.getElementById("subredditList").value;
  const subredditsArray = subredditsString
    .split("\n")
    .map((item) => item.trim());

  // Fetch domains from input
  const domainsString = document.getElementById("domainList").value;
  const domainsArray = domainsString.split("\n").map((item) => item.trim());

  // Fetch preferences from input
  const loggingEnabled = document.getElementById("loggingEnabled").checked;
  const expandImages = document.getElementById("expandImages").checked;
  const blockUsers = document.getElementById("blockUsers").checked;
  const blockKeywords = document.getElementById("blockKeywords").checked;
  const blockSubreddits = document.getElementById("blockSubreddits").checked;
  const blockDomains = document.getElementById("blockDomains").checked;

  // Save the data using the Chrome storage API
  chrome.storage.local.set({
    hiddenUsers: usersArray,
    hiddenKeywords: keywordsArray,
    hiddenSubreddits: subredditsArray,
    hiddenDomains: domainsArray,
    loggingEnabled: loggingEnabled,
    expandImages: expandImages,
    blockUsers: blockUsers,
    blockKeywords: blockKeywords,
    blockSubreddits: blockSubreddits,
    blockDomains: blockDomains,
  });
}

function loadData() {
  // Load the data using the Chrome storage API
  chrome.storage.local.get(
    [
      "hiddenUsers",
      "hiddenKeywords",
      "hiddenSubreddits",
      "hiddenDomains",
      "loggingEnabled",
      "expandImages",
      "blockUsers",
      "blockKeywords",
      "blockSubreddits",
      "blockDomains",
    ],
    function (result) {
      if (result.hiddenUsers) {
        document.getElementById("userList").value =
          result.hiddenUsers.join("\n");
      }

      if (result.hiddenKeywords) {
        document.getElementById("keywordList").value =
          result.hiddenKeywords.join("\n");
      }

      if (result.hiddenSubreddits) {
        document.getElementById("subredditList").value =
          result.hiddenSubreddits.join("\n");
      }

      if (result.hiddenDomains) {
        document.getElementById("domainList").value =
          result.hiddenDomains.join("\n");
      }

      // Load preferences
      if (result.loggingEnabled !== undefined) {
        document.getElementById("loggingEnabled").checked =
          result.loggingEnabled;
      }
      if (result.expandImages !== undefined) {
        document.getElementById("expandImages").checked = result.expandImages;
      }
      if (result.blockUsers !== undefined) {
        document.getElementById("blockUsers").checked = result.blockUsers;
      }
      if (result.blockKeywords !== undefined) {
        document.getElementById("blockKeywords").checked = result.blockKeywords;
      }
      if (result.blockSubreddits !== undefined) {
        document.getElementById("blockSubreddits").checked =
          result.blockSubreddits;
      }
      if (result.blockDomains !== undefined) {
        document.getElementById("blockDomains").checked = result.blockDomains;
      }

      // Load saved section order
      loadSectionOrder();
    }
  );
}

function saveSectionOrder() {
  const sections = document.querySelectorAll(".draggableSection");
  const order = Array.from(sections).map((s) => s.dataset.section);
  chrome.storage.local.set({ sectionOrder: order });
}

function loadSectionOrder() {
  chrome.storage.local.get(["sectionOrder"], function (result) {
    if (!result.sectionOrder || result.sectionOrder.length === 0) return;

    const sections = document.querySelectorAll(".draggableSection");
    const sectionMap = {};
    sections.forEach((s) => {
      sectionMap[s.dataset.section] = s;
    });

    const body = document.body;
    const dropZone = document.querySelector(".drop-zone");
    const endDiv = document.querySelector(".end");

    result.sectionOrder.forEach((key) => {
      if (sectionMap[key]) {
        body.insertBefore(sectionMap[key], dropZone);
      }
    });
  });
}

function nuke() {
  // Sends request to main content script for users to ban
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    try {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "nukePage" },
        function (response) {
          if (!response || response.status != 200) {
            document.getElementById("nukeDescription").innerHTML =
              "Can only nuke when window is on a reddit thread";
            return;
          }

          const foundUsers = response.message;
          // Adds all found users to the ban list
          const usersString = document.getElementById("userList").value;
          const usersArray = usersString.split("\n").map((item) => item.trim());
          const combinedUsersArray = [...foundUsers, ...usersArray];

          // Save combined array
          chrome.storage.local.set({
            hiddenUsers: combinedUsersArray,
          });

          // Print combined array to UI
          document.getElementById("userList").value =
            combinedUsersArray.join("\n");
        }
      );
    } catch (err) {}
  });
}

// Set up event listeners on the textarea elements for the input event
document.getElementById("userList").addEventListener("input", saveData);
document.getElementById("keywordList").addEventListener("input", saveData);
document.getElementById("subredditList").addEventListener("input", saveData);
document.getElementById("domainList").addEventListener("input", saveData);

// Drag and drop logic
let draggedSection = null;
const dropZone = document.querySelector(".drop-zone");
let lastReorderKey = ""; // Guard against unnecessary DOM mutations

function onDragStart(e) {
  draggedSection = this.closest(".draggableSection");
  draggedSection.classList.add("dragging");
  e.dataTransfer.effectAllowed = "move";
}

function onDragEnd() {
  if (draggedSection) {
    draggedSection.classList.remove("dragging");
  }
  draggedSection = null;
  lastReorderKey = "";
}

// Set up drag and drop on section headers
function setupDragDrop() {
  const headers = document.querySelectorAll(".sectionHeader");
  headers.forEach((header) => {
    header.setAttribute("draggable", "true");
    header.addEventListener("dragstart", onDragStart);
    header.addEventListener("dragend", onDragEnd);
  });

  // Per-section dragover — triggers reorder when cursor enters each section's area during drag
  const allSections = document.querySelectorAll(".draggableSection");
  allSections.forEach((section) => {
    section.addEventListener("dragover", function (e) {
      e.preventDefault();
      if (!draggedSection || draggedSection === this) return;

      // Find first non-dragged section whose midpoint cursor is above
      const otherSections = Array.from(document.querySelectorAll(".draggableSection"))
        .filter((s) => s !== draggedSection);

      let insertBeforeIdx = -1;
      for (let i = 0; i < otherSections.length; i++) {
        const rect = otherSections[i].getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (e.clientY <= midY) {
          insertBeforeIdx = i;
          break;
        }
      }

      let targetNode;
      if (insertBeforeIdx === -1) {
        const endDiv = document.querySelector(".end");
        if (endDiv && draggedSection.nextElementSibling !== endDiv) {
          draggedSection.parentNode.insertBefore(draggedSection, endDiv);
        }
      } else {
        targetNode = otherSections[insertBeforeIdx];
        if (draggedSection.nextElementSibling !== targetNode) {
          draggedSection.parentNode.insertBefore(draggedSection, targetNode);
        }
      }
    });

    section.addEventListener("drop", function (e) {
      e.preventDefault();
      e.stopPropagation();
      saveSectionOrder();
    });
  });
  if (dropZone) {
    dropZone.addEventListener("dragover", function (e) {
      e.preventDefault();
      e.stopPropagation();
    });
    dropZone.addEventListener("drop", function (e) {
      e.preventDefault();
      e.stopPropagation();

      const endDiv = document.querySelector(".end");
      if (endDiv && draggedSection !== endDiv.previousSibling) {
        document.body.insertBefore(draggedSection, endDiv);
      }
      saveSectionOrder();
    });
  }
}

// Set up nuke button listener
document.addEventListener("DOMContentLoaded", function () {
  var button = document.querySelector(".nukeButton");

  if (button) {
    button.addEventListener("click", function () {
      nuke();
    });
  }

  setupDragDrop();
});

// Loads saved data back into input
document.addEventListener("DOMContentLoaded", loadData);
