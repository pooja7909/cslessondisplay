import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  onAuthStateChanged,
  User 
} from "firebase/auth";
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  deleteDoc, 
  query, 
  where,
  serverTimestamp,
  getDoc
} from "firebase/firestore";
import { auth, db, signIn, logout } from "./lib/firebase";
import { LogIn, LogOut, Download, Upload, Plus, ChevronLeft, Check, Trash2, X, Copy } from "lucide-react";

// Constants
const COLORS = ["col0", "col1", "col2", "col3", "col4", "col5", "col6", "col7"];
const DEFAULT_MONTHS = ["September", "October", "November"];

const INITIAL_CARDS: Omit<LessonCard, "updatedAt">[] = [
  {
    id: "c1",
    icon: "🌐",
    year: "Year 8",
    title: "HTML & CSS",
    color: "col0",
    facts: [
      "Markup (HTML) defines structure; CSS controls appearance",
      "Tags, attributes, selectors, and the box model are core concepts",
      "Separation of concerns — content vs. presentation",
      "Files render live in a browser — no compilation needed"
    ],
    notes: "",
    month: "September"
  },
  {
    id: "c2",
    icon: "🤖",
    year: "Year 9",
    title: "VEX VR Robotics",
    color: "col1",
    facts: [
      "Block-based or Python coding controls a virtual robot",
      "Reinforces sequencing, loops, and conditional logic",
      "Sensor inputs drive real-time decisions in the simulation",
      "Decomposition — break the challenge into smaller moves"
    ],
    notes: "",
    month: "September"
  },
  {
    id: "c3",
    icon: "⚙️",
    year: "Year 10",
    title: "Functions & Subprograms",
    color: "col2",
    facts: [
      "A function is a named, reusable block of code",
      "Parameters pass data in; return values pass results out",
      "Reduces repetition and makes programs easier to maintain",
      "Scope — variables inside a function are local by default"
    ],
    notes: "",
    month: "September"
  },
  {
    id: "c4",
    icon: "🗄️",
    year: "Year 12",
    title: "SQL",
    color: "col3",
    facts: [
      "Structured Query Language for relational databases",
      "SELECT, WHERE, ORDER BY, GROUP BY are foundational clauses",
      "JOINs combine data across multiple tables via keys",
      "DDL (CREATE/ALTER) vs DML (INSERT/UPDATE/DELETE)"
    ],
    notes: "",
    month: "September"
  }
];

interface LessonCard {
  id: string;
  icon: string;
  year: string;
  title: string;
  color: string;
  facts: string[];
  notes: string;
  month: string;
  updatedAt?: any;
}

interface UserConfig {
  title: string;
  activeMonth: string;
  months: string[];
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<UserConfig>({
    title: "Lesson Display",
    activeMonth: "September",
    months: DEFAULT_MONTHS,
  });
  const [cards, setCards] = useState<LessonCard[]>([]);
  const [currentCardId, setCurrentCardId] = useState<string | null>(null);
  const [modalType, setModalType] = useState<"month" | "export" | "import" | "delete" | "copy" | null>(null);
  const [tempMonth, setTempMonth] = useState("");
  const [importText, setImportText] = useState("");
  const [idToDelete, setIdToDelete] = useState<string | null>(null);
  const [targetMonth, setTargetMonth] = useState("");
  const [showSavedToast, setShowSavedToast] = useState(false);

  // Auth Listener
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  // Config & Cards Listener
  useEffect(() => {
    if (!user) {
      setCards([]);
      return;
    }

    const configRef = doc(db, "users", user.uid, "config", "main");
    const unsubConfig = onSnapshot(configRef, async (docSnap) => {
      if (docSnap.exists()) {
        setConfig(docSnap.data() as UserConfig);
      } else {
        // Init default config if not exists
        await setDoc(configRef, {
          title: "Lesson Display",
          activeMonth: "September",
          months: DEFAULT_MONTHS,
        });
      }
    });

    const cardsRef = collection(db, "users", user.uid, "cards");
    const unsubCards = onSnapshot(cardsRef, async (snap) => {
      const data = snap.docs.map(d => d.data() as LessonCard);
      setCards(data);

      // Seed if the main initial card is missing
      // This ensures themes appear for new users even if they accidentally created a "New topic" first
      if (!data.some(c => c.id === "c1")) {
        for (const card of INITIAL_CARDS) {
          const cardRef = doc(db, "users", user.uid, "cards", card.id);
          const existingSnap = await getDoc(cardRef);
          if (!existingSnap.exists()) {
            await setDoc(cardRef, { 
              ...card, 
              updatedAt: serverTimestamp() 
            });
          }
        }
      }
    });

    return () => {
      unsubConfig();
      unsubCards();
    };
  }, [user]);

  // Actions
  const updateConfig = async (newConfig: Partial<UserConfig>) => {
    if (!user) return;
    const configRef = doc(db, "users", user.uid, "config", "main");
    await setDoc(configRef, { ...config, ...newConfig }, { merge: true });
  };

  const saveCard = async (card: LessonCard) => {
    if (!user) return;
    const cardRef = doc(db, "users", user.uid, "cards", card.id);
    await setDoc(cardRef, { 
      ...card, 
      updatedAt: serverTimestamp() 
    });
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2000);
  };

  const deleteCard = async () => {
    if (!user || !idToDelete) return;
    const cardRef = doc(db, "users", user.uid, "cards", idToDelete);
    await deleteDoc(cardRef);
    setModalType(null);
    setIdToDelete(null);
  };

  const confirmDelete = (id: string) => {
    setIdToDelete(id);
    setModalType("delete");
  };

  const addCard = async () => {
    if (!user) return;
    const id = "c" + Date.now();
    const newCard: LessonCard = {
      id,
      icon: "📚",
      year: "Year",
      title: "New topic",
      color: COLORS[cards.length % COLORS.length],
      facts: ["Add a key point here"],
      notes: "",
      month: config.activeMonth,
    };
    const cardRef = doc(db, "users", user.uid, "cards", id);
    await setDoc(cardRef, { ...newCard, updatedAt: serverTimestamp() });
    setCurrentCardId(id);
  };

  const duplicateToMonth = async () => {
    if (!user || !activeCard || !targetMonth) return;
    const newId = "c" + Date.now();
    const newCard: LessonCard = {
      ...activeCard,
      id: newId,
      month: targetMonth,
      updatedAt: serverTimestamp()
    };
    const cardRef = doc(db, "users", user.uid, "cards", newId);
    await setDoc(cardRef, newCard);
    setModalType(null);
    setTargetMonth("");
    alert(`Card copied to ${targetMonth}`);
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
    if (!user) return;
    try {
      const data = JSON.parse(importText);
      // Migration logic if needed, but for now just raw import
      await updateConfig({
        title: data.title || "Lesson Display",
        months: data.months || DEFAULT_MONTHS,
        activeMonth: data.activeMonth || "September",
      });

      // Import cards
      if (data.cards) {
        for (const month in data.cards) {
          for (const card of data.cards[month]) {
            const cardRef = doc(db, "users", user.uid, "cards", card.id || ("c" + Math.random()));
            await setDoc(cardRef, { ...card, month, updatedAt: serverTimestamp() });
          }
        }
      }
      setModalType(null);
      setImportText("");
    } catch (e) {
      alert("Invalid JSON data");
    }
  };

  const currentMonthCards = cards.filter(c => c.month === config.activeMonth);
  const activeCard = cards.find(c => c.id === currentCardId);

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;

  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#f5f3ef]">
        <div className="bg-white p-12 rounded-3xl shadow-xl flex flex-col items-center gap-6 max-w-sm w-full">
          <div className="text-4xl">📚</div>
          <h1 className="text-2xl font-bold font-sans text-[#1a1744]">Lesson Display</h1>
          <p className="text-center text-gray-500 text-sm">Sign in to sync your lessons across all your devices.</p>
          <div className="flex flex-col gap-3 w-full">
            <button 
              onClick={async () => {
                try {
                  await signIn();
                } catch (error) {
                  console.error("Sign in failed:", error);
                  alert("Sign in pop-up was blocked. Please check your browser's address bar for a blocked window icon and allow pop-ups for this site.");
                }
              }}
              className="flex items-center justify-center gap-3 bg-[#534AB7] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#3C3489] transition-all cursor-pointer w-full"
            >
              <LogIn size={20} />
              Sign in with Google
            </button>
            <p className="text-[10px] text-center text-gray-400">If nothing happens, please allow pop-ups for this URL in your browser.</p>
          </div>
        </div>
      </div>
    );
  }

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
          <button className="nav-btn p-2" onClick={() => setModalType("export")} title="Export data">
            <Download size={18} />
          </button>
          <button className="nav-btn p-2" onClick={() => setModalType("import")} title="Import data">
            <Upload size={18} />
          </button>
          <button className="nav-btn primary flex items-center gap-1" onClick={() => setModalType("month")}>
            <Plus size={16} /> Month
          </button>
          <button className="nav-btn p-2 opacity-50 hover:opacity-100" onClick={logout} title="Sign out">
            <LogOut size={18} />
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
                <h2 className="home-month-title">{config.activeMonth}</h2>
                <button className="add-class-btn" onClick={addCard}>
                  + Add class
                </button>
              </div>
              
              {currentMonthCards.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">📋</span>
                  No classes yet for {config.activeMonth}<br /><br />
                  Click <strong>+ Add class</strong> to get started
                </div>
              ) : (
                <div className="cards-grid">
                  {currentMonthCards.map(c => (
                    <div 
                      key={c.id} 
                      className={`card-thumb ${c.color}`}
                      onClick={() => setCurrentCardId(c.id)}
                    >
                      <span className="thumb-icon">{c.icon}</span>
                      <div className="thumb-year">{c.year}</div>
                      <div className="thumb-title">{c.title}</div>
                      <div className="thumb-facts-count">{c.facts.length} point{c.facts.length !== 1 ? "s" : ""}</div>
                      <button 
                        className="del-card-btn flex items-center justify-center !p-1.5" 
                        onClick={(e) => { e.stopPropagation(); confirmDelete(c.id); }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
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
              <ul className="facts-list">
                {activeCard.facts.map((f, i) => (
                  <li key={i}>
                    <span className="fdot" />
                    <input 
                      className="fact-inp" 
                      value={f} 
                      onChange={(e) => {
                        const newFacts = [...activeCard.facts];
                        newFacts[i] = e.target.value;
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
                  </li>
                ))}
              </ul>
              <button 
                className="add-point-btn" 
                onClick={() => {
                  const newFacts = [...activeCard.facts, ""];
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
    </div>
  );
}
