import { useState, useEffect } from 'react';
import Page from '../shared/components/Page';

// Types
interface Racer {
  id: string;
  name: string;
  car?: string;
  dialIn?: number;
  seed?: number;
}

interface Matchup {
  id: string;
  round: number;
  position: number;
  racer1?: Racer;
  racer2?: Racer;
  racer1RT?: number;
  racer1ET?: number;
  racer2RT?: number;
  racer2ET?: number;
  winner?: 'racer1' | 'racer2';
  winReason?: 'faster' | 'breakout' | 'redlight' | 'bye' | 'dq';
}

interface Tournament {
  id: string;
  name: string;
  date: string;
  class: string;
  racers: Racer[];
  matchups: Matchup[];
  currentRound: number;
  completed: boolean;
}

const STORAGE_KEY = 'rsa_tournaments';

// Calculate number of rounds needed
function calcRounds(numRacers: number): number {
  return Math.ceil(Math.log2(numRacers));
}

// Generate bracket structure
function generateBracket(racers: Racer[]): Matchup[] {
  const numRacers = racers.length;
  const rounds = calcRounds(numRacers);
  const bracketSize = Math.pow(2, rounds);
  const matchups: Matchup[] = [];
  
  // Seed racers (1 vs last, 2 vs second-to-last, etc.)
  const seededRacers: (Racer | undefined)[] = new Array(bracketSize).fill(undefined);
  const sortedRacers = [...racers].sort((a, b) => (a.seed || 999) - (b.seed || 999));
  
  // Standard bracket seeding
  const seedOrder = generateSeedOrder(bracketSize);
  sortedRacers.forEach((racer, i) => {
    if (i < bracketSize) {
      seededRacers[seedOrder[i]] = racer;
    }
  });
  
  // Generate first round matchups
  for (let i = 0; i < bracketSize / 2; i++) {
    matchups.push({
      id: `r1-m${i}`,
      round: 1,
      position: i,
      racer1: seededRacers[i * 2],
      racer2: seededRacers[i * 2 + 1],
      winner: seededRacers[i * 2 + 1] ? undefined : 'racer1', // Bye if no opponent
      winReason: seededRacers[i * 2 + 1] ? undefined : 'bye',
    });
  }
  
  // Generate subsequent round matchups (empty)
  let matchupsInRound = bracketSize / 4;
  for (let round = 2; round <= rounds; round++) {
    for (let i = 0; i < matchupsInRound; i++) {
      matchups.push({
        id: `r${round}-m${i}`,
        round,
        position: i,
      });
    }
    matchupsInRound /= 2;
  }
  
  return matchups;
}

// Generate standard bracket seed order
function generateSeedOrder(size: number): number[] {
  if (size === 2) return [0, 1];
  
  const half = generateSeedOrder(size / 2);
  const result: number[] = [];
  
  for (let i = 0; i < half.length; i++) {
    result.push(half[i]);
    result.push(size - 1 - half[i]);
  }
  
  return result;
}

// Calculate margin of victory
function calcMargin(matchup: Matchup): { margin: number; type: string } | null {
  if (!matchup.winner || !matchup.racer1 || !matchup.racer2) return null;
  if (matchup.winReason === 'bye' || matchup.winReason === 'dq') return null;
  
  const r1Dial = matchup.racer1.dialIn || 0;
  const r2Dial = matchup.racer2.dialIn || 0;
  const r1Total = (matchup.racer1RT || 0) + (matchup.racer1ET || 0) - r1Dial;
  const r2Total = (matchup.racer2RT || 0) + (matchup.racer2ET || 0) - r2Dial;
  
  if (matchup.winReason === 'redlight') {
    return { margin: 0, type: 'Red Light' };
  }
  if (matchup.winReason === 'breakout') {
    return { margin: 0, type: 'Breakout' };
  }
  
  const margin = Math.abs(r1Total - r2Total);
  return { margin, type: margin < 0.001 ? 'Dead Heat' : 'MOV' };
}

// Generate unique ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export default function Ladder() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showMatchupModal, setShowMatchupModal] = useState(false);
  const [editingMatchup, setEditingMatchup] = useState<Matchup | null>(null);
  
  // New tournament form
  const [newTournament, setNewTournament] = useState({
    name: '',
    date: new Date().toISOString().split('T')[0],
    class: '',
    racerList: '',
  });
  
  // Matchup edit form
  const [matchupForm, setMatchupForm] = useState({
    racer1RT: '',
    racer1ET: '',
    racer2RT: '',
    racer2ET: '',
    winner: '' as '' | 'racer1' | 'racer2',
    winReason: '' as '' | 'faster' | 'breakout' | 'redlight' | 'bye' | 'dq',
  });
  
  // Load tournaments
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const loaded = JSON.parse(saved);
      setTournaments(loaded);
      if (loaded.length > 0) {
        setSelectedTournament(loaded[0]);
      }
    }
  }, []);
  
  // Save tournaments
  useEffect(() => {
    if (tournaments.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tournaments));
    }
  }, [tournaments]);
  
  // Create new tournament
  const handleCreateTournament = () => {
    if (!newTournament.name.trim()) return;
    
    // Parse racer list
    const racerNames = newTournament.racerList
      .split('\n')
      .map(line => line.trim())
      .filter(line => line);
    
    const racers: Racer[] = racerNames.map((name, i) => ({
      id: generateId(),
      name,
      seed: i + 1,
    }));
    
    const tournament: Tournament = {
      id: generateId(),
      name: newTournament.name.trim(),
      date: newTournament.date,
      class: newTournament.class.trim(),
      racers,
      matchups: generateBracket(racers),
      currentRound: 1,
      completed: false,
    };
    
    setTournaments([tournament, ...tournaments]);
    setSelectedTournament(tournament);
    setShowNewModal(false);
    setNewTournament({ name: '', date: new Date().toISOString().split('T')[0], class: '', racerList: '' });
  };
  
  // Delete tournament
  const handleDeleteTournament = (id: string) => {
    if (!confirm('Delete this tournament?')) return;
    const newTournaments = tournaments.filter(t => t.id !== id);
    setTournaments(newTournaments);
    if (selectedTournament?.id === id) {
      setSelectedTournament(newTournaments[0] || null);
    }
  };
  
  // Open matchup editor
  const handleEditMatchup = (matchup: Matchup) => {
    setEditingMatchup(matchup);
    setMatchupForm({
      racer1RT: matchup.racer1RT?.toString() || '',
      racer1ET: matchup.racer1ET?.toString() || '',
      racer2RT: matchup.racer2RT?.toString() || '',
      racer2ET: matchup.racer2ET?.toString() || '',
      winner: matchup.winner || '',
      winReason: matchup.winReason || '',
    });
    setShowMatchupModal(true);
  };
  
  // Save matchup result
  const handleSaveMatchup = () => {
    if (!selectedTournament || !editingMatchup) return;
    
    const updatedMatchup: Matchup = {
      ...editingMatchup,
      racer1RT: matchupForm.racer1RT ? parseFloat(matchupForm.racer1RT) : undefined,
      racer1ET: matchupForm.racer1ET ? parseFloat(matchupForm.racer1ET) : undefined,
      racer2RT: matchupForm.racer2RT ? parseFloat(matchupForm.racer2RT) : undefined,
      racer2ET: matchupForm.racer2ET ? parseFloat(matchupForm.racer2ET) : undefined,
      winner: matchupForm.winner || undefined,
      winReason: matchupForm.winReason || undefined,
    };
    
    // Update matchups
    let newMatchups = selectedTournament.matchups.map(m => 
      m.id === editingMatchup.id ? updatedMatchup : m
    );
    
    // Advance winner to next round
    if (updatedMatchup.winner) {
      const winner = updatedMatchup.winner === 'racer1' ? updatedMatchup.racer1 : updatedMatchup.racer2;
      const nextRound = updatedMatchup.round + 1;
      const nextPosition = Math.floor(updatedMatchup.position / 2);
      const isTopSlot = updatedMatchup.position % 2 === 0;
      
      newMatchups = newMatchups.map(m => {
        if (m.round === nextRound && m.position === nextPosition) {
          return isTopSlot 
            ? { ...m, racer1: winner }
            : { ...m, racer2: winner };
        }
        return m;
      });
    }
    
    // Check if round is complete
    const roundMatchups = newMatchups.filter(m => m.round === editingMatchup.round);
    const roundComplete = roundMatchups.every(m => m.winner);
    
    const updatedTournament: Tournament = {
      ...selectedTournament,
      matchups: newMatchups,
      currentRound: roundComplete ? editingMatchup.round + 1 : selectedTournament.currentRound,
      completed: roundComplete && editingMatchup.round === calcRounds(selectedTournament.racers.length),
    };
    
    setTournaments(tournaments.map(t => t.id === selectedTournament.id ? updatedTournament : t));
    setSelectedTournament(updatedTournament);
    setShowMatchupModal(false);
    setEditingMatchup(null);
  };
  
  // Get matchups by round
  const getMatchupsByRound = (round: number): Matchup[] => {
    if (!selectedTournament) return [];
    return selectedTournament.matchups.filter(m => m.round === round).sort((a, b) => a.position - b.position);
  };
  
  // Get total rounds
  const totalRounds = selectedTournament ? calcRounds(selectedTournament.racers.length) : 0;
  
  // Round names
  const getRoundName = (round: number): string => {
    const remaining = totalRounds - round + 1;
    if (remaining === 1) return 'Finals';
    if (remaining === 2) return 'Semis';
    if (remaining === 3) return 'Quarters';
    return `Round ${round}`;
  };
  
  return (
    <Page title="Competition Ladder">
      <div style={{ padding: 'var(--space-4)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <h1 style={{ fontSize: '1.5rem', margin: 0 }}>🏆 Competition Ladder</h1>
            {tournaments.length > 0 && (
              <select
                value={selectedTournament?.id || ''}
                onChange={(e) => setSelectedTournament(tournaments.find(t => t.id === e.target.value) || null)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text)',
                }}
              >
                {tournaments.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.date})</option>
                ))}
              </select>
            )}
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            className="btn"
            style={{ padding: '10px 20px' }}
          >
            + New Tournament
          </button>
        </div>
        
        {/* Bracket View */}
        {selectedTournament ? (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ 
              display: 'flex', 
              gap: 'var(--space-4)', 
              minWidth: 'max-content',
              padding: 'var(--space-2)',
            }}>
              {Array.from({ length: totalRounds }, (_, i) => i + 1).map(round => (
                <div key={round} style={{ minWidth: '280px' }}>
                  <div style={{ 
                    textAlign: 'center', 
                    padding: 'var(--space-2)', 
                    marginBottom: 'var(--space-3)',
                    fontWeight: 600,
                    backgroundColor: round === selectedTournament.currentRound ? 'var(--color-accent)' : 'var(--color-surface)',
                    color: round === selectedTournament.currentRound ? 'white' : 'var(--color-text)',
                    borderRadius: 'var(--radius-md)',
                  }}>
                    {getRoundName(round)}
                  </div>
                  
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 'var(--space-3)',
                    justifyContent: 'space-around',
                    minHeight: `${Math.pow(2, totalRounds - round + 1) * 60}px`,
                  }}>
                    {getMatchupsByRound(round).map(matchup => {
                      const margin = calcMargin(matchup);
                      return (
                        <div
                          key={matchup.id}
                          onClick={() => matchup.racer1 && handleEditMatchup(matchup)}
                          className="card"
                          style={{
                            padding: 'var(--space-2)',
                            cursor: matchup.racer1 ? 'pointer' : 'default',
                            opacity: matchup.racer1 ? 1 : 0.5,
                            border: matchup.winner ? '2px solid #22c55e' : '1px solid var(--color-border)',
                          }}
                        >
                          {/* Racer 1 */}
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '6px 8px',
                            backgroundColor: matchup.winner === 'racer1' ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                            borderRadius: 'var(--radius-sm)',
                            marginBottom: '4px',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {matchup.winner === 'racer1' && <span>✓</span>}
                              <span style={{ fontWeight: matchup.winner === 'racer1' ? 600 : 400 }}>
                                {matchup.racer1?.name || 'TBD'}
                              </span>
                            </div>
                            {matchup.racer1ET && (
                              <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                {matchup.racer1ET.toFixed(3)}
                              </span>
                            )}
                          </div>
                          
                          {/* Racer 2 */}
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '6px 8px',
                            backgroundColor: matchup.winner === 'racer2' ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                            borderRadius: 'var(--radius-sm)',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {matchup.winner === 'racer2' && <span>✓</span>}
                              <span style={{ fontWeight: matchup.winner === 'racer2' ? 600 : 400 }}>
                                {matchup.racer2?.name || (matchup.racer1 && !matchup.racer2 ? 'BYE' : 'TBD')}
                              </span>
                            </div>
                            {matchup.racer2ET && (
                              <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                {matchup.racer2ET.toFixed(3)}
                              </span>
                            )}
                          </div>
                          
                          {/* Margin */}
                          {margin && (
                            <div style={{ 
                              textAlign: 'center', 
                              fontSize: '0.7rem', 
                              color: 'var(--color-text-muted)',
                              marginTop: '4px',
                            }}>
                              {margin.type}: {margin.margin > 0 ? margin.margin.toFixed(3) : ''}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              
              {/* Winner */}
              {selectedTournament.completed && (
                <div style={{ minWidth: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="card" style={{ 
                    padding: 'var(--space-4)', 
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.2), rgba(234, 179, 8, 0.1))',
                    border: '2px solid #eab308',
                  }}>
                    <div style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}>🏆</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>WINNER</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                      {selectedTournament.matchups.find(m => m.round === totalRounds)?.winner === 'racer1'
                        ? selectedTournament.matchups.find(m => m.round === totalRounds)?.racer1?.name
                        : selectedTournament.matchups.find(m => m.round === totalRounds)?.racer2?.name
                      }
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Tournament Info */}
            <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-4)' }}>
              <div className="card" style={{ padding: 'var(--space-3)', flex: 1 }}>
                <h3 style={{ fontSize: '0.9rem', marginBottom: 'var(--space-2)' }}>Tournament Info</h3>
                <div style={{ fontSize: '0.85rem', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 16px' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Name:</span>
                  <span>{selectedTournament.name}</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>Date:</span>
                  <span>{new Date(selectedTournament.date).toLocaleDateString()}</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>Class:</span>
                  <span>{selectedTournament.class || '—'}</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>Entries:</span>
                  <span>{selectedTournament.racers.length}</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>Status:</span>
                  <span style={{ color: selectedTournament.completed ? '#22c55e' : '#f59e0b' }}>
                    {selectedTournament.completed ? 'Complete' : `Round ${selectedTournament.currentRound}`}
                  </span>
                </div>
              </div>
              
              <div className="card" style={{ padding: 'var(--space-3)' }}>
                <h3 style={{ fontSize: '0.9rem', marginBottom: 'var(--space-2)' }}>Actions</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <button
                    onClick={() => handleDeleteTournament(selectedTournament.id)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid #ef4444',
                      backgroundColor: 'transparent',
                      color: '#ef4444',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                    }}
                  >
                    Delete Tournament
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-3)' }}>🏆</div>
            <h2 style={{ marginBottom: 'var(--space-2)' }}>No Tournaments</h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
              Create a new tournament to start tracking eliminations.
            </p>
            <button
              onClick={() => setShowNewModal(true)}
              className="btn"
              style={{ padding: '12px 24px' }}
            >
              + New Tournament
            </button>
          </div>
        )}
      </div>
      
      {/* New Tournament Modal */}
      {showNewModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div className="card" style={{ width: '450px', padding: 'var(--space-4)' }}>
            <h2 style={{ marginBottom: 'var(--space-4)' }}>New Tournament</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem' }}>Tournament Name *</label>
                <input
                  type="text"
                  value={newTournament.name}
                  onChange={(e) => setNewTournament({ ...newTournament, name: e.target.value })}
                  placeholder="e.g., Saturday Night Shootout"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text)',
                  }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem' }}>Date</label>
                  <input
                    type="date"
                    value={newTournament.date}
                    onChange={(e) => setNewTournament({ ...newTournament, date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text)',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem' }}>Class</label>
                  <input
                    type="text"
                    value={newTournament.class}
                    onChange={(e) => setNewTournament({ ...newTournament, class: e.target.value })}
                    placeholder="e.g., Super Pro"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text)',
                    }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem' }}>
                  Racers (one per line, in seed order)
                </label>
                <textarea
                  value={newTournament.racerList}
                  onChange={(e) => setNewTournament({ ...newTournament, racerList: e.target.value })}
                  placeholder="John Smith&#10;Jane Doe&#10;Bob Johnson&#10;..."
                  rows={8}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text)',
                    fontFamily: 'monospace',
                    resize: 'vertical',
                  }}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  Supports 2-64 racers. Byes will be auto-assigned.
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
              <button
                onClick={() => setShowNewModal(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'transparent',
                  color: 'var(--color-text)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTournament}
                className="btn"
                disabled={!newTournament.name.trim() || !newTournament.racerList.trim()}
              >
                Create Tournament
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Matchup Edit Modal */}
      {showMatchupModal && editingMatchup && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div className="card" style={{ width: '400px', padding: 'var(--space-4)' }}>
            <h2 style={{ marginBottom: 'var(--space-4)' }}>
              {getRoundName(editingMatchup.round)} - Matchup {editingMatchup.position + 1}
            </h2>
            
            {/* Racer 1 */}
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <div style={{ fontWeight: 600, marginBottom: 'var(--space-2)' }}>
                {editingMatchup.racer1?.name || 'TBD'}
                {editingMatchup.racer1?.dialIn && (
                  <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: '8px' }}>
                    (Dial: {editingMatchup.racer1.dialIn})
                  </span>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>RT</label>
                  <input
                    type="number"
                    step="0.001"
                    value={matchupForm.racer1RT}
                    onChange={(e) => setMatchupForm({ ...matchupForm, racer1RT: e.target.value })}
                    placeholder="0.000"
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>ET</label>
                  <input
                    type="number"
                    step="0.001"
                    value={matchupForm.racer1ET}
                    onChange={(e) => setMatchupForm({ ...matchupForm, racer1ET: e.target.value })}
                    placeholder="0.000"
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>
              </div>
            </div>
            
            <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', margin: 'var(--space-2) 0' }}>vs</div>
            
            {/* Racer 2 */}
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <div style={{ fontWeight: 600, marginBottom: 'var(--space-2)' }}>
                {editingMatchup.racer2?.name || 'BYE'}
                {editingMatchup.racer2?.dialIn && (
                  <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: '8px' }}>
                    (Dial: {editingMatchup.racer2.dialIn})
                  </span>
                )}
              </div>
              {editingMatchup.racer2 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>RT</label>
                    <input
                      type="number"
                      step="0.001"
                      value={matchupForm.racer2RT}
                      onChange={(e) => setMatchupForm({ ...matchupForm, racer2RT: e.target.value })}
                      placeholder="0.000"
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-surface)',
                        color: 'var(--color-text)',
                        fontFamily: 'monospace',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>ET</label>
                    <input
                      type="number"
                      step="0.001"
                      value={matchupForm.racer2ET}
                      onChange={(e) => setMatchupForm({ ...matchupForm, racer2ET: e.target.value })}
                      placeholder="0.000"
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-surface)',
                        color: 'var(--color-text)',
                        fontFamily: 'monospace',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Winner Selection */}
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem' }}>Winner</label>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button
                  onClick={() => setMatchupForm({ ...matchupForm, winner: 'racer1' })}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${matchupForm.winner === 'racer1' ? '#22c55e' : 'var(--color-border)'}`,
                    backgroundColor: matchupForm.winner === 'racer1' ? 'rgba(34, 197, 94, 0.1)' : 'var(--color-surface)',
                    color: 'var(--color-text)',
                    cursor: 'pointer',
                  }}
                >
                  {editingMatchup.racer1?.name}
                </button>
                {editingMatchup.racer2 && (
                  <button
                    onClick={() => setMatchupForm({ ...matchupForm, winner: 'racer2' })}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: 'var(--radius-md)',
                      border: `2px solid ${matchupForm.winner === 'racer2' ? '#22c55e' : 'var(--color-border)'}`,
                      backgroundColor: matchupForm.winner === 'racer2' ? 'rgba(34, 197, 94, 0.1)' : 'var(--color-surface)',
                      color: 'var(--color-text)',
                      cursor: 'pointer',
                    }}
                  >
                    {editingMatchup.racer2?.name}
                  </button>
                )}
              </div>
            </div>
            
            {/* Win Reason */}
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem' }}>Win Reason</label>
              <select
                value={matchupForm.winReason}
                onChange={(e) => setMatchupForm({ ...matchupForm, winReason: e.target.value as any })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text)',
                }}
              >
                <option value="">—</option>
                <option value="faster">Faster (Normal Win)</option>
                <option value="breakout">Opponent Breakout</option>
                <option value="redlight">Opponent Red Light</option>
                <option value="dq">Opponent DQ</option>
                <option value="bye">Bye Run</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <button
                onClick={() => { setShowMatchupModal(false); setEditingMatchup(null); }}
                style={{
                  padding: '10px 20px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'transparent',
                  color: 'var(--color-text)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMatchup}
                className="btn"
                disabled={!matchupForm.winner}
              >
                Save Result
              </button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
