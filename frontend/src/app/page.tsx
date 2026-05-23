"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { fetchAPI } from "@/lib/api";
import {
  LogOut,
  Clock,
  CalendarDays,
  BarChart as BarChartIcon,
  Target,
  CheckCircle2,
  Pencil,
  Trash2,
  Trophy,
  ChevronDown,
  ChevronUp,
  Play,
  Square,
  PieChart as PieChartIcon,
  Flame,
  Pause,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface StudyRecord {
  id: number;
  date: string;
  durationMinutes: number;
  content: string;
  goalId?: number;
}

interface Todo {
  id: number;
  content: string;
  isCompleted: boolean;
}

interface Category {
  id: number;
  name: string;
}

interface Goal {
  id: number;
  title: string;
  categoryId?: number;
  category?: Category;
  targetMinutes: number;
  deadline: string;
  isCompleted: boolean;
  progressMinutes: number;
  records?: StudyRecord[];
  todos?: Todo[];
}

interface User {
  id: number;
  name?: string;
  email: string;
}

export default function DashboardPage() {
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [selectedDate, setSelectedDate] = useState(todayStr); // For calendar click
  const [formDate, setFormDate] = useState(todayStr); // For input form
  const [user, setUser] = useState<User | null>(null);
  const [records, setRecords] = useState<StudyRecord[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [totalDuration, setTotalDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editingRecordId, setEditingRecordId] = useState<number | null>(null);
  const [todoDurations, setTodoDurations] = useState<Record<number, string>>(
    {},
  );
  const [editingTodoId, setEditingTodoId] = useState<number | null>(null);
  const [editingTodoContent, setEditingTodoContent] = useState("");
  const [newTodoForGoal, setNewTodoForGoal] = useState<Record<number, string>>(
    {},
  );
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  // Global Stopwatch State
  const [isGlobalTimerActive, setIsGlobalTimerActive] = useState(false);
  const [isGlobalTimerPaused, setIsGlobalTimerPaused] = useState(false);
  const [globalElapsedSeconds, setGlobalElapsedSeconds] = useState(0); // Previously accumulated seconds
  const [currentDisplaySeconds, setCurrentDisplaySeconds] = useState(0); // What is actually shown
  const [globalTimerStartTime, setGlobalTimerStartTime] = useState<
    number | null
  >(null);
  const [globalTimerGoalId, setGlobalTimerGoalId] = useState<number | null>(
    null,
  );
  const [globalTimerDate, setGlobalTimerDate] = useState(todayStr);
  const [isTimerLoaded, setIsTimerLoaded] = useState(false);

  // Undo State
  const [lastCreatedRecordId, setLastCreatedRecordId] = useState<number | null>(
    null,
  );
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [undoTimer, setUndoTimer] = useState<NodeJS.Timeout | null>(null);

  // Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGlobalTimerActive && !isGlobalTimerPaused && globalTimerStartTime) {
      interval = setInterval(() => {
        const now = Date.now();
        const diff = Math.floor((now - globalTimerStartTime) / 1000);
        setCurrentDisplaySeconds(globalElapsedSeconds + diff);
      }, 1000);
    } else {
      setCurrentDisplaySeconds(globalElapsedSeconds);
    }
    return () => clearInterval(interval);
  }, [
    isGlobalTimerActive,
    isGlobalTimerPaused,
    globalTimerStartTime,
    globalElapsedSeconds,
  ]);

  // Persistence Effect: Load from localStorage
  useEffect(() => {
    // Only load if user is set and not loading
    if (!loading && user && !isTimerLoaded) {
      const saved = localStorage.getItem(`timer_state_${user.id}`);
      if (saved) {
        try {
          const state = JSON.parse(saved);
          setIsGlobalTimerActive(state.isActive);
          setIsGlobalTimerPaused(state.isPaused);
          setGlobalElapsedSeconds(state.elapsed);
          setGlobalTimerStartTime(state.startTime);
          setGlobalTimerGoalId(state.goalId);
          setGlobalTimerDate(state.date || todayStr);

          if (state.isActive && !state.isPaused && state.startTime) {
            const now = Date.now();
            const diff = Math.floor((now - state.startTime) / 1000);
            setCurrentDisplaySeconds(state.elapsed + diff);
          } else {
            setCurrentDisplaySeconds(state.elapsed);
          }
        } catch (e) {
          console.error("Failed to restore timer state", e);
        }
      }
      setIsTimerLoaded(true);
    }
  }, [loading, user, isTimerLoaded, todayStr]);

  // Persistence Effect: Save to localStorage
  useEffect(() => {
    if (user && isTimerLoaded) {
      const state = {
        isActive: isGlobalTimerActive,
        isPaused: isGlobalTimerPaused,
        elapsed: globalElapsedSeconds,
        startTime: globalTimerStartTime,
        goalId: globalTimerGoalId,
        date: globalTimerDate,
      };
      localStorage.setItem(`timer_state_${user.id}`, JSON.stringify(state));
    }
  }, [
    isGlobalTimerActive,
    isGlobalTimerPaused,
    globalElapsedSeconds,
    globalTimerStartTime,
    globalTimerGoalId,
    globalTimerDate,
    user,
    isTimerLoaded,
  ]);

  const showUndoNotification = (recordId: number) => {
    if (undoTimer) clearTimeout(undoTimer);
    setLastCreatedRecordId(recordId);
    setShowUndoToast(true);
    const timer = setTimeout(() => {
      setShowUndoToast(false);
    }, 8000); // Show for 8 seconds
    setUndoTimer(timer);
  };

  const handleUndo = async () => {
    if (!lastCreatedRecordId) return;
    try {
      await fetchAPI(`/study-records/${lastCreatedRecordId}`, {
        method: "DELETE",
      });
      setShowUndoToast(false);
      setLastCreatedRecordId(null);
      if (undoTimer) clearTimeout(undoTimer);
      await loadData();
    } catch (err) {
      console.error("取り消しに失敗しました", err);
    }
  };

  const startGlobalTimer = () => {
    setIsGlobalTimerActive(true);
    setIsGlobalTimerPaused(false);
    setGlobalElapsedSeconds(0);
    setGlobalTimerStartTime(Date.now());
  };

  const pauseGlobalTimer = () => {
    if (isGlobalTimerActive && !isGlobalTimerPaused && globalTimerStartTime) {
      const now = Date.now();
      const diff = Math.floor((now - globalTimerStartTime) / 1000);
      setGlobalElapsedSeconds((prev) => prev + diff);
      setIsGlobalTimerPaused(true);
      setGlobalTimerStartTime(null);
    }
  };

  const resumeGlobalTimer = () => {
    if (isGlobalTimerActive && isGlobalTimerPaused) {
      setIsGlobalTimerPaused(false);
      setGlobalTimerStartTime(Date.now());
    }
  };

  const stopGlobalTimer = async () => {
    let totalSeconds = globalElapsedSeconds;
    if (isGlobalTimerActive && !isGlobalTimerPaused && globalTimerStartTime) {
      const now = Date.now();
      const diff = Math.floor((now - globalTimerStartTime) / 1000);
      totalSeconds += diff;
    }

    const minutes = Math.ceil(totalSeconds / 60);
    if (minutes === 0 && totalSeconds > 0) {
      if (!confirm("1分未満の計測ですが、1分として記録しますか？")) {
        setIsGlobalTimerActive(false);
        setIsGlobalTimerPaused(false);
        setGlobalElapsedSeconds(0);
        setGlobalTimerStartTime(null);
        if (user) localStorage.removeItem(`timer_state_${user.id}`);
        return;
      }
    } else if (minutes === 0 && totalSeconds <= 0) {
      setIsGlobalTimerActive(false);
      setIsGlobalTimerPaused(false);
      setGlobalElapsedSeconds(0);
      setGlobalTimerStartTime(null);
      if (user) localStorage.removeItem(`timer_state_${user.id}`);
      return;
    }

    const durationToRecord = Math.max(1, minutes);
    const defaultContent = globalTimerGoalId
      ? `ストップウォッチ計測: ${goals.find((g) => g.id === globalTimerGoalId)?.title || ""}`
      : "ストップウォッチ計測";

    try {
      const newRecord = await fetchAPI("/study-records", {
        method: "POST",
        body: JSON.stringify({
          date: globalTimerDate,
          durationMinutes: durationToRecord,
          content: defaultContent,
          goalId: globalTimerGoalId || null,
        }),
      });

      setIsGlobalTimerActive(false);
      setIsGlobalTimerPaused(false);
      setGlobalElapsedSeconds(0);
      setGlobalTimerStartTime(null);
      setGlobalTimerGoalId(null);
      setGlobalTimerDate(todayStr); // Reset to today after recording
      if (user) localStorage.removeItem(`timer_state_${user.id}`);
      await loadData();
      showUndoNotification(newRecord.id);
    } catch (err) {
      console.error("記録の保存に失敗しました", err);
    }
  };

  // Goal Form State
  const [goalTitle, setGoalTitle] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null,
  );
  const [newCategoryName, setNewCategoryName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalDeadline, setGoalDeadline] = useState(todayStr);
  const [goalTodos, setGoalTodos] = useState<string[]>([]);
  const [newTodoContent, setNewTodoContent] = useState("");
  const [submittingGoal, setSubmittingGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  // Calendar View State
  const [currentDate, setCurrentDate] = useState(new Date());

  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/login");
      return;
    }

    try {
      setUser(JSON.parse(userData));
    } catch {
      router.push("/login");
      return;
    }

    loadData();
  }, [router]);

  const loadData = async () => {
    try {
      const [recordsData, totalData, goalsData, categoriesData] =
        await Promise.all([
          fetchAPI("/study-records"),
          fetchAPI("/study-records/total-duration"),
          fetchAPI("/goals"),
          fetchAPI("/categories"),
        ]);
      setRecords(recordsData);
      setTotalDuration(totalData.totalDurationMinutes);
      setGoals(goalsData || []);
      setCategories(categoriesData || []);
    } catch (err) {
      console.error("データの取得に失敗しました", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const handleGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle || !goalTarget || !goalDeadline) return;

    setSubmittingGoal(true);
    try {
      if (editingGoal) {
        await fetchAPI(`/goals/${editingGoal.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            title: goalTitle,
            categoryId: selectedCategoryId,
            targetMinutes: parseInt(goalTarget) * 60,
            deadline: new Date(goalDeadline).toISOString(),
          }),
        });
        setEditingGoal(null);
      } else {
        await fetchAPI("/goals", {
          method: "POST",
          body: JSON.stringify({
            title: goalTitle,
            categoryId: selectedCategoryId,
            targetMinutes: parseInt(goalTarget) * 60,
            deadline: new Date(goalDeadline).toISOString(),
            todos: goalTodos,
          }),
        });
      }
      setGoalTitle("");
      setSelectedCategoryId(null);
      setGoalTarget("");
      setGoalDeadline(todayStr);
      setGoalTodos([]);
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingGoal(false);
    }
  };

  const handleDeleteGoal = async (id: number) => {
    if (
      !confirm(
        "この目標を削除してもよろしいですか？関連するTODOも削除されます。",
      )
    )
      return;
    try {
      await fetchAPI(`/goals/${id}`, {
        method: "DELETE",
      });
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setGoalTitle(goal.title);
    setSelectedCategoryId(goal.categoryId || null);
    setGoalTarget((goal.targetMinutes / 60).toString());
    setGoalDeadline(new Date(goal.deadline).toISOString().split("T")[0]);

    const element = document.getElementById("goal-form-section");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleCancelGoalEdit = () => {
    setEditingGoal(null);
    setGoalTitle("");
    setSelectedCategoryId(null);
    setGoalTarget("");
    setGoalDeadline(todayStr);
    setGoalTodos([]);
  };

  const handleAddCategory = async () => {
    if (!newCategoryName) return;
    try {
      await fetchAPI("/categories", {
        method: "POST",
        body: JSON.stringify({ name: newCategoryName }),
      });
      setNewCategoryName("");
      await loadData();
    } catch (err: any) {
      console.error(err);
      alert(
        "カテゴリーの追加に失敗しました: " + (err.message || "不明なエラー"),
      );
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (
      !confirm(
        "このカテゴリーを削除しますか？関連する目標のカテゴリー設定も解除されます。",
      )
    )
      return;
    try {
      await fetchAPI(`/categories/${id}`, {
        method: "DELETE",
      });
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleGoal = async (goal: Goal) => {
    try {
      await fetchAPI(`/goals/${goal.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isCompleted: !goal.isCompleted }),
      });
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateTodo = async (todoId: number) => {
    if (!editingTodoContent) return;
    try {
      await fetchAPI(`/goals/todos/${todoId}`, {
        method: "PATCH",
        body: JSON.stringify({ content: editingTodoContent }),
      });
      setEditingTodoId(null);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTodo = async (todoId: number) => {
    if (!confirm("このTODOを削除しますか？")) return;
    try {
      await fetchAPI(`/goals/todos/${todoId}`, {
        method: "DELETE",
      });
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTodoToGoal = async (goalId: number) => {
    const content = newTodoForGoal[goalId];
    if (!content) return;
    try {
      await fetchAPI(`/goals/${goalId}/todos`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      setNewTodoForGoal({ ...newTodoForGoal, [goalId]: "" });
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddRecordFromTodo = async (
    todoId: number,
    todoContent: string,
    goalId: number,
  ) => {
    const durationStr = todoDurations[todoId];
    if (!durationStr || parseInt(durationStr) <= 0) return;

    try {
      const newRecord = await fetchAPI("/study-records", {
        method: "POST",
        body: JSON.stringify({
          date: globalTimerDate,
          durationMinutes: parseInt(durationStr),
          content: todoContent,
          goalId: goalId,
        }),
      });

      // Reset the duration for this todo
      setTodoDurations((prev) => {
        const next = { ...prev };
        delete next[todoId];
        return next;
      });

      await loadData();
      showUndoNotification(newRecord.id);
    } catch (err) {
      console.error("記録の追加に失敗しました", err);
    }
  };

  const handleToggleTodo = async (todoId: number, currentStatus: boolean) => {
    try {
      // Toggle the TODO status
      await fetchAPI(`/goals/todos/${todoId}`, {
        method: "PATCH",
        body: JSON.stringify({ isCompleted: !currentStatus }),
      });
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const blanks = Array(firstDayOfMonth).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthlyTotalDuration = useMemo(() => {
    return records
      .filter((r) => {
        const d = new Date(r.date);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .reduce((sum, r) => sum + r.durationMinutes, 0);
  }, [records, year, month]);

  const GOAL_COLORS = [
    "#6366f1", // Indigo
    "#ec4899", // Pink
    "#22c55e", // Green
    "#f59e0b", // Amber
    "#3b82f6", // Blue
    "#a855f7", // Purple
    "#06b6d4", // Cyan
  ];

  const getGoalColor = (goalId?: number | null) => {
    if (goalId === undefined || goalId === null)
      return "var(--secondary-color)";
    return GOAL_COLORS[goalId % GOAL_COLORS.length];
  };

  const categoryDurations = useMemo(() => {
    const durations: Record<number, { name: string; minutes: number }> = {};
    records.forEach((record) => {
      if (record.goalId) {
        const goal = goals.find((g) => g.id === record.goalId);
        if (goal && goal.categoryId) {
          const category = categories.find((c) => c.id === goal.categoryId);
          if (category) {
            if (!durations[category.id])
              durations[category.id] = { name: category.name, minutes: 0 };
            durations[category.id].minutes += record.durationMinutes;
          }
        }
      }
    });
    return Object.values(durations).sort((a, b) => b.minutes - a.minutes);
  }, [records, goals, categories]);

  // Logic for Last 7 Days (Bar Chart)
  const last7DaysData = useMemo(() => {
    const data = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const dayName = date.toLocaleDateString("ja-JP", { weekday: "short" });

      const dayTotal = records
        .filter((r) => new Date(r.date).toISOString().split("T")[0] === dateStr)
        .reduce((sum, r) => sum + r.durationMinutes, 0);

      data.push({
        name: dayName,
        fullDate: dateStr,
        minutes: dayTotal,
        hours: parseFloat((dayTotal / 60).toFixed(1)),
      });
    }
    return data;
  }, [records]);

  // Logic for Category Distribution (Pie Chart)
  const categoryRatioData = useMemo(() => {
    return categoryDurations.map((cat) => ({
      name: cat.name,
      value: cat.minutes,
    }));
  }, [categoryDurations]);

  // Logic for Streak calculation
  const streaks = useMemo(() => {
    if (records.length === 0) return { current: 0, best: 0 };

    const recordDatesSet = new Set(records.map((r) => r.date.split("T")[0]));

    const sortedDates = Array.from(recordDatesSet).sort((a, b) =>
      b.localeCompare(a),
    );
    if (sortedDates.length === 0) return { current: 0, best: 0 };

    const todayStr = new Date().toISOString().split("T")[0];
    const yesterdayStr = new Date(Date.now() - 86400000)
      .toISOString()
      .split("T")[0];

    let currentStreak = 0;

    // Check if streak is active (today or yesterday)
    if (recordDatesSet.has(todayStr) || recordDatesSet.has(yesterdayStr)) {
      // Start from the most recent day that has a record
      let checkDateStr = recordDatesSet.has(todayStr) ? todayStr : yesterdayStr;

      const [y, m, d] = checkDateStr.split("-").map(Number);
      const checkDate = new Date(y, m - 1, d); // Local date for easier manipulation

      while (true) {
        // Convert checkDate back to YYYY-MM-DD
        const year = checkDate.getFullYear();
        const month = String(checkDate.getMonth() + 1).padStart(2, "0");
        const day = String(checkDate.getDate()).padStart(2, "0");
        const currStr = `${year}-${month}-${day}`;

        if (recordDatesSet.has(currStr)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // Best Streak
    let bestStreak = 0;
    let tempStreak = 0;
    let lastDateObj: Date | null = null;

    const sortedAsc = [...sortedDates].sort((a, b) => a.localeCompare(b));
    sortedAsc.forEach((dateStr) => {
      const [y, m, d] = dateStr.split("-").map(Number);
      const currentDateObj = new Date(y, m - 1, d);

      if (lastDateObj) {
        const diffDays = Math.round(
          (currentDateObj.getTime() - lastDateObj.getTime()) /
            (1000 * 60 * 60 * 24),
        );
        if (diffDays === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      } else {
        tempStreak = 1;
      }

      if (tempStreak > bestStreak) bestStreak = tempStreak;
      lastDateObj = currentDateObj;
    });

    return { current: currentStreak, best: bestStreak };
  }, [records]);

  const CHART_COLORS = [
    "#6366f1",
    "#ec4899",
    "#22c55e",
    "#f59e0b",
    "#3b82f6",
    "#a855f7",
    "#06b6d4",
  ];

  if (loading) return <div className="auth-container">読み込み中...</div>;

  const renderCompletedGoal = (goal: Goal) => {
    return (
      <div
        key={goal.id}
        style={{
          padding: "0.8rem 1rem",
          background: "rgba(34, 197, 94, 0.08)",
          borderRadius: "12px",
          border: "1px solid rgba(34, 197, 94, 0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          transition: "all 0.2s ease",
        }}
        onMouseOver={(e) =>
          (e.currentTarget.style.background = "rgba(34, 197, 94, 0.12)")
        }
        onMouseOut={(e) =>
          (e.currentTarget.style.background = "rgba(34, 197, 94, 0.08)")
        }
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              background: "rgba(34, 197, 94, 0.2)",
              color: "#4ade80",
              padding: "6px",
              borderRadius: "50%",
              display: "flex",
              flexShrink: 0,
            }}
          >
            <Trophy size={16} />
          </div>
          <div style={{ overflow: "hidden" }}>
            {goal.category && (
              <span
                style={{
                  fontSize: "0.6rem",
                  color: "rgba(74, 222, 128, 0.6)",
                  background: "rgba(34, 197, 94, 0.1)",
                  padding: "0 4px",
                  borderRadius: "3px",
                  marginBottom: "2px",
                  display: "inline-block",
                }}
              >
                {goal.category.name}
              </span>
            )}
            <h3
              style={{
                fontSize: "0.9rem",
                fontWeight: 600,
                color: "#4ade80",
                margin: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {goal.title}
            </h3>
            <p
              style={{
                fontSize: "0.7rem",
                color: "rgba(74, 222, 128, 0.7)",
                marginTop: "2px",
              }}
            >
              達成日: {new Date(goal.deadline).toLocaleDateString()}
            </p>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggleGoal(goal);
          }}
          style={{
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.3)",
            cursor: "pointer",
            fontSize: "0.7rem",
            padding: "4px",
          }}
          onMouseOver={(e) => (e.currentTarget.style.color = "#ef4444")}
          onMouseOut={(e) =>
            (e.currentTarget.style.color = "rgba(255,255,255,0.3)")
          }
        >
          戻す
        </button>
      </div>
    );
  };

  const activeGoals = goals.filter((g) => !g.isCompleted);
  const completedGoals = goals.filter((g) => g.isCompleted);

  const renderGoal = (goal: Goal) => {
    const totalTodos = goal.todos?.length || 0;
    const completedTodos = goal.todos?.filter((t) => t.isCompleted).length || 0;
    const progressPct =
      totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;

    const isOverdue = !goal.isCompleted && new Date(goal.deadline) < new Date();
    const goalColor = getGoalColor(goal.id);

    return (
      <div
        key={goal.id}
        style={{
          padding: "1.2rem",
          background: goal.isCompleted
            ? "rgba(34, 197, 94, 0.05)"
            : "rgba(15, 23, 42, 0.4)",
          borderRadius: "12px",
          border: goal.isCompleted
            ? "1px solid rgba(34, 197, 94, 0.3)"
            : `1px solid ${goalColor}33`,
          transition: "all 0.2s ease",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: "4px",
            background: goal.isCompleted ? "#4ade80" : goalColor,
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "0.8rem",
          }}
        >
          <div style={{ paddingRight: "1rem", flex: 1 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "4px",
              }}
            >
              {goal.category && (
                <span
                  style={{
                    fontSize: "0.65rem",
                    background: "rgba(255,255,255,0.1)",
                    color: "var(--text-muted)",
                    padding: "1px 6px",
                    borderRadius: "4px",
                    fontWeight: 500,
                  }}
                >
                  {goal.category.name}
                </span>
              )}
            </div>
            <h3
              style={{
                fontSize: "1.05rem",
                fontWeight: 600,
                color: goal.isCompleted ? "#4ade80" : "inherit",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                margin: 0,
              }}
            >
              {goal.title} {goal.isCompleted && <CheckCircle2 size={16} />}
            </h3>
            <p
              style={{
                color: isOverdue ? "#ef4444" : "var(--text-muted)",
                fontSize: "0.8rem",
                marginTop: "4px",
              }}
            >
              期限: {new Date(goal.deadline).toLocaleDateString()}{" "}
              {isOverdue ? "(期限切れ)" : ""}
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              onClick={() => handleEditGoal(goal)}
              style={{
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.4)",
                cursor: "pointer",
                padding: "4px",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.color = "var(--primary-color)")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.color = "rgba(255,255,255,0.4)")
              }
              title="編集"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={() => handleDeleteGoal(goal.id)}
              style={{
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.4)",
                cursor: "pointer",
                padding: "4px",
              }}
              onMouseOver={(e) => (e.currentTarget.style.color = "#ef4444")}
              onMouseOut={(e) =>
                (e.currentTarget.style.color = "rgba(255,255,255,0.4)")
              }
              title="削除"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleGoal(goal);
              }}
              style={{
                background: "transparent",
                border: `1px solid ${goal.isCompleted ? "#ef4444" : "#4ade80"}`,
                color: goal.isCompleted ? "#ef4444" : "#4ade80",
                padding: "0.3rem 0.5rem",
                borderRadius: "12px",
                cursor: "pointer",
                fontSize: "0.7rem",
                fontWeight: 600,
                transition: "all 0.2s",
                whiteSpace: "nowrap",
              }}
            >
              {goal.isCompleted ? "未完了" : "完了！"}
            </button>
          </div>
        </div>

        <div style={{ marginTop: "0.5rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.8rem",
              marginBottom: "6px",
            }}
          >
            <span style={{ color: "var(--text-muted)" }}>
              進捗: {completedTodos} / {totalTodos} TODO完了
            </span>
            <span
              style={{
                fontWeight: 600,
                color: goal.isCompleted ? "#4ade80" : "var(--primary-color)",
              }}
            >
              {progressPct}%
            </span>
          </div>
          <div
            style={{
              width: "100%",
              height: "6px",
              background: "rgba(255, 255, 255, 0.1)",
              borderRadius: "3px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progressPct}%`,
                height: "100%",
                background: goal.isCompleted ? "#4ade80" : goalColor,
                borderRadius: "3px",
                transition: "width 0.5s ease",
              }}
            />
          </div>
        </div>

        {goal.todos && (
          <div
            style={{
              marginTop: "1rem",
              borderTop: "1px solid rgba(255,255,255,0.05)",
              paddingTop: "0.8rem",
            }}
          >
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {goal.todos.map((todo) => (
                <div
                  key={todo.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "6px 8px",
                    background: "rgba(255,255,255,0.02)",
                    borderRadius: "6px",
                    transition: "all 0.2s",
                    position: "relative",
                  }}
                  className="todo-item-group"
                >
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleTodo(todo.id, todo.isCompleted);
                    }}
                    style={{
                      width: "18px",
                      height: "18px",
                      border: `2px solid ${todo.isCompleted ? "#4ade80" : "rgba(255,255,255,0.3)"}`,
                      borderRadius: "5px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: todo.isCompleted ? "#4ade80" : "transparent",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    {todo.isCompleted && (
                      <CheckCircle2 size={12} color="white" strokeWidth={3} />
                    )}
                  </div>

                  {editingTodoId === todo.id ? (
                    <input
                      type="text"
                      className="input-field"
                      value={editingTodoContent}
                      onChange={(e) => setEditingTodoContent(e.target.value)}
                      onBlur={() => handleUpdateTodo(todo.id)}
                      onKeyPress={(e) =>
                        e.key === "Enter" && handleUpdateTodo(todo.id)
                      }
                      autoFocus
                      style={{
                        padding: "2px 4px",
                        fontSize: "0.85rem",
                        margin: 0,
                        height: "auto",
                      }}
                    />
                  ) : (
                    <span
                      onClick={() => {
                        setEditingTodoId(todo.id);
                        setEditingTodoContent(todo.content);
                      }}
                      style={{
                        flexGrow: 1,
                        fontSize: "0.85rem",
                        color: todo.isCompleted
                          ? "rgba(255,255,255,0.3)"
                          : "#f1f5f9",
                        textDecoration: todo.isCompleted
                          ? "line-through"
                          : "none",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        cursor: "text",
                      }}
                    >
                      {todo.content}
                    </span>
                  )}

                  {!todo.isCompleted && editingTodoId !== todo.id && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <input
                          type="number"
                          min="0"
                          placeholder="分"
                          value={todoDurations[todo.id] || ""}
                          onChange={(e) =>
                            setTodoDurations({
                              ...todoDurations,
                              [todo.id]: e.target.value,
                            })
                          }
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            width: "40px",
                            background: "rgba(0,0,0,0.3)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "4px",
                            color: "white",
                            fontSize: "0.75rem",
                            padding: "2px 4px",
                            textAlign: "center",
                          }}
                        />
                        <span
                          style={{
                            fontSize: "0.65rem",
                            color: "var(--text-muted)",
                            marginRight: "4px",
                          }}
                        >
                          分
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddRecordFromTodo(
                              todo.id,
                              todo.content,
                              goal.id,
                            );
                          }}
                          disabled={
                            !todoDurations[todo.id] ||
                            parseInt(todoDurations[todo.id]) <= 0
                          }
                          style={{
                            background:
                              !todoDurations[todo.id] ||
                              parseInt(todoDurations[todo.id]) <= 0
                                ? "rgba(255, 255, 255, 0.05)"
                                : "rgba(99, 102, 241, 0.2)",
                            border: `1px solid ${!todoDurations[todo.id] || parseInt(todoDurations[todo.id]) <= 0 ? "rgba(255, 255, 255, 0.1)" : "var(--primary-color)"}`,
                            color:
                              !todoDurations[todo.id] ||
                              parseInt(todoDurations[todo.id]) <= 0
                                ? "var(--text-muted)"
                                : "var(--primary-color)",
                            cursor:
                              !todoDurations[todo.id] ||
                              parseInt(todoDurations[todo.id]) <= 0
                                ? "not-allowed"
                                : "pointer",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            fontSize: "0.65rem",
                            fontWeight: 600,
                            transition: "all 0.2s",
                            opacity:
                              !todoDurations[todo.id] ||
                              parseInt(todoDurations[todo.id]) <= 0
                                ? 0.5
                                : 1,
                          }}
                          onMouseOver={(e) => {
                            if (
                              !(
                                !todoDurations[todo.id] ||
                                parseInt(todoDurations[todo.id]) <= 0
                              )
                            ) {
                              e.currentTarget.style.background =
                                "var(--primary-color)";
                              e.currentTarget.style.color = "white";
                            }
                          }}
                          onMouseOut={(e) => {
                            if (
                              !(
                                !todoDurations[todo.id] ||
                                parseInt(todoDurations[todo.id]) <= 0
                              )
                            ) {
                              e.currentTarget.style.background =
                                "rgba(99, 102, 241, 0.2)";
                              e.currentTarget.style.color =
                                "var(--primary-color)";
                            }
                          }}
                        >
                          追加
                        </button>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTodo(todo.id);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "rgba(239, 68, 68, 0.4)",
                          cursor: "pointer",
                          padding: "2px",
                        }}
                        onMouseOver={(e) =>
                          (e.currentTarget.style.color = "#ef4444")
                        }
                        onMouseOut={(e) =>
                          (e.currentTarget.style.color =
                            "rgba(239, 68, 68, 0.4)")
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* Add New TODO Input inside Goal Card */}
              <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                <input
                  type="text"
                  placeholder="+ TODOを追加"
                  value={newTodoForGoal[goal.id] || ""}
                  onChange={(e) =>
                    setNewTodoForGoal({
                      ...newTodoForGoal,
                      [goal.id]: e.target.value,
                    })
                  }
                  onKeyPress={(e) =>
                    e.key === "Enter" && handleAddTodoToGoal(goal.id)
                  }
                  style={{
                    flexGrow: 1,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    borderRadius: "6px",
                    padding: "6px 10px",
                    fontSize: "0.8rem",
                    color: "white",
                  }}
                />
                <button
                  onClick={() => handleAddTodoToGoal(goal.id)}
                  style={{
                    background: "rgba(99, 102, 241, 0.2)",
                    border: "none",
                    borderRadius: "6px",
                    color: "var(--primary-color)",
                    padding: "0 12px",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  追加
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>
            スタディトラッカー
          </h1>
          <p style={{ color: "var(--text-muted)" }}>
            おかえりなさい、{user?.name || user?.email} さん
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="btn-primary"
          style={{
            width: "auto",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 1rem",
          }}
        >
          <LogOut size={18} /> ログアウト
        </button>
      </header>

      {/* Global Stopwatch / Study Session Panel */}
      <div
        className="glass-panel"
        style={{
          marginBottom: "2rem",
          background: isGlobalTimerActive
            ? "rgba(99, 102, 241, 0.1)"
            : "var(--surface-color)",
          border: isGlobalTimerActive
            ? "1px solid var(--primary-color)"
            : "1px solid var(--border-color)",
          transition: "all 0.3s ease",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div
              style={{
                width: "50px",
                height: "50px",
                borderRadius: "50%",
                background: isGlobalTimerActive
                  ? "var(--primary-color)"
                  : "rgba(255,255,255,0.05)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: isGlobalTimerActive ? "pulse 2s infinite" : "none",
              }}
            >
              <Clock
                size={24}
                color={isGlobalTimerActive ? "white" : "var(--text-muted)"}
              />
            </div>
            <div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>
                {isGlobalTimerActive
                  ? "学習セッション計測中..."
                  : "学習タイマーを開始"}
              </h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                {isGlobalTimerActive
                  ? "集中して取り組みましょう！"
                  : "ボタンを押して計測を開始します。"}
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1.5rem",
              flexWrap: "wrap",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: 700,
                  fontFamily: "monospace",
                  minWidth: "120px",
                }}
              >
                {Math.floor(currentDisplaySeconds / 3600)
                  .toString()
                  .padStart(2, "0")}
                :
                {Math.floor((currentDisplaySeconds % 3600) / 60)
                  .toString()
                  .padStart(2, "0")}
                :{(currentDisplaySeconds % 60).toString().padStart(2, "0")}
              </div>
            </div>

            <div
              style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
            >
              {!isGlobalTimerActive && (
                <>
                  <input
                    type="date"
                    className="input-field"
                    style={{
                      width: "auto",
                      padding: "0.5rem",
                      fontSize: "0.85rem",
                    }}
                    value={globalTimerDate}
                    onChange={(e) => setGlobalTimerDate(e.target.value)}
                  />
                  <select
                    className="input-field"
                    style={{
                      width: "auto",
                      padding: "0.5rem",
                      fontSize: "0.85rem",
                    }}
                    value={globalTimerGoalId || ""}
                    onChange={(e) =>
                      setGlobalTimerGoalId(
                        e.target.value ? parseInt(e.target.value) : null,
                      )
                    }
                  >
                    <option value="">目標を選択 (任意)</option>
                    {activeGoals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title}
                      </option>
                    ))}
                  </select>
                </>
              )}

              {isGlobalTimerActive ? (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  {isGlobalTimerPaused ? (
                    <button
                      onClick={resumeGlobalTimer}
                      className="btn-primary"
                      style={{
                        background: "var(--secondary-color)",
                        width: "auto",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.6rem 1.2rem",
                      }}
                    >
                      <Play size={18} fill="white" /> 再開
                    </button>
                  ) : (
                    <button
                      onClick={pauseGlobalTimer}
                      className="btn-primary"
                      style={{
                        background: "#f59e0b",
                        width: "auto",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.6rem 1.2rem",
                      }}
                    >
                      <Pause size={18} fill="white" /> 一時停止
                    </button>
                  )}
                  <button
                    onClick={stopGlobalTimer}
                    className="btn-primary"
                    style={{
                      background: "#ef4444",
                      width: "auto",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.6rem 1.2rem",
                      boxShadow: "0 4px 14px 0 rgba(239, 68, 68, 0.39)",
                    }}
                  >
                    <Square size={18} fill="white" /> 終了
                  </button>
                </div>
              ) : (
                <button
                  onClick={startGlobalTimer}
                  className="btn-primary"
                  style={{
                    width: "auto",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.6rem 1.5rem",
                  }}
                >
                  <Play size={18} fill="white" /> 計測開始
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Global Stats Grid placed at the top */}
      <div
        className="stats-grid"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
        }}
      >
        <div
          className="stat-card"
          style={{
            background:
              streaks.current > 0
                ? "rgba(255, 77, 0, 0.05)"
                : "var(--surface-color)",
            border:
              streaks.current > 0
                ? "1px solid rgba(255, 77, 0, 0.3)"
                : "1px solid var(--border-color)",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {streaks.current > 0 && (
            <div
              style={{
                position: "absolute",
                top: "-20px",
                right: "-20px",
                width: "100px",
                height: "100px",
                background:
                  "radial-gradient(circle, rgba(255, 77, 0, 0.15) 0%, transparent 70%)",
                animation: "flame-glow 3s infinite ease-in-out",
              }}
            />
          )}
          <div
            className="stat-title"
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <Flame
              size={16}
              color={
                streaks.current >= 30
                  ? "#ff0000"
                  : streaks.current >= 7
                    ? "#ff4d00"
                    : streaks.current > 0
                      ? "#ff8c00"
                      : "var(--text-muted)"
              }
              style={{
                animation:
                  streaks.current > 0
                    ? `flame-pulse ${streaks.current >= 7 ? "1s" : "2s"} infinite ease-in-out`
                    : "none",
                filter:
                  streaks.current >= 7
                    ? "drop-shadow(0 0 4px rgba(255, 77, 0, 0.6))"
                    : "none",
              }}
            />
            連続学習日数
          </div>
          <div
            className="stat-value"
            style={{
              fontSize: "1.5rem",
              background:
                streaks.current > 0
                  ? "linear-gradient(135deg, #fff, #ff8c00)"
                  : "linear-gradient(135deg, #fff, var(--secondary-color))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              display: "flex",
              alignItems: "baseline",
              gap: "4px",
            }}
          >
            {streaks.current}{" "}
            <span
              style={{
                fontSize: "0.9rem",
                fontWeight: 500,
                WebkitTextFillColor: "var(--text-muted)",
              }}
            >
              日連続
            </span>
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              marginTop: "4px",
            }}
          >
            最高記録: {streaks.best} 日
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-title">
            <Clock
              size={16}
              style={{ display: "inline", marginRight: "8px" }}
            />
            総合学習時間
          </div>
          <div className="stat-value" style={{ fontSize: "1.5rem" }}>
            {Math.floor(totalDuration / 60)}h {totalDuration % 60}m
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-title">
            <BarChartIcon
              size={16}
              style={{ display: "inline", marginRight: "8px" }}
            />
            月間合計
          </div>
          <div className="stat-value" style={{ fontSize: "1.5rem" }}>
            {Math.floor(monthlyTotalDuration / 60)}h {monthlyTotalDuration % 60}
            m
          </div>
        </div>
        <div
          className="stat-card"
          style={{ display: "flex", flexDirection: "column" }}
        >
          <div className="stat-title">
            <Target
              size={16}
              style={{ display: "inline", marginRight: "8px" }}
            />
            カテゴリー別学習時間
          </div>
          <div
            style={{
              marginTop: "0.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              maxHeight: "80px",
              overflowY: "auto",
            }}
          >
            {categoryDurations.length > 0 ? (
              categoryDurations.map((cat, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.8rem",
                  }}
                >
                  <span
                    style={{
                      color: "var(--text-muted)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      paddingRight: "8px",
                    }}
                  >
                    {cat.name}
                  </span>
                  <span style={{ fontWeight: 600 }}>
                    {Math.floor(cat.minutes / 60)}h {cat.minutes % 60}m
                  </span>
                </div>
              ))
            ) : (
              <div
                style={{
                  fontSize: "0.7rem",
                  color: "var(--text-muted)",
                  textAlign: "center",
                  padding: "5px 0",
                }}
              >
                記録なし
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
          gap: "1.5rem",
          marginTop: "1.5rem",
        }}
      >
        {/* Weekly Bar Chart */}
        <div className="glass-panel" style={{ minHeight: "350px" }}>
          <h2
            className="panel-title"
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <BarChartIcon size={18} /> 直近7日間の学習状況 (h)
          </h2>
          <div style={{ width: "100%", height: "280px", marginTop: "1rem" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={last7DaysData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(15, 23, 42, 0.9)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "#fff",
                  }}
                  itemStyle={{ color: "var(--primary-color)" }}
                  cursor={{ fill: "rgba(255,255,255,0.05)" }}
                />
                <Bar
                  dataKey="hours"
                  fill="var(--primary-color)"
                  radius={[4, 4, 0, 0]}
                  animationDuration={1500}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Ratio Pie Chart */}
        <div className="glass-panel" style={{ minHeight: "350px" }}>
          <h2
            className="panel-title"
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <PieChartIcon size={18} /> カテゴリー別割合
          </h2>
          <div style={{ width: "100%", height: "280px", marginTop: "1rem" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryRatioData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  animationDuration={1500}
                >
                  {categoryRatioData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number | string | undefined) => {
                    if (value === undefined) return "";
                    const val =
                      typeof value === "string" ? parseInt(value) : value;
                    const hours = Math.floor(val / 60);
                    const minutes = val % 60;
                    return `${hours}h ${minutes}m`;
                  }}
                  contentStyle={{
                    background: "rgba(15, 23, 42, 0.9)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "#fff",
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  wrapperStyle={{ fontSize: "12px", paddingTop: "20px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "0.8fr 1.6fr",
          gap: "2rem",
          alignItems: "start",
          marginTop: "1rem",
        }}
      >
        {/* =========================================
            LEFT COLUMN: CONTROLS (SETTING & CALENDAR)
        ========================================= */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              paddingLeft: "0.5rem",
            }}
          >
            <Target size={24} color="var(--primary-color)" />
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
              目標設定
            </h2>
          </div>

          <div className="glass-panel" style={{ height: "fit-content" }}>
            <h2 className="panel-title">
              <Target size={18} /> 新しい目標を設定
            </h2>
            <form
              onSubmit={handleGoalSubmit}
              style={{ display: "flex", flexDirection: "column" }}
            >
              <div className="input-group">
                <label>目標タイトル</label>
                <input
                  type="text"
                  className="input-field"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  required
                  placeholder="例: AWS認定資格の勉強"
                />
              </div>

              {/* Category Selection */}
              <div className="input-group">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "4px",
                  }}
                >
                  <label style={{ marginBottom: 0 }}>カテゴリー</label>
                  <button
                    type="button"
                    onClick={() => setShowCategoryManager(true)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--primary-color)",
                      fontSize: "0.7rem",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    + 編集
                  </button>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "6px",
                    marginTop: "4px",
                  }}
                >
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      onClick={() =>
                        setSelectedCategoryId(
                          selectedCategoryId === cat.id ? null : cat.id,
                        )
                      }
                      style={{
                        padding: "3px 10px",
                        borderRadius: "12px",
                        fontSize: "0.7rem",
                        cursor: "pointer",
                        background:
                          selectedCategoryId === cat.id
                            ? "var(--primary-color)"
                            : "rgba(255,255,255,0.05)",
                        border: `1px solid ${selectedCategoryId === cat.id ? "var(--primary-color)" : "rgba(255,255,255,0.1)"}`,
                        color:
                          selectedCategoryId === cat.id
                            ? "#fff"
                            : "var(--text-muted)",
                        transition: "all 0.15s",
                      }}
                    >
                      {cat.name}
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                }}
              >
                <div className="input-group">
                  <label>目標 (h)</label>
                  <input
                    type="number"
                    min="1"
                    className="input-field"
                    value={goalTarget}
                    onChange={(e) => setGoalTarget(e.target.value)}
                    required
                    placeholder="20"
                  />
                </div>
                <div className="input-group">
                  <label>期限</label>
                  <input
                    type="date"
                    className="input-field"
                    value={goalDeadline}
                    onChange={(e) => setGoalDeadline(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* TODO List Input */}
              <div className="input-group">
                <label>TODOリスト (任意)</label>
                <div
                  style={{ display: "flex", gap: "8px", marginBottom: "8px" }}
                >
                  <input
                    type="text"
                    className="input-field"
                    value={newTodoContent}
                    onChange={(e) => setNewTodoContent(e.target.value)}
                    placeholder="TODOを追加"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (newTodoContent) {
                          setGoalTodos([...goalTodos, newTodoContent]);
                          setNewTodoContent("");
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newTodoContent) {
                        setGoalTodos([...goalTodos, newTodoContent]);
                        setNewTodoContent("");
                      }
                    }}
                    className="btn-primary"
                    style={{ width: "auto", padding: "0 1rem" }}
                  >
                    +
                  </button>
                </div>
                {goalTodos.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      background: "rgba(255,255,255,0.03)",
                      padding: "10px",
                      borderRadius: "10px",
                      marginBottom: "10px",
                    }}
                  >
                    {goalTodos.map((todo, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "0.8rem",
                        }}
                      >
                        <span>• {todo}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setGoalTodos(goalTodos.filter((_, i) => i !== idx))
                          }
                          style={{
                            background: "none",
                            border: "none",
                            color: "#ef4444",
                            cursor: "pointer",
                            fontSize: "0.75rem",
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submittingGoal}
                  style={{ flex: 2 }}
                >
                  {submittingGoal
                    ? "保存中..."
                    : editingGoal
                      ? "更新する"
                      : "目標を追加"}
                </button>
                {editingGoal && (
                  <button
                    type="button"
                    onClick={handleCancelGoalEdit}
                    className="btn-primary"
                    style={{
                      flex: 1,
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "var(--text-muted)",
                    }}
                  >
                    キャンセル
                  </button>
                )}
              </div>
            </form>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              paddingLeft: "0.5rem",
              marginTop: "1rem",
            }}
          >
            <CalendarDays size={24} color="var(--primary-color)" />
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
              カレンダー
            </h2>
          </div>

          {/* Calendar Component */}
          <div className="glass-panel">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <button
                onClick={handlePrevMonth}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                }}
              >
                ◀
              </button>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>
                {currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月
              </h2>
              <button
                onClick={handleNextMonth}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                }}
              >
                ▶
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: "4px",
                textAlign: "center",
                marginBottom: "10px",
              }}
            >
              {["日", "月", "火", "水", "木", "金", "土"].map((d) => (
                <div
                  key={d}
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                  }}
                >
                  {d}
                </div>
              ))}
              {blanks.map((_, i) => (
                <div key={`blank-${i}`} />
              ))}
              {days.map((day) => {
                const dateStr = new Date(Date.UTC(year, month, day))
                  .toISOString()
                  .split("T")[0];
                const dayRecords = records.filter(
                  (r) =>
                    new Date(r.date).toISOString().split("T")[0] === dateStr,
                );
                const dayTotal = dayRecords.reduce(
                  (sum, r) => sum + r.durationMinutes,
                  0,
                );
                const hasRecords = dayTotal > 0;
                const isSelected = selectedDate === dateStr;

                return (
                  <div
                    key={day}
                    onClick={() => {
                      setSelectedDate(dateStr);
                      setFormDate(dateStr);
                    }}
                    style={{
                      padding: "6px 2px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      background: isSelected
                        ? "var(--primary-color)"
                        : hasRecords
                          ? "rgba(236, 72, 153, 0.2)"
                          : "rgba(255, 255, 255, 0.05)",
                      color: isSelected ? "#fff" : "inherit",
                      border: isSelected
                        ? "1px solid var(--primary-hover)"
                        : hasRecords
                          ? "1px solid var(--secondary-color)"
                          : "1px solid transparent",
                      transition: "all 0.2s ease",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "2px",
                      minHeight: "40px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.8rem",
                        fontWeight: hasRecords || isSelected ? 600 : 400,
                      }}
                    >
                      {day}
                    </span>
                    {hasRecords && (
                      <span
                        style={{
                          fontSize: "0.6rem",
                          opacity: 0.8,
                          color: isSelected ? "#fff" : "var(--secondary-color)",
                          fontWeight: 700,
                        }}
                      >
                        {dayTotal >= 60
                          ? `${Math.floor(dayTotal / 60)}h`
                          : `${dayTotal}m`}
                      </span>
                    )}
                  </div>
                );
              })}{" "}
            </div>
          </div>
        </div>

        {/* =========================================
            RIGHT COLUMN: CURRENT GOALS
        ========================================= */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              paddingLeft: "0.5rem",
            }}
          >
            <Target size={24} color="var(--primary-color)" />
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
              現在の目標
            </h2>
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
          >
            <div className="glass-panel" style={{ height: "fit-content" }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                  overflowY: "auto",
                  maxHeight: "800px",
                  marginBottom: "1.2rem",
                  paddingRight: "6px",
                }}
              >
                {activeGoals.length > 0 ? (
                  activeGoals.map(renderGoal)
                ) : (
                  <div
                    style={{
                      textAlign: "center",
                      color: "var(--text-muted)",
                      padding: "2.5rem 0",
                      fontSize: "0.9rem",
                    }}
                  >
                    現在の目標はありません。
                  </div>
                )}
              </div>

              <div
                onClick={() => setShowCompleted(!showCompleted)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                  paddingTop: "1rem",
                  borderTop: "1px solid rgba(255,255,255,0.1)",
                  marginBottom: "0.8rem",
                }}
              >
                <h2
                  className="panel-title"
                  style={{ marginBottom: 0, fontSize: "0.95rem" }}
                >
                  <Trophy size={18} style={{ color: "#4ade80" }} /> 完了した目標
                  ({completedGoals.length})
                </h2>
                {showCompleted ? (
                  <ChevronUp size={18} color="var(--text-muted)" />
                ) : (
                  <ChevronDown size={18} color="var(--text-muted)" />
                )}
              </div>

              {showCompleted && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                    overflowY: "auto",
                    maxHeight: "400px",
                    animation: "slideUp 0.3s ease-out",
                    paddingBottom: "0.5rem",
                  }}
                >
                  {completedGoals.map(renderCompletedGoal)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Category Manager Modal */}
      {showCategoryManager && (
        <div
          onClick={() => setShowCategoryManager(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(8px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1100,
            padding: "1rem",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-panel"
            style={{
              width: "100%",
              maxWidth: "400px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)",
              animation: "slideUp 0.3s ease-out",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
                borderBottom: "1px solid var(--border-color)",
                paddingBottom: "1rem",
              }}
            >
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>
                カテゴリーを編集
              </h2>
              <button
                onClick={() => setShowCategoryManager(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{ display: "flex", gap: "8px", marginBottom: "1.5rem" }}
            >
              <input
                type="text"
                className="input-field"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="新しいカテゴリー名"
                onKeyPress={(e) => e.key === "Enter" && handleAddCategory()}
              />
              <button
                onClick={handleAddCategory}
                className="btn-primary"
                style={{ width: "auto", padding: "0 1rem" }}
              >
                追加
              </button>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                maxHeight: "300px",
                overflowY: "auto",
              }}
            >
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 12px",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: "8px",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <span style={{ fontSize: "0.9rem" }}>{cat.name}</span>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#ef4444",
                      cursor: "pointer",
                      padding: "4px",
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {categories.length === 0 && (
                <p
                  style={{
                    textAlign: "center",
                    color: "var(--text-muted)",
                    fontSize: "0.85rem",
                    padding: "1rem",
                  }}
                >
                  カテゴリーがありません。
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Undo Notification Toast */}
      {showUndoToast && (
        <div
          style={{
            position: "fixed",
            bottom: "2rem",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(15, 23, 42, 0.95)",
            backdropFilter: "blur(12px)",
            border: "1px solid var(--primary-color)",
            borderRadius: "12px",
            padding: "1rem 1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "1.5rem",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)",
            zIndex: 2000,
            animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
            minWidth: "300px",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <CheckCircle2 size={18} color="#4ade80" />
            <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>
              記録を保存しました
            </span>
          </div>
          <button
            onClick={handleUndo}
            style={{
              background: "rgba(99, 102, 241, 0.1)",
              border: "1px solid var(--primary-color)",
              color: "var(--primary-color)",
              padding: "0.4rem 1rem",
              borderRadius: "8px",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "var(--primary-color)";
              e.currentTarget.style.color = "white";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "rgba(99, 102, 241, 0.1)";
              e.currentTarget.style.color = "var(--primary-color)";
            }}
          >
            取り消す
          </button>
        </div>
      )}
    </div>
  );
}
