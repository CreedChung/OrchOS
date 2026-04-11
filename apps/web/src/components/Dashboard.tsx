import { useState } from "react"
import { Sidebar } from "#/components/Sidebar"
import { StateBoard } from "#/components/StateBoard"
import { ActivityPanel } from "#/components/ActivityPanel"
import {
  mockGoals,
  mockProjects,
  mockAgents,
  mockStates,
  mockArtifacts,
  mockActivities,
} from "#/lib/mock-data"

export function Dashboard() {
  const [activeGoalId, setActiveGoalId] = useState<string>(mockGoals[0].id)

  const activeGoal = mockGoals.find((g) => g.id === activeGoalId) ?? mockGoals[0]

  const handleStateAction = (stateId: string, action: string) => {
    console.log(`Action "${action}" on state ${stateId}`)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        goals={mockGoals}
        projects={mockProjects}
        agents={mockAgents}
        activeGoalId={activeGoalId}
        onGoalSelect={setActiveGoalId}
      />
      <StateBoard
        goal={activeGoal}
        states={mockStates}
        artifacts={mockArtifacts}
        onStateAction={handleStateAction}
      />
      <ActivityPanel activities={mockActivities} />
    </div>
  )
}
