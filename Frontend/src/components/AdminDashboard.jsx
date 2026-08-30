import React, { useState } from 'react';
import { LayoutDashboard, CalendarRange, BookOpen, BarChart3, ShieldCheck } from 'lucide-react';
import AdminContestManager from './AdminContestManager';
import AdminProblemManager from './AdminProblemManager';
import AdminStats from './AdminStats';
import AdminProctoringDashboard from './AdminProctoringDashboard';

export default function AdminDashboard() {
  const [activeSubTab, setActiveSubTab] = useState('contests'); // 'contests' | 'problems' | 'stats' | 'proctoring'

  return (
    <div className="main-content" style={{ display: 'flex', gap: '2rem', padding: '2rem 1rem' }}>
      {/* Admin Sidebar Navigation */}
      <div style={{ width: '260px', shrink: 0 }}>
        <div className="glass-card" style={{ padding: '1.25rem', height: 'fit-content' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
            <ShieldCheck size={20} style={{ color: 'var(--color-accent)' }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Admin Portal</h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button 
              onClick={() => setActiveSubTab('contests')}
              className={`btn ${activeSubTab === 'contests' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ justifyContent: 'flex-start', border: 'none', background: activeSubTab !== 'contests' ? 'transparent' : undefined }}
            >
              <CalendarRange size={16} /> Manage Contests
            </button>
            <button 
              onClick={() => setActiveSubTab('problems')}
              className={`btn ${activeSubTab === 'problems' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ justifyContent: 'flex-start', border: 'none', background: activeSubTab !== 'problems' ? 'transparent' : undefined }}
            >
              <BookOpen size={16} /> Problem Bank
            </button>
            <button 
              onClick={() => setActiveSubTab('stats')}
              className={`btn ${activeSubTab === 'stats' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ justifyContent: 'flex-start', border: 'none', background: activeSubTab !== 'stats' ? 'transparent' : undefined }}
            >
              <BarChart3 size={16} /> Live Statistics
            </button>
            <button 
              onClick={() => setActiveSubTab('proctoring')}
              className={`btn ${activeSubTab === 'proctoring' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ justifyContent: 'flex-start', border: 'none', background: activeSubTab !== 'proctoring' ? 'transparent' : undefined }}
            >
              <ShieldCheck size={16} /> Contest Proctoring
            </button>
          </div>
        </div>
      </div>

      {/* Main Admin Panels */}
      <div style={{ flex: 1 }}>
        {activeSubTab === 'contests' && <AdminContestManager />}
        {activeSubTab === 'problems' && <AdminProblemManager />}
        {activeSubTab === 'stats' && <AdminStats />}
        {activeSubTab === 'proctoring' && <AdminProctoringDashboard />}
      </div>
    </div>
  );
}
