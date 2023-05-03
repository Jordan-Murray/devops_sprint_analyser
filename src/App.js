import "bootstrap/dist/css/bootstrap.min.css";
import React, { useState } from "react";
import {
  Container,
  Row,
  Col,
  Form,
  Card,
  Button,
  Table,
} from "react-bootstrap";
import "./App.css";
import {
  fetchTeamNames,
  fetchAllSprints,
  analyzeSelectedSprint,
} from "./DevOpsAPI";
import Select from "react-select";

function App() {
  const [teams, setTeams] = useState([]);
  const [sprints, setSprints] = useState([]);

  const [selectedTeams, setSelectedTeams] = useState([]);
  const [selectedSprint, setSelectedSprint] = useState([]);
  const [stats, setStats] = useState([]);
  const [organization, setOrganization] = useState("");
  const [project, setProject] = useState("");
  const [patToken, setPatToken] = useState("");

  async function fetchAndSetTeams() {
    const teamNames = await fetchTeamNames(organization, project, patToken);
    setTeams(teamNames.map((team) => ({ label: team, value: team })));
  }

  async function fetchAndSetSprints() {
    const sprintNames = await fetchAllSprints();
    setSprints(sprintNames.map((sprint) => ({ label: sprint, value: sprint })));
  }

  const handleTeamsChange = (selected) => {
    setSelectedTeams(selected);
  };

  const handleSprintChange = (selected) => {
    setSelectedSprint(selected);
  };

  const analyzeSprints = async () => {
    // const teamStats = await analyzeCurrentSprint(selectedTeams);
    // setStats(teamStats);

    const teamStats = await analyzeSelectedSprint(
      selectedSprint,
      selectedTeams
    );
    setStats(teamStats);
  };

  return (
    <Container className="mt-5">
      <Row>
        <Col>
          <h1 className="text-center">Azure DevOps Sprint Analyzer</h1>
        </Col>
      </Row>
      <Row className="mt-4">
        <Col>
          <Form.Group controlId="organization">
            <Form.Label>Organization:</Form.Label>
            <Form.Control
              type="text"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="Enter organization"
            />
          </Form.Group>
          <Form.Group controlId="project">
            <Form.Label>Project:</Form.Label>
            <Form.Control
              type="text"
              value={project}
              onChange={(e) => setProject(e.target.value)}
              placeholder="Enter project"
            />
          </Form.Group>
          <Form.Group controlId="pat-token">
            <Form.Label>PAT Token:</Form.Label>
            <Form.Control
              type="password"
              value={patToken}
              onChange={(e) => setPatToken(e.target.value)}
              placeholder="Enter Personal Access Token"
            />
          </Form.Group>
        </Col>
      </Row>
      <Row className="mt-4">
        <Col>
          <Form.Group controlId="fetch-teams">
            <Button
              variant="primary"
              onClick={() => {
                fetchAndSetTeams();
                fetchAndSetSprints();
              }}
            >
              Fetch Teams & Sprints
            </Button>
          </Form.Group>
        </Col>
      </Row>
      <Row className="mt-4">
        <Col>
          <Form.Group controlId="team-select">
            <Form.Label>Select teams:</Form.Label>
            <Select
              isMulti
              options={teams}
              onChange={handleTeamsChange}
              className="basic-multi-select"
              classNamePrefix="select"
            />
          </Form.Group>
        </Col>
      </Row>
      <Row className="mt-4">
        <Col>
          <Form.Group controlId="team-select">
            <Form.Label>Select Sprint:</Form.Label>
            <Select
              options={sprints}
              onChange={handleSprintChange}
              className="basic-multi-select"
              classNamePrefix="select"
            />
          </Form.Group>
        </Col>
      </Row>
      <Row className="mt-4">
        <Col>
          <button className="btn btn-primary" onClick={analyzeSprints}>
            Analyze Sprint
          </button>
        </Col>
      </Row>
      {stats.map((stat, index) => (
        <Row key={index} className="mt-4">
          <Col>
            <Card>
              <Card.Header>
                <h2>{stat.title}</h2>
              </Card.Header>
              <Card.Body>
                <p>
                  <strong>Area Paths:</strong>
                </p>
                <ul>
                  {stat.areaPaths &&
                    stat.areaPaths.map((areaPath, i) => (
                      <li key={i}>{areaPath}</li>
                    ))}
                </ul>
                <p>
                  <strong>Sprint:</strong> {stat.sprintName}
                </p>
                <p>
                  <strong>Start Date:</strong> {stat.startDate}
                </p>
                <p>
                  <strong>End Date:</strong> {stat.endDate}
                </p>
                <p>
                  <strong>Work Items Completed:</strong>{" "}
                  {stat.workItemsCompleted}
                </p>
                <p>
                  <strong>Velocity:</strong> {stat.velocity}
                </p>
                <p>
                  <strong>User Stories:</strong> {stat.userStories}
                </p>
                <p>
                  <strong>Bugs:</strong> {stat.bugs}
                </p>
                <p>
                  <strong>Issues:</strong> {stat.issues}
                </p>
                <p>
                  <strong>Top Performer:</strong> {stat.topPerformer}
                </p>
                <p>
                  <strong>Bug Basher:</strong> {stat.bugBasher}
                </p>
                <h4>User Stats:</h4>
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>User Stories</th>
                      <th>Bugs</th>
                      <th>Issues</th>
                      <th>Story Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stat.userStats.map((userStat, userIndex) => (
                      <tr key={userIndex}>
                        <td>{userStat.displayName}</td>
                        <td>{userStat.userStories}</td>
                        <td>{userStat.bugs}</td>
                        <td>{userStat.issues}</td>
                        <td>{userStat.storyPoints}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      ))}
    </Container>
  );
}

export default App;
