import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, Reorder } from "motion/react";
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  deleteDoc, 
  query, 
  where,
  serverTimestamp,
  getDoc,
  writeBatch
} from "firebase/firestore";
import { db } from "./lib/firebase";
import { Download, Upload, Plus, ChevronLeft, Check, Trash2, X, Copy, RefreshCw, Key, Calendar as CalendarIcon, LayoutList, ChevronRight, GripVertical } from "lucide-react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  parseISO,
  isToday
} from "date-fns";

// Constants
const COLORS = ["col0", "col1", "col2", "col3", "col4", "col5", "col6", "col7"];
const DEFAULT_MONTHS = ["September", "October", "November"];
const SYNC_KEY_LS = "lesson_app_sync_key";

const createFact = (text: string): Fact => ({
  id: Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
  text
});

const INITIAL_CARDS: Omit<LessonCard, "updatedAt">[] = [
  {
    id: "c1",
    icon: "🌐",
    year: "Year 8",
    title: "HTML & CSS",
    color: "col0",
    order: 0,
    facts: [
      createFact("Markup (HTML) defines structure; CSS controls appearance"),
      createFact("Tags, attributes, selectors, and the box model are core concepts"),
      createFact("Separation of concerns — content vs. presentation"),
      createFact("Files render live in a browser — no compilation needed")
    ],
    notes: "",
    month: "September",
    date: "2026-09-07"
  },
  {
    id: "c1_2",
    icon: "🛡️",
    year: "Year 8",
    title: "e-Safety & Privacy",
    color: "col7",
    order: 1,
    facts: [
      createFact("Understanding digital footprints and long-term consequences"),
      createFact("Recognizing phishing, social engineering, and online risks"),
      createFact("Strong passwords and multi-factor authentication (MFA)"),
      createFact("Privacy settings and data harvesting by major platforms")
    ],
    notes: "",
    month: "September",
    date: "2026-09-10"
  },
  {
    id: "c2",
    icon: "🤖",
    year: "Year 9",
    title: "VEX VR Robotics",
    color: "col1",
    order: 2,
    facts: [
      createFact("Block-based or Python coding controls a virtual robot"),
      createFact("Reinforces sequencing, loops, and conditional logic"),
      createFact("Sensor inputs drive real-time decisions in the simulation"),
      createFact("Decomposition — break the challenge into smaller moves")
    ],
    notes: "",
    month: "September",
    date: "2026-09-14"
  },
  {
    id: "c2_2",
    icon: "🔢",
    year: "Year 9",
    title: "Data Representation",
    color: "col4",
    order: 3,
    facts: [
      createFact("Binary (Base-2) and Hexadecimal (Base-16) systems"),
      createFact("How text (ASCII/Unicode) and images are stored as bits"),
      createFact("Conversion between binary, denary, and hexadecimal"),
      createFact("Logic gates (AND, OR, NOT) and truth tables")
    ],
    notes: "",
    month: "September",
    date: "2026-09-17"
  },
  {
    id: "c3",
    icon: "⚙️",
    year: "Year 10",
    title: "Functions & Subprograms",
    color: "col2",
    order: 4,
    facts: [
      createFact("A function is a named, reusable block of code"),
      createFact("Parameters pass data in; return values pass results out"),
      createFact("Reduces repetition and makes programs easier to maintain"),
      createFact("Scope — variables inside a function are local by default")
    ],
    notes: "",
    month: "September",
    date: "2026-09-21"
  },
  {
    id: "c3_2",
    icon: "🧠",
    year: "Year 10",
    title: "Algorithms & Search",
    color: "col6",
    order: 5,
    facts: [
      createFact("Linear search vs Binary search for efficiency"),
      createFact("Bubble sort and Merge sort processes"),
      createFact("Flowcharts and Pseudocode for designing logic"),
      createFact("Computational Thinking: Abstraction and Pattern Recognition")
    ],
    notes: "",
    month: "September",
    date: "2026-09-24"
  },
  {
    id: "c4",
    icon: "🗄️",
    year: "Year 12",
    title: "Relational SQL",
    color: "col3",
    order: 6,
    facts: [
      createFact("Structured Query Language for relational databases"),
      createFact("SELECT, WHERE, ORDER BY, GROUP BY are foundational clauses"),
      createFact("JOINs combine data across multiple tables via keys"),
      createFact("DDL (CREATE/ALTER) vs DML (INSERT/UPDATE/DELETE)")
    ],
    notes: "",
    month: "September",
    date: "2026-09-28"
  },
  {
    id: "c4_2",
    icon: "🚀",
    year: "Year 12",
    title: "Computational Complexity",
    color: "col5",
    order: 7,
    facts: [
      createFact("Big O notation — measuring algorithm performance"),
      createFact("Time complexity (O(1), O(n), O(n²), O(log n))"),
      createFact("Space complexity — memory usage across data structures"),
      createFact("Comparing iterative vs recursive approach efficiencies")
    ],
    notes: "",
    month: "September",
    date: "2026-09-30"
  }
];

interface Fact {
  id: string;
  text: string;
}

interface LessonCard {
  id: string;
  icon: string;
  year: string;
  title: string;
  color: string;
  facts: Fact[];
  notes: string;
  month: string;
  date: string;
  order: number;
  updatedAt?: any;
}

interface UserConfig {
  title: string;
  activeMonth: string;
  months: string[];
}

export default function App() {
  const [syncKey, setSyncKey] = useState<string | null>(localStorage.getItem(SYNC_KEY_LS));
  const [config, setConfig] = useState<UserConfig>({
    title: "Lesson Display",
    activeMonth: "September",
    months: DEFAULT_MONTHS,
  });
  const [cards, setCards] = useState<LessonCard[]>([]);
  const [currentCardId, setCurrentCardId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [modalType, setModalType] = useState<"month" | "export" | "import" | "delete" | "copy" | "sync" | null>(null);
  const [tempMonth, setTempMonth] = useState("");
  const [importText, setImportText] = useState("");
  const [idToDelete, setIdToDelete] = useState<string | null>(null);
  const [targetMonth, setTargetMonth] = useState("");
  const [newSyncKey, setNewSyncKey] = useState("");
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [yearFilter, setYearFilter] = useState<string>("All Years");

  const yearGroups = ["All Years", ...Array.from(new Set(cards.map(c => c.year))).sort()];

  // Auto-focus calendar on first lesson if current month is empty
  useEffect(() => {
    if (viewMode === "calendar" && cards.length > 0) {
      const currentMonthLessons = cards.filter(c => isSameMonth(parseISO(c.date), calendarDate));
      if (currentMonthLessons.length === 0) {
        // Find the earliest lesson
        const sortedLessons = [...cards].sort((a, b) => a.date.localeCompare(b.date));
        const firstLessonDate = parseISO(sortedLessons[0].date);
        if (!isSameMonth(firstLessonDate, calendarDate)) {
          setCalendarDate(firstLessonDate);
        }
      }
    }
  }, [viewMode, cards]);

  // Sync logic
  useEffect(() => {
    if (!syncKey) return;
    localStorage.setItem(SYNC_KEY_LS, syncKey);

    const configRef = doc(db, "lesson_profiles", syncKey, "config", "main");
    const unsubConfig = onSnapshot(configRef, async (docSnap) => {
      if (docSnap.exists()) {
        setConfig(docSnap.data() as UserConfig);
      } else {
        await setDoc(configRef, {
          title: "Lesson Display",
          activeMonth: "September",
          months: DEFAULT_MONTHS,
        });
      }
    });

    const cardsRef = collection(db, "lesson_profiles", syncKey, "cards");
    const unsubCards = onSnapshot(cardsRef, async (snap) => {
      const data = snap.docs.map(d => {
        const docData = d.data();
        // Migration/Sanitization: Ensure mandatory fields exist for UI
        const facts = (docData.facts || []).map((f: any) => 
          typeof f === 'string' ? createFact(f) : f
        );

        return {
          ...docData,
          facts,
          date: docData.date || format(new Date(), 'yyyy-MM-dd'),
          notes: docData.notes || "",
          order: typeof docData.order === 'number' ? docData.order : 0
        } as LessonCard;
      });
      setCards(data);

      // If the collection is strictly empty OR missing core system IDs, seed them
      // This helps users who lost data or have a partial sync
      const existingIds = snap.docs.map(d => d.id);
      const missingDefaults = INITIAL_CARDS.filter(c => !existingIds.includes(c.id));
      
      // Seed missing defaults automatically - users can still delete them later if they want
      // But this ensures they get the full set of Year 8, 9, 10, and 12 on first sync
      if (missingDefaults.length > 0 && existingIds.length < INITIAL_CARDS.length) {
        for (const card of missingDefaults) {
          const cardRef = doc(db, "lesson_profiles", syncKey, "cards", card.id);
          await setDoc(cardRef, { ...card, updatedAt: serverTimestamp() });
        }
      }
    });

    return () => {
      unsubConfig();
      unsubCards();
    };
  }, [syncKey]);

  // Actions
  const updateConfig = async (newConfig: Partial<UserConfig>) => {
    if (!syncKey) return;
    const configRef = doc(db, "lesson_profiles", syncKey, "config", "main");
    await setDoc(configRef, { ...config, ...newConfig }, { merge: true });
  };

  const saveCard = async (card: LessonCard) => {
    if (!syncKey) return;
    const cardRef = doc(db, "lesson_profiles", syncKey, "cards", card.id);
    await setDoc(cardRef, { ...card, updatedAt: serverTimestamp() });
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2000);
  };

  const deleteCard = async () => {
    if (!syncKey || !idToDelete) return;
    const cardRef = doc(db, "lesson_profiles", syncKey, "cards", idToDelete);
    await deleteDoc(cardRef);
    setModalType(null);
    setIdToDelete(null);
  };

  const confirmDelete = (id: string) => {
    setIdToDelete(id);
    setModalType("delete");
  };

  const addCard = async () => {
    if (!syncKey) return;
    const id = "c" + Date.now();
    
    // Find highest order in current month to append at end
    const lastCard = [...currentMonthCards].sort((a,b) => b.order - a.order)[0];
    const newOrder = lastCard ? lastCard.order + 1 : 0;

    const newCard: LessonCard = {
      id,
      icon: "📚",
      year: "Year",
      title: "New topic",
      color: COLORS[cards.length % COLORS.length],
      facts: [createFact("Add a key point here")],
      notes: "",
      month: config.activeMonth,
      date: format(new Date(), 'yyyy-MM-dd'),
      order: newOrder
    };
    const cardRef = doc(db, "lesson_profiles", syncKey, "cards", id);
    await setDoc(cardRef, { ...newCard, updatedAt: serverTimestamp() });
    setCurrentCardId(id);
  };

  const reorderCards = async (newOrderedCards: LessonCard[]) => {
    if (!syncKey) return;
    
    // Optimistically update local state for smoothness
    // We update the full cards array by merging the newly ordered subset
    const otherCards = cards.filter(c => !newOrderedCards.find(nc => nc.id === c.id));
    const finalCards = [...otherCards, ...newOrderedCards.map((c, i) => ({ ...c, order: i }))];
    setCards(finalCards);

    // Persist to Firestore
    const batch = writeBatch(db);
    newOrderedCards.forEach((card, index) => {
      const cardRef = doc(db, "lesson_profiles", syncKey, "cards", card.id);
      batch.update(cardRef, { order: index, updatedAt: serverTimestamp() });
    });
    await batch.commit();
  };

  const duplicateToMonth = async () => {
    if (!syncKey || !activeCard || !targetMonth) return;
    try {
      const newId = "c" + Date.now();
      const duplicatedFacts = activeCard.facts.map(f => createFact(f.text));
      
      // Get order for target month
      const targetCards = cards.filter(c => c.month === targetMonth);
      const lastInTarget = [...targetCards].sort((a,b) => b.order - a.order)[0];
      const newOrder = lastInTarget ? lastInTarget.order + 1 : 0;

      const newCard: LessonCard = {
        ...activeCard,
        id: newId,
        facts: duplicatedFacts,
        month: targetMonth,
        date: activeCard.date || format(new Date(), 'yyyy-MM-dd'),
        notes: activeCard.notes || "",
        order: newOrder,
        updatedAt: serverTimestamp()
      };
      const cardRef = doc(db, "lesson_profiles", syncKey, "cards", newId);
      await setDoc(cardRef, newCard);
      setModalType(null);
      setTargetMonth("");
      alert(`Card copied to ${targetMonth}`);
    } catch (error) {
      console.error("Duplicate failed:", error);
      alert("Failed to duplicate card. Please check your connection.");
    }
  };

  const addMonth = async () => {
    if (!tempMonth.trim()) return;
    const newMonths = [...config.months];
    if (!newMonths.includes(tempMonth)) {
      newMonths.push(tempMonth);
    }
    await updateConfig({ months: newMonths, activeMonth: tempMonth });
    setModalType(null);
    setTempMonth("");
  };

  const handleImport = async () => {
    if (!syncKey) return;
    try {
      const data = JSON.parse(importText);
      await updateConfig({
        title: data.title || "Lesson Display",
        months: data.months || DEFAULT_MONTHS,
        activeMonth: data.activeMonth || "September",
      });

      if (data.cards) {
        for (const month in data.cards) {
          for (const card of data.cards[month]) {
            const cardRef = doc(db, "lesson_profiles", syncKey, "cards", card.id || ("c" + Math.random()));
            // Ensure imported facts are migrated to object array
            const facts = (card.facts || []).map((f: any) => 
              typeof f === 'string' ? createFact(f) : f
            );
            await setDoc(cardRef, { 
              ...card, 
              month, 
              facts,
              order: typeof card.order === 'number' ? card.order : 0,
              date: card.date || format(new Date(), 'yyyy-MM-dd'),
              notes: card.notes || "",
              updatedAt: serverTimestamp() 
            });
          }
        }
      }
      setModalType(null);
      setImportText("");
    } catch (e) {
      alert("Invalid JSON data");
    }
  };

  const setupSyncKey = (key: string) => {
    if (!key.trim()) return;
    setSyncKey(key.trim());
    setModalType(null);
  };

  const currentMonthCards = cards
    .filter(c => {
      const monthMatch = c.month === config.activeMonth;
      const yearMatch = yearFilter === "All Years" || c.year === yearFilter;
      return monthMatch && yearMatch;
    })
    .sort((a, b) => a.order - b.order);
  const activeCard = cards.find(c => c.id === currentCardId);

  const formatTimestamp = (ts: any) => {
    if (!ts) return "";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return format(date, "MMM d, h:mm a");
  };

  if (!syncKey) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#f5f3ef] p-6">
        <div className="bg-white p-12 rounded-3xl shadow-xl flex flex-col items-center gap-6 max-w-sm w-full">
          <div className="text-4xl">🖇️</div>
          <h1 className="text-2xl font-bold font-sans text-[#1a1744]">Lesson Display</h1>
          <p className="text-center text-gray-500 text-sm">To sync across all your devices, enter a unique Sync Code below.</p>
          <div className="flex flex-col gap-3 w-full">
            <input 
              className="w-full p-3 border rounded-xl outline-none focus:border-[#534AB7]"
              placeholder="e.g. MyClass-2024"
              value={newSyncKey}
              onChange={(e) => setNewSyncKey(e.target.value)}
            />
            <button 
              onClick={() => setupSyncKey(newSyncKey || "Class-" + Math.floor(Math.random()*10000))}
              className="flex items-center justify-center gap-2 bg-[#534AB7] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#3C3489] transition-all cursor-pointer w-full"
            >
              <RefreshCw size={18} />
              Start Syncing
            </button>
            <p className="text-[10px] text-center text-gray-400">Use this same code on your phone or laptop to see your lessons.</p>
          </div>
        </div>
      </div>
    );
  }

  const CalendarView = () => {
    const monthStart = startOfMonth(calendarDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    const lessonsByDate = cards.reduce((acc, card) => {
      if (!acc[card.date]) acc[card.date] = [];
      acc[card.date].push(card);
      return acc;
    }, {} as Record<string, LessonCard[]>);

    return (
      <div className="bg-white rounded-[24px] shadow-sm overflow-hidden border border-gray-100">
        <div className="flex items-center justify-between p-6 border-bottom border-gray-100">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-[#1a1744]">{format(calendarDate, 'MMMM yyyy')}</h2>
            <div className="flex gap-1">
              <button onClick={() => setCalendarDate(subMonths(calendarDate, 1))} className="p-1 hover:bg-gray-100 rounded"><ChevronLeft size={20} /></button>
              <button onClick={() => setCalendarDate(addMonths(calendarDate, 1))} className="p-1 hover:bg-gray-100 rounded"><ChevronRight size={20} /></button>
            </div>
          </div>
          <button onClick={() => setCalendarDate(new Date())} className="text-sm font-medium text-[#534AB7] hover:underline">Today</button>
        </div>
        
        <div className="grid grid-cols-7 gap-px bg-gray-100">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="bg-gray-50 p-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">
              {d}
            </div>
          ))}
          {calendarDays.map((day, i) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayLessons = lessonsByDate[dateStr] || [];
            const isCurrentMonth = isSameMonth(day, monthStart);
            
            return (
              <div 
                key={i} 
                className={`min-h-[100px] bg-white p-2 transition-colors ${!isCurrentMonth ? 'bg-gray-50/50' : ''}`}
              >
                <div className={`text-[11px] font-medium mb-1 ${isToday(day) ? 'bg-[#534AB7] text-white w-5 h-5 flex items-center justify-center rounded-full' : 'text-gray-400'}`}>
                  {format(day, 'd')}
                </div>
                <div className="flex flex-col gap-1">
                  {dayLessons.map(lesson => (
                    <div 
                      key={lesson.id} 
                      onClick={() => setCurrentCardId(lesson.id)}
                      className={`text-[9px] p-1.5 rounded-lg border-l-2 cursor-pointer truncate ${lesson.color} shadow-sm hover:brightness-95`}
                      title={lesson.title}
                    >
                      <span className="mr-1">{lesson.icon}</span>
                      <span className="font-bold">{lesson.year}</span>: {lesson.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f5f3ef]">
      {/* TOP NAV */}
      <nav className="topnav">
        {currentCardId ? (
          <button className="nav-back show" onClick={() => setCurrentCardId(null)}>
            <ChevronLeft size={16} className="inline mr-1" /> Back
          </button>
        ) : null}
        <input 
          className="app-title-inp" 
          value={config.title} 
          onChange={(e) => updateConfig({ title: e.target.value })}
          spellCheck="false" 
          title="Click to rename"
        />
        <div className="nav-actions">
          <button 
            className="nav-btn p-2" 
            onClick={() => setViewMode(viewMode === "list" ? "calendar" : "list")}
            title={viewMode === "list" ? "Calendar View" : "List View"}
          >
            {viewMode === "list" ? <CalendarIcon size={18} /> : <LayoutList size={18} />}
          </button>
          <button className="nav-btn p-2" onClick={() => setModalType("sync")} title="Sync Settings">
            <Key size={18} />
          </button>
          <button className="nav-btn p-2" onClick={() => setModalType("export")} title="Export data">
            <Download size={18} />
          </button>
          <button className="nav-btn p-2" onClick={() => setModalType("import")} title="Import data">
            <Upload size={18} />
          </button>
          <button className="nav-btn primary flex items-center gap-1" onClick={() => setModalType("month")}>
            <Plus size={16} /> Month
          </button>
        </div>
      </nav>

      {/* MONTH BAR */}
      {!currentCardId && (
        <div className="month-bar">
          {config.months.map(m => (
            <button 
              key={m}
              className={`mbtn ${m === config.activeMonth ? "active" : ""}`}
              onClick={() => updateConfig({ activeMonth: m })}
            >
              {m}
            </button>
          ))}
        </div>
      )}

      <main className="max-w-4xl mx-auto p-6">
        <AnimatePresence mode="wait">
          {!currentCardId ? (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="home-body"
            >
              <div className="home-header mb-6">
                <div className="flex flex-col gap-1">
                  <h2 className="home-month-title">{viewMode === "list" ? config.activeMonth : "Academic Calendar"}</h2>
                  {viewMode === "list" && (
                    <div className="flex gap-2 overflow-x-auto pb-2 -mb-2 no-scrollbar">
                      {yearGroups.map(y => (
                        <button 
                          key={y}
                          onClick={() => setYearFilter(y)}
                          className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all border ${
                            yearFilter === y 
                            ? 'bg-[#1a1744] text-white border-[#1a1744]' 
                            : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {y}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button className="add-class-btn" onClick={addCard}>
                  + Add class
                </button>
              </div>
              
              {viewMode === "calendar" ? (
                <CalendarView />
              ) : currentMonthCards.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">📋</span>
                  No classes yet for {config.activeMonth}<br /><br />
                  Click <strong>+ Add class</strong> to get started
                </div>
              ) : (
                <Reorder.Group 
                  axis="y" 
                  values={currentMonthCards} 
                  onReorder={reorderCards}
                  className="cards-grid"
                >
                  {currentMonthCards.map(c => (
                    <Reorder.Item 
                      key={c.id} 
                      value={c}
                      drag={yearFilter === "All Years"}
                      className={`card-thumb ${c.color} relative group active:scale-[1.02] transition-transform`}
                      onClick={() => setCurrentCardId(c.id)}
                    >
                      <span className="thumb-icon">{c.icon}</span>
                      <div className="thumb-year">{c.year}</div>
                      <div className="thumb-title">{c.title}</div>
                      <div className="flex items-center justify-between mt-auto pt-2">
                        <div className="thumb-facts-count">{c.facts.length} point{c.facts.length !== 1 ? "s" : ""}</div>
                        {c.updatedAt && (
                          <div className="text-[9px] opacity-40 font-medium">
                            {formatTimestamp(c.updatedAt)}
                          </div>
                        )}
                      </div>
                      <button 
                        className="del-card-btn flex items-center justify-center !p-1.5" 
                        onClick={(e) => { e.stopPropagation(); confirmDelete(c.id); }}
                      >
                        <Trash2 size={14} />
                      </button>
                      {yearFilter === "All Years" && (
                        <div className="absolute bottom-2 right-2 text-gray-500 opacity-0 group-hover:opacity-40 transition-opacity pointer-events-none">
                          <GripVertical size={14} />
                        </div>
                      )}
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              )}
            </motion.div>
          ) : activeCard ? (
            <motion.div 
              key="card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`exp-card ${activeCard.color}`}
            >
              <div className="exp-top">
                <input 
                  className="exp-icon-inp" 
                  value={activeCard.icon} 
                  onChange={(e) => {
                    const newCards = cards.map(x => x.id === activeCard.id ? { ...x, icon: e.target.value } : x);
                    setCards(newCards);
                  }}
                  maxLength={2} 
                />
                <span className="exp-year-badge">
                  <input 
                    className="exp-year-inp" 
                    value={activeCard.year} 
                    onChange={(e) => {
                      const newCards = cards.map(x => x.id === activeCard.id ? { ...x, year: e.target.value } : x);
                      setCards(newCards);
                    }}
                    placeholder="Year group" 
                  />
                </span>
                <input 
                  className="exp-card-title" 
                  value={activeCard.title} 
                  onChange={(e) => {
                    const newCards = cards.map(x => x.id === activeCard.id ? { ...x, title: e.target.value } : x);
                    setCards(newCards);
                  }}
                  placeholder="Topic title" 
                />
              </div>

              <div className="flex items-center gap-4 mb-6 text-sm">
                <div className="flex items-center gap-2 bg-white/50 px-3 py-1.5 rounded-lg border border-white/20">
                  <CalendarIcon size={14} className="text-[#1a1744]/60" />
                  <input 
                    type="date"
                    className="bg-transparent border-none outline-none font-medium text-[#1a1744]"
                    value={activeCard.date}
                    onChange={(e) => {
                      const newCards = cards.map(x => x.id === activeCard.id ? { ...x, date: e.target.value } : x);
                      setCards(newCards);
                    }}
                  />
                </div>
                <div className="text-[#1a1744]/40">Scheduled for {activeCard.month}</div>
                {activeCard.updatedAt && (
                  <div className="ml-auto text-[10px] opacity-40 font-medium text-[#1a1744]">
                    Last saved: {formatTimestamp(activeCard.updatedAt)}
                  </div>
                )}
              </div>

              <div className="save-row">
                <button className="exp-save-btn" onClick={() => saveCard(activeCard)}>Save</button>
                <button 
                  className="nav-btn !bg-white !text-[#1a1744] border !border-gray-200 flex items-center gap-1"
                  onClick={() => {
                    setTargetMonth(config.activeMonth);
                    setModalType("copy");
                  }}
                >
                  <Copy size={14} /> Copy to...
                </button>
                <div className="color-picker">
                  {COLORS.map((col, i) => (
                    <div 
                      key={col}
                      className={`cpick c${i} ${activeCard.color === col ? "selected" : ""}`}
                      onClick={() => {
                        const newCards = cards.map(x => x.id === activeCard.id ? { ...x, color: col } : x);
                        setCards(newCards);
                      }}
                    />
                  ))}
                </div>
                {showSavedToast && (
                  <span className="saved-toast" style={{ opacity: 1 }}>
                    <Check size={14} /> Saved
                  </span>
                )}
              </div>

              <div className="section-label">Key points</div>
              <Reorder.Group axis="y" values={activeCard.facts} onReorder={(newFacts) => {
                const newCards = cards.map(x => x.id === activeCard.id ? { ...x, facts: newFacts } : x);
                setCards(newCards);
              }} className="facts-list">
                {activeCard.facts.map((f, i) => (
                  <Reorder.Item key={f.id} value={f} className="fact-item">
                    <div className="drag-handle">
                      <GripVertical size={16} />
                    </div>
                    <input 
                      className="fact-inp" 
                      value={f.text} 
                      onChange={(e) => {
                        const newFacts = [...activeCard.facts];
                        newFacts[i] = { ...newFacts[i], text: e.target.value };
                        const newCards = cards.map(x => x.id === activeCard.id ? { ...x, facts: newFacts } : x);
                        setCards(newCards);
                      }}
                    />
                    <button 
                      className="fdel" 
                      onClick={() => {
                        const newFacts = activeCard.facts.filter((_, idx) => idx !== i);
                        const newCards = cards.map(x => x.id === activeCard.id ? { ...x, facts: newFacts } : x);
                        setCards(newCards);
                      }}
                    >
                      <X size={14} />
                    </button>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
              <button 
                className="add-point-btn" 
                onClick={() => {
                  const newFacts = [...activeCard.facts, createFact("")];
                  const newCards = cards.map(x => x.id === activeCard.id ? { ...x, facts: newFacts } : x);
                  setCards(newCards);
                }}
              >
                + Add key point
              </button>

              <div className="notes-section mt-8">
                <div className="section-label">Notes</div>
                <textarea 
                  className="notes-inp" 
                  value={activeCard.notes}
                  onChange={(e) => {
                    const newCards = cards.map(x => x.id === activeCard.id ? { ...x, notes: e.target.value } : x);
                    setCards(newCards);
                  }}
                  placeholder="Add notes, reminders, or anything for this lesson…"
                />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>

      {/* MODALS */}
      {modalType === "month" && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Add a month</h3>
            <input 
              type="text" 
              value={tempMonth} 
              onChange={(e) => setTempMonth(e.target.value)}
              placeholder="e.g. October" 
              autoFocus
            />
            <div className="modal-btns">
              <button className="cancel" onClick={() => setModalType(null)}>Cancel</button>
              <button className="confirm" onClick={addMonth}>Add</button>
            </div>
          </div>
        </div>
      )}

      {modalType === "export" && (
        <div className="modal-overlay">
          <div className="modal !w-[500px] !max-w-[90vw]">
            <h3>Export data</h3>
            <p className="text-[13px] text-gray-500 mb-4">You can download this backup to keep your data safe manually.</p>
            <textarea 
              readOnly 
              className="w-full h-48 font-mono text-xs border rounded-lg p-3 bg-gray-50"
              value={JSON.stringify({
                title: config.title,
                months: config.months,
                activeMonth: config.activeMonth,
                cards: cards.reduce((acc: any, c) => {
                  if (!acc[c.month]) acc[c.month] = [];
                  acc[c.month].push(c);
                  return acc;
                }, {}),
              }, null, 2)}
            />
            <div className="modal-btns mt-4">
              <button className="cancel" onClick={() => setModalType(null)}>Close</button>
              <button 
                className="confirm" 
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(cards));
                  alert("Copied to clipboard!");
                }}
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      )}

      {modalType === "import" && (
        <div className="modal-overlay">
          <div className="modal !w-[500px] !max-w-[90vw]">
            <h3>Import data</h3>
            <p className="text-[13px] text-gray-500 mb-4">Paste your previous export JSON below. <strong>Warning:</strong> This will overwrite settings.</p>
            <textarea 
              className="w-full h-48 font-mono text-xs border rounded-lg p-3"
              placeholder="Paste JSON here..."
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
            <div className="modal-btns mt-4">
              <button className="cancel" onClick={() => setModalType(null)}>Cancel</button>
              <button className="confirm" onClick={handleImport}>Import</button>
            </div>
          </div>
        </div>
      )}
      {modalType === "delete" && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Delete Topic</h3>
            <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete this topic? This action cannot be undone.</p>
            <div className="modal-btns">
              <button className="cancel" onClick={() => setModalType(null)}>Cancel</button>
              <button className="confirm !bg-red-600" onClick={deleteCard}>Delete</button>
            </div>
          </div>
        </div>
      )}
      {modalType === "copy" && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Copy to Month</h3>
            <p className="text-sm text-gray-500 mb-4">Select the month you want to copy this card to:</p>
            <select 
              value={targetMonth} 
              onChange={(e) => setTargetMonth(e.target.value)}
              className="w-full p-2 border rounded-lg mb-6"
            >
              {config.months.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <div className="modal-btns">
              <button className="cancel" onClick={() => setModalType(null)}>Cancel</button>
              <button className="confirm" onClick={duplicateToMonth}>Duplicate</button>
            </div>
          </div>
        </div>
      )}

      {modalType === "sync" && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Sync Settings</h3>
            <p className="text-sm text-gray-500 mb-4">Your current Sync Code is:</p>
            <div className="bg-gray-100 p-3 rounded-lg font-mono text-center mb-6 select-all">
              {syncKey}
            </div>
            <p className="text-xs text-gray-400 mb-6 text-center">To see these lessons on another device, just enter this code there.</p>
            <div className="flex flex-col gap-2 mb-6">
              <button 
                className="nav-btn !bg-gray-100 !text-gray-600 !border !border-gray-200"
                onClick={async () => {
                  if (confirm("Restore the default year 8, 9, 10 and 12 lessons? This won't delete your custom cards.")) {
                    for (const card of INITIAL_CARDS) {
                      const cardRef = doc(db, "lesson_profiles", syncKey, "cards", card.id);
                      await setDoc(cardRef, { ...card, updatedAt: serverTimestamp() });
                    }
                    alert("Default lessons restored!");
                    setModalType(null);
                  }
                }}
              >
                Restore Default Lessons
              </button>
            </div>
            <div className="modal-btns">
              <button className="cancel" onClick={() => setModalType(null)}>Close</button>
              <button 
                className="confirm !bg-red-600" 
                onClick={() => {
                  if(confirm("This will disconnect this device. You will need to enter your code again to see your data. Continue?")) {
                    localStorage.removeItem(SYNC_KEY_LS);
                    window.location.reload();
                  }
                }}
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
