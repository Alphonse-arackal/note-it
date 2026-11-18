import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Search, Plus, Minus, Download, Upload, BookOpen, Pencil, Trash2, X, Check, ChevronLeft, FileText, Menu, ArrowUpRight } from 'lucide-react';
import './style.css';

const STORAGE_KEY = 'quicknotes-reader-v1';
const starter = [
  { id: crypto.randomUUID(), question: 'Welcome to QuickNotes', answer: 'Your questions live in the sidebar and their answers appear here.\n\nCreate a note, switch between questions, and export your collection as JSON to move it between devices. Everything is saved locally in your browser.', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
];
function loadNotes() {
  try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : parsed.notes || []; } }
  catch { /* fall through to starter */ }
  return starter;
}
function App() {
  const [notes, setNotes] = useState(loadNotes);
  const [selectedId, setSelectedId] = useState(() => loadNotes()[0]?.id || null);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(false);
  const [draftQ, setDraftQ] = useState('');
  const [draftA, setDraftA] = useState('');
  const [mobileList, setMobileList] = useState(true);
  const [toast, setToast] = useState('');
  const [answerFontSize, setAnswerFontSize] = useState(() => Number(localStorage.getItem('quicknotes-answer-size')) || 19);
  const importRef = useRef(null);
  const questionRef = useRef(null);
  const selected = notes.find(n => n.id === selectedId) || null;
  const filtered = useMemo(() => notes.filter(n => `${n.question} ${n.answer}`.toLowerCase().includes(search.toLowerCase())), [notes, search]);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(notes)); }, [notes]);
  useEffect(() => { if (!selected && notes.length) setSelectedId(notes[0].id); }, [notes, selected]);
  useEffect(() => { if (editing) questionRef.current?.focus(); }, [editing]);
  const changeAnswerSize = (delta) => setAnswerFontSize(size => { const next = Math.min(30, Math.max(14, size + delta)); localStorage.setItem('quicknotes-answer-size', String(next)); return next; });
  const notify = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2300); };

  const startNew = () => { setDraftQ(''); setDraftA(''); setEditing('new'); setMobileList(false); };
  const startEdit = () => { if (!selected) return; setDraftQ(selected.question); setDraftA(selected.answer); setEditing('edit'); };
  const saveNote = () => {
    if (!draftQ.trim()) { questionRef.current?.focus(); return; }
    const now = new Date().toISOString();
    if (editing === 'new') {
      const note = { id: crypto.randomUUID(), question: draftQ.trim(), answer: draftA.trim(), createdAt: now, updatedAt: now };
      setNotes(prev => [note, ...prev]); setSelectedId(note.id); notify('Note saved');
    } else {
      setNotes(prev => prev.map(n => n.id === selectedId ? { ...n, question: draftQ.trim(), answer: draftA.trim(), updatedAt: now } : n)); notify('Changes saved');
    }
    setEditing(false); setMobileList(false);
  };
  const cancelEdit = () => setEditing(false);
  const deleteNote = () => {
    if (!selected || !confirm(`Delete “${selected.question}”?`)) return;
    const next = notes.filter(n => n.id !== selectedId); setNotes(next); setSelectedId(next[0]?.id || null); notify('Note deleted');
  };
  const exportNotes = () => {
    const payload = { app: 'QuickNotes', version: 1, exportedAt: new Date().toISOString(), notes };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `quicknotes-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url); notify('JSON exported');
  };
  const importNotes = async (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      const data = JSON.parse(await file.text()); const incoming = Array.isArray(data) ? data : data.notes;
      if (!Array.isArray(incoming) || incoming.some(n => typeof n?.question !== 'string' || typeof n?.answer !== 'string')) throw new Error('This file does not contain valid question-answer notes.');
      const clean = incoming.map(n => ({ id: n.id || crypto.randomUUID(), question: n.question, answer: n.answer, createdAt: n.createdAt || new Date().toISOString(), updatedAt: n.updatedAt || new Date().toISOString() }));
      if (!clean.length) { notify('No notes found in file'); return; }
      const mode = notes.length ? confirm(`Import ${clean.length} notes?\n\nOK = merge with your current notes\nCancel = replace current notes`) : true;
      setNotes(mode ? [...clean, ...notes.filter(old => !clean.some(n => n.id === old.id))] : clean);
      setSelectedId(clean[0].id); setEditing(false); setMobileList(false); notify(`${clean.length} notes imported`);
    } catch (err) { alert(err.message || 'Unable to import this JSON file.'); }
    event.target.value = '';
  };
  const selectNote = (note) => { setSelectedId(note.id); setEditing(false); setMobileList(false); };

  return <div className="app-shell">
    <aside className={`sidebar ${mobileList ? 'mobile-show' : ''}`}>
      <div className="sidebar-top">
        <div className="brand"><div className="brand-icon"><BookOpen size={19}/></div><div><div className="brand-name">QuickNotes</div><div className="brand-sub">PERSONAL KNOWLEDGE</div></div></div>
        <button className="new-note" onClick={startNew}><Plus size={17}/> <span>New question</span><kbd>⌘ N</kbd></button>
        <div className="searchbox"><Search size={16}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search questions..."/><span className="search-shortcut">/</span></div>
        <div className="list-label"><span>YOUR NOTES</span><span className="note-count">{notes.length}</span></div>
      </div>
      <div className="notes-scroll">
        {filtered.length ? filtered.map((note, i) => <button key={note.id} className={`note-item ${note.id === selectedId && !editing ? 'active' : ''}`} onClick={() => selectNote(note)}>
          <span className="note-index">{String(notes.indexOf(note)+1).padStart(2,'0')}</span><span className="note-item-content"><span className="note-title">{note.question || 'Untitled question'}</span><span className="note-preview">{note.answer?.replace(/\s+/g,' ').slice(0,80) || 'No answer yet'}</span></span>
        </button>) : <div className="empty-list"><Search size={22}/><p>No matching questions</p></div>}
      </div>
      <div className="sidebar-bottom">
        <div className="storage-note"><span className="storage-dot"/> Stored locally on this device</div>
        <div className="file-actions"><button onClick={() => importRef.current?.click()}><Upload size={16}/> Import JSON</button><button onClick={exportNotes}><Download size={16}/> Export JSON</button></div>
        <input ref={importRef} type="file" accept=".json,application/json" hidden onChange={importNotes}/>
      </div>
    </aside>

    <main className={`reader ${mobileList ? 'mobile-hide' : ''}`}>
      <header className="reader-header"><button className="back-btn" onClick={() => setMobileList(true)}><ChevronLeft size={18}/> Notes</button><div className="header-status"><span className="status-dot"/> Autosaved</div><div className="header-actions">{!editing && selected && <><button className="icon-btn" title="Edit note" onClick={startEdit}><Pencil size={17}/></button><button className="icon-btn danger" title="Delete note" onClick={deleteNote}><Trash2 size={17}/></button></>}</div></header>
      {editing ? <div className="edit-view"><div className="editor-kicker">{editing === 'new' ? 'CREATE NOTE' : 'EDIT NOTE'}</div><label className="field-label">QUESTION</label><input ref={questionRef} className="question-input" value={draftQ} onChange={e => setDraftQ(e.target.value)} placeholder="Write your question..." onKeyDown={e => e.key === 'Enter' && e.ctrlKey && saveNote()}/><label className="field-label answer-label">ANSWER</label><textarea className="answer-input" value={draftA} onChange={e => setDraftA(e.target.value)} placeholder="Write the answer here..."/><div className="editor-footer"><span>Ctrl + Enter to save</span><div><button className="secondary-btn" onClick={cancelEdit}>Cancel</button><button className="primary-btn" onClick={saveNote}><Check size={16}/> Save note</button></div></div></div> : selected ? <article className="reading-content"><div className="reading-kicker"><FileText size={14}/><span>QUESTION {String(notes.indexOf(selected)+1).padStart(2,'0')}</span></div><h1>{selected.question}</h1><div className="divider"/><div className="answer-toolbar"><div className="answer-heading">ANSWER</div><div className="text-size-controls" aria-label="Adjust answer text size"><span>TEXT SIZE</span><button type="button" title="Decrease answer text size" aria-label="Decrease answer text size" onClick={() => changeAnswerSize(-1)} disabled={answerFontSize <= 14}><Minus size={15}/></button><output>{answerFontSize}px</output><button type="button" title="Increase answer text size" aria-label="Increase answer text size" onClick={() => changeAnswerSize(1)} disabled={answerFontSize >= 30}><Plus size={15}/></button></div></div><div className="answer-text" style={{fontSize: `${answerFontSize}px`}}>{selected.answer ? selected.answer.split('\n').map((line,i) => line ? <p key={i}>{line}</p> : <div className="paragraph-space" key={i}/>) : <p className="muted-answer">No answer added yet.</p>}</div><div className="reader-bottom"><span>Updated {new Date(selected.updatedAt || selected.createdAt).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'})}</span><button className="edit-inline" onClick={startEdit}>Edit note <ArrowUpRight size={15}/></button></div></article> : <div className="welcome-empty"><div className="empty-icon"><BookOpen size={26}/></div><h2>Your reading space</h2><p>Choose a question from the sidebar, or create your first note.</p><button className="primary-btn" onClick={startNew}><Plus size={16}/> Create a question</button></div>}
      <footer className="reader-footer"><span>QUICKNOTES</span><span>{notes.length} {notes.length === 1 ? 'NOTE' : 'NOTES'} · LOCAL STORAGE</span></footer>
    </main>
    {toast && <div className="toast"><Check size={16}/>{toast}</div>}
  </div>;
}

createRoot(document.getElementById('root')).render(<App/>);
