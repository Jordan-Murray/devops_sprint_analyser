import axios from "axios";

var organization;
var project;
var authHeader;
const apiVersion = "7.0";

async function fetchSprints() {
  const url = `https://dev.azure.com/${organization}/${project}/_apis/work/teamsettings/iterations?api-version=${apiVersion}`;
  try {
    const response = await axios.get(url, authHeader);
    return response.data;
  } catch (error) {
    console.error("Error fetching sprints:", error.message);
  }
}

async function fetchCurrentSprint() {
  const sprints = await fetchSprints();
  const currentSprint = sprints.value.find((sprint) => {
    const now = new Date();
    const startDate = new Date(sprint.attributes.startDate);
    const endDate = new Date(sprint.attributes.finishDate);
    return startDate <= now && endDate >= now;
  });
  return currentSprint;
}

async function fetchWorkItems(sprintName, areaPaths) {
  const url = `https://dev.azure.com/${organization}/${project}/_apis/wit/wiql?api-version=${apiVersion}`;

  const validatedAreaPaths = areaPaths.map((areaPath) =>
    areaPath
      .substring(1)
      .replace(/\\\\/g, "\\")
      .replace(/Area\\/g, "")
  );

  const areaPathFilter = validatedAreaPaths
    .map((path) => `'${path}'`)
    .join(", ");

  const query = `
        SELECT [System.Id]
        FROM WorkItems
        WHERE [System.TeamProject] = @project
            AND [System.AreaPath] IN (${areaPathFilter})
            AND [System.WorkItemType] IN ('User Story', 'Bug', 'Issue')
            AND [System.State] = 'Closed'
            AND [System.IterationPath] = '${project}\\${sprintName}'`;

  try {
    const response = await axios.post(url, { query }, authHeader);
    return response.data.workItems.map((wi) => wi.id);
  } catch (error) {
    console.error("Error fetching work items:", error.message);
    if (error.response && error.response.data) {
      console.error("Error details:", error.response.data);
    }
    return [];
  }
}

async function fetchWorkItemDetails(workItemIds) {
  if (workItemIds.length === 0) {
    return [];
  }
  const ids = workItemIds.join(",");
  const url = `https://dev.azure.com/${organization}/${project}/_apis/wit/workitems?ids=${ids}&api-version=${apiVersion}`;

  try {
    const response = await axios.get(url, authHeader);
    return response.data.value;
  } catch (error) {
    if (error.response && error.response.data) {
      console.error("Error details:", error.response.data);
    }
    console.error("Error fetching work item details:", error.message);
  }
}

async function analyzeSprint(sprint, workItemDetails, team) {
  const stats = {
    title: `Sprint Stats for '${team}`,
    sprintName: sprint.name,
    startDate: sprint.attributes.startDate,
    endDate: sprint.attributes.finishDate,
    workItemsCompleted: workItemDetails.length,
    velocity: 0,
    userStories: 0,
    bugs: 0,
    issues: 0,
    topPerformer: "",
    bugBasher: "",
  };

  const usersStats = {};

  workItemDetails.forEach((workItem) => {
    const type = workItem.fields["System.WorkItemType"];
    let completedBy = workItem.fields["System.AssignedTo"];
    if (completedBy !== undefined) {
      completedBy = completedBy.displayName;
    } else {
      completedBy = "Unassigned";
    }

    if (!usersStats[completedBy]) {
      usersStats[completedBy] = { userStories: 0, bugs: 0, issues: 0 };
    }

    switch (type) {
      case "User Story":
        stats.userStories++;
        usersStats[completedBy].userStories++;
        const effort = workItem.fields["Microsoft.VSTS.Scheduling.StoryPoints"];
        stats.velocity += effort;
        break;
      case "Bug":
        stats.bugs++;
        usersStats[completedBy].bugs++;
        break;
      case "Issue":
        stats.issues++;
        usersStats[completedBy].issues++;
        break;
      default:
        break;
    }
  });

  let topPerformer = { name: "", count: 0 };
  let bugBasher = { name: "", count: 0 };

  for (const [user, userStat] of Object.entries(usersStats)) {
    if (userStat.userStories > topPerformer.count) {
      topPerformer = { name: user, count: userStat.userStories };
    }

    if (userStat.bugs > bugBasher.count) {
      bugBasher = { name: user, count: userStat.bugs };
    }
  }

  stats.topPerformer = topPerformer.name + ": " + topPerformer.count;
  stats.bugBasher = bugBasher.name + ": " + bugBasher.count;

  return stats;
}

async function fetchAreaPaths() {
  const url = `https://dev.azure.com/${organization}/${project}/_apis/wit/classificationnodes?api-version=${apiVersion}&$depth=10&$expand=all`;

  try {
    const response = await axios.get(url, authHeader);
    const areaPaths = [];

    function extractAreaPaths(node) {
      areaPaths.push(node.path);

      if (node.children) {
        for (const child of node.children) {
          extractAreaPaths(child);
        }
      }
    }

    extractAreaPaths(response.data.value[0]);
    return areaPaths;
  } catch (error) {
    if (error.response && error.response.data) {
      console.error("Error details:", error.response.data);
    }
    console.error("Error fetching area paths:", error.message);
    return null;
  }
}

async function fetchTeamAreaPaths(team) {
  const url = `https://dev.azure.com/${organization}/${project}/${team}/_apis/work/teamsettings/teamfieldvalues?api-version=${apiVersion}`;

  try {
    const response = await axios.get(url, authHeader);
    const teamValues = response.data.values;
    const allAreaPaths = await fetchAreaPaths();
    let teamAreaPaths = [];

    for (const value of teamValues) {
      const normalizedValue = value.value.replace(/^[^\\]*\\/, "\\");
      const actualPath = `\\${project}\\Area${normalizedValue}`;
      const matchingAreaPaths = allAreaPaths.filter((path) =>
        path.includes(actualPath)
      );
      teamAreaPaths = [...teamAreaPaths, ...matchingAreaPaths];
    }

    return teamAreaPaths;
  } catch (error) {
    if (error.response && error.response.data) {
      console.error("Error details:", error.response.data);
    }
    console.error("Error fetching area paths:", error.message);
    return null;
  }
}

async function fetchTeamNames(_organization, _project, patToken) {
  const base64Pat = btoa(":" + patToken);
  authHeader = {
    headers: {
      Authorization: `Basic ${base64Pat}`,
    },
  };

  organization = _organization;
  project = _project;

  const url = `https://dev.azure.com/${organization}/_apis/projects/${project}/teams?api-version=${apiVersion}`;

  try {
    const response = await axios.get(url, authHeader);
    return response.data.value.map((team) => team.name);
  } catch (error) {
    console.error("Error fetching teams:", error.message);
    return null;
  }
}

async function analyzeCurrentSprint(teams) {
  const currentSprint = await fetchCurrentSprint();
  const teamStatsPromises = teams.map(async (team) => {
    const areaPaths = await fetchTeamAreaPaths(team.value);
    const workItemIds = await fetchWorkItems(currentSprint.name, areaPaths);
    const workItemDetails = await fetchWorkItemDetails(workItemIds);
    const stats = await analyzeSprint(
      currentSprint,
      workItemDetails,
      team.value
    );
    return stats;
  });

  const teamStats = await Promise.all(teamStatsPromises);
  return teamStats;
}

export {
  fetchSprints,
  fetchAreaPaths,
  fetchTeamNames,
  fetchTeamAreaPaths,
  fetchWorkItems,
  fetchCurrentSprint,
  analyzeCurrentSprint,
};
