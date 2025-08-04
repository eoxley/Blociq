import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from "@/components/ui/blociq-card";
import { CalendarCheck, Plus, CheckCircle2 } from "lucide-react";

interface Task {
  id: number;
  text: string;
  done: boolean;
  dueDate?: string;
}

export default function BuildingToDoWidget() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: 1, text: "Review EICR due by 15 Aug", done: false, dueDate: "2024-08-15" },
    { id: 2, text: "Chase Tri Fire for FRA update", done: false, dueDate: "2024-08-20" },
    { id: 3, text: "Submit Section 20 notice draft", done: true, dueDate: "2024-08-10" },
    { id: 4, text: "Schedule building inspection", done: false, dueDate: "2024-08-25" },
    { id: 5, text: "Update fire safety procedures", done: false, dueDate: "2024-08-30" },
  ]);

  const [newTaskText, setNewTaskText] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const toggleTask = (id: number) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, done: !task.done } : task
      )
    );
  };

  const addTask = () => {
    if (newTaskText.trim()) {
      const newTask: Task = {
        id: Date.now(),
        text: newTaskText.trim(),
        done: false,
      };
      setTasks((prev) => [...prev, newTask]);
      setNewTaskText("");
      setShowAddForm(false);
    }
  };

  const deleteTask = (id: number) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  const formatDueDate = (dueDate?: string) => {
    if (!dueDate) return null;
    const date = new Date(dueDate);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "Overdue";
    if (diffDays === 0) return "Due today";
    if (diffDays === 1) return "Due tomorrow";
    if (diffDays <= 7) return `Due in ${diffDays} days`;
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  const getDueDateColor = (dueDate?: string) => {
    if (!dueDate) return "text-gray-500";
    const date = new Date(dueDate);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "text-red-600";
    if (diffDays <= 3) return "text-orange-600";
    if (diffDays <= 7) return "text-yellow-600";
    return "text-gray-500";
  };

  const completedTasks = tasks.filter((task) => task.done);
  const pendingTasks = tasks.filter((task) => !task.done);

  return (
    <BlocIQCard className="overflow-hidden">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-500 p-6 text-white">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-lg">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Building To-Do</h2>
              <p className="text-sm opacity-90">Tasks and deadlines</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-white border-white/30 hover:bg-white/10 hover:border-white/50 transition-colors"
          >
            <Plus size={16} className="mr-1" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Add Task Form */}
      {showAddForm && (
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <div className="flex gap-2">
            <input
              type="text"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addTask()}
              placeholder="Enter new task..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            />
            <Button
              onClick={addTask}
              disabled={!newTaskText.trim()}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Add
            </Button>
            <Button
              onClick={() => {
                setShowAddForm(false);
                setNewTaskText("");
              }}
              variant="outline"
              size="sm"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Task List */}
      <div className="p-4">
        {tasks.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">All caught up!</p>
            <p className="text-xs text-gray-400 mt-1">No tasks to complete</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Pending Tasks */}
            {pendingTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <Checkbox
                  id={`task-${task.id}`}
                  checked={task.done}
                  onCheckedChange={() => toggleTask(task.id)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-gray-900">{task.text}</span>
                  {task.dueDate && (
                    <div className={`text-xs mt-1 ${getDueDateColor(task.dueDate)}`}>
                      {formatDueDate(task.dueDate)}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}

            {/* Completed Tasks */}
            {completedTasks.length > 0 && (
              <>
                <div className="border-t border-gray-200 my-4"></div>
                <div className="text-xs text-gray-500 mb-2">Completed ({completedTasks.length})</div>
                {completedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-3 rounded-lg opacity-60"
                  >
                    <Checkbox
                      id={`task-${task.id}`}
                      checked={task.done}
                      onCheckedChange={() => toggleTask(task.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-gray-900 line-through">{task.text}</span>
                      {task.dueDate && (
                        <div className="text-xs mt-1 text-gray-400">
                          {formatDueDate(task.dueDate)}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      {tasks.length > 0 && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
          <div className="flex justify-between text-xs text-gray-500">
            <span>{pendingTasks.length} pending</span>
            <span>{completedTasks.length} completed</span>
          </div>
        </div>
      )}
    </BlocIQCard>
  );
} 