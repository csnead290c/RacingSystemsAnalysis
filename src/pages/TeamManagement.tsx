/**
 * Team Management Page
 * 
 * Allows Team tier subscribers to manage their team members.
 * Features:
 * - View current team members
 * - Invite new members (up to seat limit)
 * - Remove members
 * - View shared vehicles and runs
 */

import { useState, useEffect } from 'react';
import Page from '../shared/components/Page';
import { useSubscription } from '../domain/config/useSubscription';
import { useAuth } from '../domain/auth';

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
  lastActive?: string;
}

function TeamManagement() {
  const { features, teamSeatLimit, tierInfo } = useSubscription();
  const { user } = useAuth();
  
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load team members on mount
  useEffect(() => {
    loadTeamMembers();
  }, []);

  const loadTeamMembers = async () => {
    setLoading(true);
    try {
      // TODO: Implement API call to fetch team members
      // For now, show the current user as the team owner
      const mockMembers: TeamMember[] = [
        {
          id: user?.id || '1',
          email: user?.email || 'owner@example.com',
          name: user?.email?.split('@')[0] || 'Team Owner',
          role: 'owner',
          joinedAt: new Date().toISOString(),
        },
      ];
      setMembers(mockMembers);
    } catch (err) {
      setError('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    
    setInviting(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Check seat limit
      if (members.length >= teamSeatLimit) {
        setError(`Team seat limit reached (${teamSeatLimit} seats). Contact support to add more seats.`);
        return;
      }
      
      // TODO: Implement API call to invite member
      // For now, show a placeholder message
      setSuccess(`Invitation sent to ${inviteEmail}. They will receive an email with instructions to join your team.`);
      setInviteEmail('');
      
      // In a real implementation, we would:
      // 1. Call API to create invitation
      // 2. Send email to invitee
      // 3. Add pending member to list
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;
    
    if (member.role === 'owner') {
      setError('Cannot remove the team owner');
      return;
    }
    
    if (!confirm(`Are you sure you want to remove ${member.name} from the team?`)) {
      return;
    }
    
    try {
      // TODO: Implement API call to remove member
      setMembers(prev => prev.filter(m => m.id !== memberId));
      setSuccess(`${member.name} has been removed from the team`);
    } catch (err) {
      setError('Failed to remove team member');
    }
  };

  // Check if user has team management access
  if (!features.teamManagement) {
    return (
      <Page title="Team Management">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
          <h2 style={{ marginBottom: '1rem', color: 'var(--color-text)' }}>Team Management</h2>
          <p style={{ color: 'var(--color-muted)', marginBottom: '1.5rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
            Manage your race team with shared vehicles, run history, and collaborative features.
          </p>
          <div style={{ 
            padding: '1rem', 
            backgroundColor: 'rgba(139, 92, 246, 0.1)', 
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            marginBottom: '1.5rem',
          }}>
            <div style={{ fontWeight: 600, color: '#8b5cf6', marginBottom: '0.5rem' }}>
              Team Plan Required
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-muted)' }}>
              Upgrade to the Team plan ($49.99/mo) to unlock team management features including:
            </div>
            <ul style={{ 
              textAlign: 'left', 
              fontSize: '0.875rem', 
              color: 'var(--color-text)', 
              marginTop: '0.75rem',
              paddingLeft: '1.5rem',
            }}>
              <li>Add up to 5 team members (more available)</li>
              <li>Share vehicles across your team</li>
              <li>Collaborative run history</li>
              <li>Team-wide weather and track data</li>
            </ul>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)' }}>
            Your current plan: <span style={{ color: tierInfo.color, fontWeight: 600 }}>{tierInfo.name}</span>
          </p>
        </div>
      </Page>
    );
  }

  return (
    <Page title="Team Management">
      {/* Team Overview */}
      <div className="card mb-6">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, color: 'var(--color-text)' }}>Your Team</h2>
          <span style={{ 
            padding: '0.25rem 0.75rem', 
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            color: '#8b5cf6',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}>
            {members.length} / {teamSeatLimit} seats
          </span>
        </div>
        
        {error && (
          <div className="error mb-4" style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
            {error}
          </div>
        )}
        
        {success && (
          <div style={{ 
            padding: '0.75rem', 
            backgroundColor: 'rgba(34, 197, 94, 0.1)', 
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: 'var(--radius-sm)',
            color: '#22c55e',
            marginBottom: '1rem',
          }}>
            {success}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-muted)' }}>
            Loading team members...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {members.map(member => (
              <div 
                key={member.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  backgroundColor: 'var(--color-surface)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: member.role === 'owner' ? '#8b5cf6' : '#3b82f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                  }}>
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>
                      {member.name}
                      {member.role === 'owner' && (
                        <span style={{ 
                          marginLeft: '0.5rem', 
                          fontSize: '0.7rem', 
                          padding: '0.125rem 0.375rem',
                          backgroundColor: 'rgba(139, 92, 246, 0.2)',
                          color: '#8b5cf6',
                          borderRadius: '4px',
                        }}>
                          Owner
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                      {member.email}
                    </div>
                  </div>
                </div>
                {member.role !== 'owner' && (
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    style={{
                      padding: '0.375rem 0.75rem',
                      fontSize: '0.8rem',
                      backgroundColor: 'transparent',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#ef4444',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite New Member */}
      <div className="card mb-6">
        <h3 style={{ marginBottom: '1rem', color: 'var(--color-text)' }}>Invite Team Member</h3>
        <form onSubmit={handleInvite} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="teammate@email.com"
            className="input"
            style={{ flex: '1 1 250px', minWidth: '200px' }}
            disabled={members.length >= teamSeatLimit}
          />
          <button
            type="submit"
            className="btn"
            disabled={inviting || !inviteEmail.trim() || members.length >= teamSeatLimit}
          >
            {inviting ? 'Sending...' : 'Send Invite'}
          </button>
        </form>
        {members.length >= teamSeatLimit && (
          <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--color-muted)' }}>
            You've reached your seat limit. Contact support to add more seats to your team.
          </p>
        )}
      </div>

      {/* Shared Resources */}
      <div className="card">
        <h3 style={{ marginBottom: '1rem', color: 'var(--color-text)' }}>Shared Resources</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{
            padding: '1rem',
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🚗</div>
            <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>Shared Vehicles</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-muted)' }}>
              {features.sharedVehicles ? 'Coming soon' : 'Not available'}
            </div>
          </div>
          <div style={{
            padding: '1rem',
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📊</div>
            <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>Shared Runs</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-muted)' }}>
              {features.sharedRuns ? 'Coming soon' : 'Not available'}
            </div>
          </div>
          <div style={{
            padding: '1rem',
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🌤️</div>
            <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>Team Weather</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-muted)' }}>
              Coming soon
            </div>
          </div>
        </div>
        <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--color-muted)', fontStyle: 'italic' }}>
          Team sharing features are coming soon. Your team members will be able to access shared vehicles and run history.
        </p>
      </div>
    </Page>
  );
}

export default TeamManagement;
